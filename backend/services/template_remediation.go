package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"qr-studio/backend/database"
)

// TemplateSummary is the lightweight contract used by the design library.
type TemplateSummary struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	SettingsJSON  string    `json:"settingsJson"`
	HasLogo       bool      `json:"hasLogo"`
	HasBackground bool      `json:"hasBackground"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// TemplateImportResult reports every import outcome instead of silently
// swallowing malformed or failed records.
type TemplateImportResult struct {
	Total    int             `json:"total"`
	Imported int             `json:"imported"`
	Skipped  int             `json:"skipped"`
	Failed   []TemplateError `json:"failed"`
}

type TemplateError struct {
	Index  int    `json:"index"`
	Name   string `json:"name,omitempty"`
	Reason string `json:"reason"`
}

func (s *TemplateService) ListTemplateSummaries() ([]TemplateSummary, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	rows, err := s.db.GetDB().Query(`
		SELECT id, name, settings_json,
		       logo_data IS NOT NULL AND length(logo_data) > 0,
		       background_data IS NOT NULL AND length(background_data) > 0,
		       created_at, updated_at
		FROM templates
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("failed to list templates: %w", err)
	}
	defer rows.Close()

	result := make([]TemplateSummary, 0)
	for rows.Next() {
		var item TemplateSummary
		if err := rows.Scan(&item.ID, &item.Name, &item.SettingsJSON, &item.HasLogo, &item.HasBackground, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan template summary: %w", err)
		}
		result = append(result, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate templates: %w", err)
	}
	return result, nil
}

func validateTemplateInput(name, settingsJSON string) error {
	if strings.TrimSpace(name) == "" {
		return fmt.Errorf("template name is required")
	}
	if len(name) > 120 {
		return fmt.Errorf("template name exceeds 120 characters")
	}
	if len(settingsJSON) == 0 || len(settingsJSON) > 2*1024*1024 {
		return fmt.Errorf("template settings must be between 1 byte and 2 MB")
	}
	var decoded map[string]any
	if err := json.Unmarshal([]byte(settingsJSON), &decoded); err != nil {
		return fmt.Errorf("template settings are invalid JSON: %w", err)
	}
	return nil
}

// SaveTemplatePreservingImages updates a template without clearing image BLOBs
// unless the caller explicitly requests replacement/removal.
func (s *TemplateService) SaveTemplatePreservingImages(template database.Template, preserveLogo, preserveBackground bool) (*database.Template, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	if err := validateTemplateInput(template.Name, template.SettingsJSON); err != nil {
		return nil, err
	}

	existing, err := s.GetTemplate(template.ID)
	if err != nil && !strings.Contains(err.Error(), "template not found") {
		return nil, err
	}
	if existing != nil {
		if preserveLogo {
			template.LogoData = existing.LogoData
		}
		if preserveBackground {
			template.BackgroundData = existing.BackgroundData
		}
		template.CreatedAt = existing.CreatedAt
	}
	return s.SaveTemplate(template)
}

func (s *TemplateService) RenameTemplate(id, name string) error {
	if s.db == nil {
		return fmt.Errorf("database not initialized")
	}
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 120 {
		return fmt.Errorf("template name must be between 1 and 120 characters")
	}
	result, err := s.db.GetDB().Exec("UPDATE templates SET name = ?, updated_at = ? WHERE id = ?", name, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to rename template: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to inspect rename result: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("template not found: %s", id)
	}
	return nil
}

func (s *TemplateService) DuplicateTemplate(sourceID, newID, newName string) (*database.Template, error) {
	source, err := s.GetTemplate(sourceID)
	if err != nil {
		return nil, err
	}
	copy := *source
	copy.ID = newID
	copy.Name = newName
	copy.CreatedAt = time.Time{}
	copy.UpdatedAt = time.Time{}
	return s.SaveTemplate(copy)
}

// ImportTemplatesTransactional validates all records and writes valid templates
// in one transaction. Existing IDs are reported as skipped.
func (s *TemplateService) ImportTemplatesTransactional(templates []database.Template) (TemplateImportResult, error) {
	result := TemplateImportResult{Total: len(templates), Failed: []TemplateError{}}
	if s.db == nil {
		return result, fmt.Errorf("database not initialized")
	}

	tx, err := s.db.GetDB().Begin()
	if err != nil {
		return result, fmt.Errorf("failed to begin import: %w", err)
	}
	defer tx.Rollback()

	for index, template := range templates {
		if template.ID == "" {
			template.ID = database.NewTemplate(template.Name, template.SettingsJSON).ID
		}
		if err := validateTemplateInput(template.Name, template.SettingsJSON); err != nil {
			result.Failed = append(result.Failed, TemplateError{Index: index, Name: template.Name, Reason: err.Error()})
			continue
		}
		var exists int
		if err := tx.QueryRow("SELECT COUNT(*) FROM templates WHERE id = ?", template.ID).Scan(&exists); err != nil {
			return result, fmt.Errorf("failed to check duplicate template: %w", err)
		}
		if exists > 0 {
			result.Skipped++
			continue
		}
		now := time.Now()
		if template.CreatedAt.IsZero() {
			template.CreatedAt = now
		}
		template.UpdatedAt = now
		_, err := tx.Exec(`INSERT INTO templates
			(id, name, settings_json, logo_data, background_data, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			template.ID, template.Name, template.SettingsJSON, nullableBytes(template.LogoData), nullableBytes(template.BackgroundData), template.CreatedAt, template.UpdatedAt)
		if err != nil {
			result.Failed = append(result.Failed, TemplateError{Index: index, Name: template.Name, Reason: err.Error()})
			continue
		}
		result.Imported++
	}

	if err := tx.Commit(); err != nil {
		return result, fmt.Errorf("failed to commit import: %w", err)
	}
	return result, nil
}

func nullableBytes(value []byte) any {
	if len(value) == 0 {
		return nil
	}
	return value
}
