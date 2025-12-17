/*
================================================================================
QR STUDIO - TEMPLATE SERVICE
================================================================================

File: backend/services/templates.go
Description: Service layer for QR template management. Provides CRUD operations
             for templates stored in SQLite, including import/export functionality.

Responsibilities:
  - Create, read, update, delete templates
  - Import templates from JSON
  - Export templates to JSON
  - Handle binary image data (logo, background)

Methods (Bound to Frontend):
  - GetAllTemplates() - List all templates
  - GetTemplate(id) - Get single template by ID
  - SaveTemplate(template) - Create or update template
  - DeleteTemplate(id) - Remove template
  - ImportTemplates(json) - Bulk import
  - ExportTemplates() - Bulk export

Error Handling:
  - All methods return errors that are converted to frontend-friendly messages
  - Database errors are logged and wrapped with context

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"qr-studio/backend/database"
)

// TemplateService provides CRUD operations for QR templates.
// It uses the database connection provided during initialization.
//
// Fields:
//   - db: Database connection wrapper
type TemplateService struct {
	// db is the database connection wrapper.
	// Provides access to the SQLite connection.
	db *database.Database
}

// NewTemplateService creates a new TemplateService instance.
//
// Parameters:
//   - db: Database connection wrapper
//
// Returns:
//   - *TemplateService: Initialized service ready for use
func NewTemplateService(db *database.Database) *TemplateService {
	return &TemplateService{db: db}
}

// GetAllTemplates retrieves all templates from the database.
// Templates are returned without binary data (logo, background) for efficiency.
// Use GetTemplate(id) to fetch full template data.
//
// Returns:
//   - []database.TemplateListItem: List of templates (without binary data)
//   - error: Database error if query fails
func (s *TemplateService) GetAllTemplates() ([]database.TemplateListItem, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT 
			id, 
			name, 
			logo_data IS NOT NULL as has_logo,
			background_data IS NOT NULL as has_background,
			created_at, 
			updated_at 
		FROM templates 
		ORDER BY updated_at DESC
	`

	rows, err := s.db.GetDB().Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query templates: %w", err)
	}
	defer rows.Close()

	var templates []database.TemplateListItem
	for rows.Next() {
		var t database.TemplateListItem
		err := rows.Scan(
			&t.ID,
			&t.Name,
			&t.HasLogo,
			&t.HasBackground,
			&t.CreatedAt,
			&t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan template row: %w", err)
		}
		templates = append(templates, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating template rows: %w", err)
	}

	return templates, nil
}

// GetAllTemplatesWithSettings retrieves all templates with their settings JSON.
// Returns templates without binary data (logo, background) but with settingsJson.
// Use this when the frontend needs to render template previews.
//
// Returns:
//   - []database.Template: List of templates with settings (but no binary data)
//   - error: Database error if query fails
func (s *TemplateService) GetAllTemplatesWithSettings() ([]database.Template, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT 
			id, 
			name, 
			settings_json,
			created_at, 
			updated_at 
		FROM templates 
		ORDER BY updated_at DESC
	`

	rows, err := s.db.GetDB().Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query templates: %w", err)
	}
	defer rows.Close()

	var templates []database.Template
	for rows.Next() {
		var t database.Template
		err := rows.Scan(
			&t.ID,
			&t.Name,
			&t.SettingsJSON,
			&t.CreatedAt,
			&t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan template row: %w", err)
		}
		templates = append(templates, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating template rows: %w", err)
	}

	return templates, nil
}

// GetTemplate retrieves a single template by ID with full data.
// Includes binary data (logo, background) for complete template restoration.
//
// Parameters:
//   - id: Template ID to retrieve
//
// Returns:
//   - *database.Template: Full template data
//   - error: Not found error or database error
func (s *TemplateService) GetTemplate(id string) (*database.Template, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, name, settings_json, logo_data, background_data, created_at, updated_at
		FROM templates
		WHERE id = ?
	`

	var t database.Template
	err := s.db.GetDB().QueryRow(query, id).Scan(
		&t.ID,
		&t.Name,
		&t.SettingsJSON,
		&t.LogoData,
		&t.BackgroundData,
		&t.CreatedAt,
		&t.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("template not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

	return &t, nil
}

// SaveTemplate creates a new template or updates an existing one.
// If template.ID exists in database, it's updated; otherwise created.
//
// Parameters:
//   - template: Template data to save
//
// Returns:
//   - *database.Template: Saved template with updated timestamps
//   - error: Validation or database error
func (s *TemplateService) SaveTemplate(template database.Template) (*database.Template, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	// Validate required fields
	if template.Name == "" {
		return nil, fmt.Errorf("template name is required")
	}
	if template.SettingsJSON == "" {
		return nil, fmt.Errorf("template settings are required")
	}

	// Check if template exists
	exists, err := s.templateExists(template.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to check template existence: %w", err)
	}

	now := time.Now()
	template.UpdatedAt = now

	if exists {
		// Update existing template
		err = s.updateTemplate(&template)
	} else {
		// Create new template
		if template.ID == "" {
			template.ID = database.NewTemplate(template.Name, template.SettingsJSON).ID
		}
		template.CreatedAt = now
		err = s.insertTemplate(&template)
	}

	if err != nil {
		return nil, err
	}

	return &template, nil
}

// templateExists checks if a template with the given ID exists.
//
// Parameters:
//   - id: Template ID to check
//
// Returns:
//   - bool: True if template exists
//   - error: Database error if query fails
func (s *TemplateService) templateExists(id string) (bool, error) {
	if id == "" {
		return false, nil
	}

	var count int
	err := s.db.GetDB().QueryRow("SELECT COUNT(*) FROM templates WHERE id = ?", id).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// insertTemplate creates a new template in the database.
//
// Parameters:
//   - t: Template to insert
//
// Returns:
//   - error: Database error if insert fails
func (s *TemplateService) insertTemplate(t *database.Template) error {
	query := `
		INSERT INTO templates (id, name, settings_json, logo_data, background_data, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := s.db.GetDB().Exec(query,
		t.ID,
		t.Name,
		t.SettingsJSON,
		t.LogoData,
		t.BackgroundData,
		t.CreatedAt,
		t.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert template: %w", err)
	}
	return nil
}

// updateTemplate updates an existing template in the database.
//
// Parameters:
//   - t: Template to update
//
// Returns:
//   - error: Database error if update fails
func (s *TemplateService) updateTemplate(t *database.Template) error {
	query := `
		UPDATE templates 
		SET name = ?, settings_json = ?, logo_data = ?, background_data = ?, updated_at = ?
		WHERE id = ?
	`
	_, err := s.db.GetDB().Exec(query,
		t.Name,
		t.SettingsJSON,
		t.LogoData,
		t.BackgroundData,
		t.UpdatedAt,
		t.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}
	return nil
}

// DeleteTemplate removes a template from the database.
//
// Parameters:
//   - id: Template ID to delete
//
// Returns:
//   - error: Not found error or database error
func (s *TemplateService) DeleteTemplate(id string) error {
	if s.db == nil {
		return fmt.Errorf("database not initialized")
	}

	result, err := s.db.GetDB().Exec("DELETE FROM templates WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("template not found: %s", id)
	}

	return nil
}

// ImportTemplates imports templates from a JSON string.
// Existing templates with the same ID are skipped.
//
// Parameters:
//   - jsonData: JSON string containing array of templates
//
// Returns:
//   - int: Number of templates successfully imported
//   - error: Parse or database error
func (s *TemplateService) ImportTemplates(jsonData string) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	var templates []database.Template
	if err := json.Unmarshal([]byte(jsonData), &templates); err != nil {
		return 0, fmt.Errorf("failed to parse templates JSON: %w", err)
	}

	imported := 0
	for _, t := range templates {
		// Skip if already exists
		exists, err := s.templateExists(t.ID)
		if err != nil {
			continue
		}
		if exists {
			continue
		}

		// Ensure timestamps are set
		if t.CreatedAt.IsZero() {
			t.CreatedAt = time.Now()
		}
		t.UpdatedAt = time.Now()

		if err := s.insertTemplate(&t); err != nil {
			continue
		}
		imported++
	}

	return imported, nil
}

// ExportTemplates exports all templates to a JSON string.
// Returns full template data including settings (but not binary data).
//
// Returns:
//   - string: JSON string containing array of templates
//   - error: Database or serialization error
func (s *TemplateService) ExportTemplates() (string, error) {
	if s.db == nil {
		return "", fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, name, settings_json, created_at, updated_at
		FROM templates
		ORDER BY created_at DESC
	`

	rows, err := s.db.GetDB().Query(query)
	if err != nil {
		return "", fmt.Errorf("failed to query templates: %w", err)
	}
	defer rows.Close()

	var templates []database.Template
	for rows.Next() {
		var t database.Template
		err := rows.Scan(&t.ID, &t.Name, &t.SettingsJSON, &t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			return "", fmt.Errorf("failed to scan template: %w", err)
		}
		templates = append(templates, t)
	}

	jsonData, err := json.MarshalIndent(templates, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to serialize templates: %w", err)
	}

	return string(jsonData), nil
}

// GetTemplateCount returns the total number of saved templates.
// Useful for statistics and UI display.
//
// Returns:
//   - int: Number of templates in database
//   - error: Database error if query fails
func (s *TemplateService) GetTemplateCount() (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	var count int
	err := s.db.GetDB().QueryRow("SELECT COUNT(*) FROM templates").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count templates: %w", err)
	}

	return count, nil
}
