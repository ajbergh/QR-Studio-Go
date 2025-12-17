/*
================================================================================
QR STUDIO - HISTORY SERVICE
================================================================================

File: backend/services/history.go
Description: Service layer for QR code generation history tracking.
             Records generated QR codes for analytics and easy regeneration.

Responsibilities:
  - Record QR code generation events
  - Query generation history
  - Clean up old history entries
  - Provide analytics data

Methods (Bound to Frontend):
  - AddHistoryEntry(entry) - Record a generation event
  - GetHistory(limit) - Get recent history entries
  - GetHistoryByTemplate(templateId) - Get history for a template
  - ClearHistory() - Remove all history
  - GetHistoryStats() - Get analytics data

Privacy Considerations:
  - Data content may contain sensitive information
  - Consider adding option to disable history
  - Consider hashing or truncating data content

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

package services

import (
	"fmt"
	"time"

	"qr-studio/backend/database"
)

// HistoryService provides operations for generation history tracking.
// It uses the database connection provided during initialization.
//
// Fields:
//   - db: Database connection wrapper
type HistoryService struct {
	// db is the database connection wrapper.
	db *database.Database
}

// HistoryStats represents aggregate statistics about generation history.
//
// Fields:
//   - TotalGenerated: Total QR codes generated
//   - ByDataType: Count by data type (url, wifi, vcard, etc.)
//   - ByExportFormat: Count by export format (png, svg, jpeg)
//   - RecentCount: Number generated in last 7 days
type HistoryStats struct {
	TotalGenerated int            `json:"totalGenerated"`
	ByDataType     map[string]int `json:"byDataType"`
	ByExportFormat map[string]int `json:"byExportFormat"`
	RecentCount    int            `json:"recentCount"`
}

// NewHistoryService creates a new HistoryService instance.
//
// Parameters:
//   - db: Database connection wrapper
//
// Returns:
//   - *HistoryService: Initialized service ready for use
func NewHistoryService(db *database.Database) *HistoryService {
	return &HistoryService{db: db}
}

// AddHistoryEntry records a QR code generation event.
// Call this after successfully generating/exporting a QR code.
//
// Parameters:
//   - entry: History entry data
//
// Returns:
//   - *database.HistoryEntry: Created entry with ID
//   - error: Database error if insert fails
func (s *HistoryService) AddHistoryEntry(entry database.HistoryEntry) (*database.HistoryEntry, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	// Set creation timestamp
	entry.CreatedAt = time.Now()

	query := `
		INSERT INTO history (template_id, data_type, data_content, exported_path, export_format, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	result, err := s.db.GetDB().Exec(query,
		entry.TemplateID,
		entry.DataType,
		entry.DataContent,
		entry.ExportedPath,
		entry.ExportFormat,
		entry.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to add history entry: %w", err)
	}

	// Get the auto-generated ID
	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get last insert ID: %w", err)
	}
	entry.ID = id

	return &entry, nil
}

// GetHistory retrieves recent history entries.
// Results are ordered by creation date, newest first.
//
// Parameters:
//   - limit: Maximum number of entries to return (0 for all)
//
// Returns:
//   - []database.HistoryEntry: History entries
//   - error: Database error if query fails
func (s *HistoryService) GetHistory(limit int) ([]database.HistoryEntry, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, template_id, data_type, data_content, exported_path, export_format, created_at
		FROM history
		ORDER BY created_at DESC
	`

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := s.db.GetDB().Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query history: %w", err)
	}
	defer rows.Close()

	var entries []database.HistoryEntry
	for rows.Next() {
		var e database.HistoryEntry
		err := rows.Scan(
			&e.ID,
			&e.TemplateID,
			&e.DataType,
			&e.DataContent,
			&e.ExportedPath,
			&e.ExportFormat,
			&e.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan history row: %w", err)
		}
		entries = append(entries, e)
	}

	return entries, nil
}

// GetHistoryByTemplate retrieves history entries for a specific template.
//
// Parameters:
//   - templateId: Template ID to filter by
//   - limit: Maximum number of entries (0 for all)
//
// Returns:
//   - []database.HistoryEntry: Filtered history entries
//   - error: Database error if query fails
func (s *HistoryService) GetHistoryByTemplate(templateId string, limit int) ([]database.HistoryEntry, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, template_id, data_type, data_content, exported_path, export_format, created_at
		FROM history
		WHERE template_id = ?
		ORDER BY created_at DESC
	`

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := s.db.GetDB().Query(query, templateId)
	if err != nil {
		return nil, fmt.Errorf("failed to query history: %w", err)
	}
	defer rows.Close()

	var entries []database.HistoryEntry
	for rows.Next() {
		var e database.HistoryEntry
		err := rows.Scan(
			&e.ID,
			&e.TemplateID,
			&e.DataType,
			&e.DataContent,
			&e.ExportedPath,
			&e.ExportFormat,
			&e.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan history row: %w", err)
		}
		entries = append(entries, e)
	}

	return entries, nil
}

// GetHistoryByDataType retrieves history entries for a specific data type.
//
// Parameters:
//   - dataType: Data type to filter by (url, wifi, vcard, etc.)
//   - limit: Maximum number of entries (0 for all)
//
// Returns:
//   - []database.HistoryEntry: Filtered history entries
//   - error: Database error if query fails
func (s *HistoryService) GetHistoryByDataType(dataType string, limit int) ([]database.HistoryEntry, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT id, template_id, data_type, data_content, exported_path, export_format, created_at
		FROM history
		WHERE data_type = ?
		ORDER BY created_at DESC
	`

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := s.db.GetDB().Query(query, dataType)
	if err != nil {
		return nil, fmt.Errorf("failed to query history: %w", err)
	}
	defer rows.Close()

	var entries []database.HistoryEntry
	for rows.Next() {
		var e database.HistoryEntry
		err := rows.Scan(
			&e.ID,
			&e.TemplateID,
			&e.DataType,
			&e.DataContent,
			&e.ExportedPath,
			&e.ExportFormat,
			&e.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan history row: %w", err)
		}
		entries = append(entries, e)
	}

	return entries, nil
}

// ClearHistory removes all history entries.
// This action cannot be undone.
//
// Returns:
//   - int: Number of entries deleted
//   - error: Database error if delete fails
func (s *HistoryService) ClearHistory() (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	result, err := s.db.GetDB().Exec("DELETE FROM history")
	if err != nil {
		return 0, fmt.Errorf("failed to clear history: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	return int(rowsAffected), nil
}

// DeleteHistoryEntry removes a single history entry.
//
// Parameters:
//   - id: Entry ID to delete
//
// Returns:
//   - error: Error if entry not found or delete fails
func (s *HistoryService) DeleteHistoryEntry(id int64) error {
	if s.db == nil {
		return fmt.Errorf("database not initialized")
	}

	result, err := s.db.GetDB().Exec("DELETE FROM history WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete history entry: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("history entry not found: %d", id)
	}

	return nil
}

// CleanupOldHistory removes history entries older than the specified days.
// Useful for keeping the database size manageable.
//
// Parameters:
//   - daysOld: Remove entries older than this many days
//
// Returns:
//   - int: Number of entries deleted
//   - error: Database error if delete fails
func (s *HistoryService) CleanupOldHistory(daysOld int) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	cutoffDate := time.Now().AddDate(0, 0, -daysOld)
	result, err := s.db.GetDB().Exec(
		"DELETE FROM history WHERE created_at < ?",
		cutoffDate,
	)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup old history: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	return int(rowsAffected), nil
}

// GetHistoryStats returns aggregate statistics about generation history.
// Useful for analytics and user insights.
//
// Returns:
//   - *HistoryStats: Aggregate statistics
//   - error: Database error if query fails
func (s *HistoryService) GetHistoryStats() (*HistoryStats, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	stats := &HistoryStats{
		ByDataType:     make(map[string]int),
		ByExportFormat: make(map[string]int),
	}

	// Total count
	err := s.db.GetDB().QueryRow("SELECT COUNT(*) FROM history").Scan(&stats.TotalGenerated)
	if err != nil {
		return nil, fmt.Errorf("failed to count history: %w", err)
	}

	// Count by data type
	rows, err := s.db.GetDB().Query("SELECT data_type, COUNT(*) FROM history GROUP BY data_type")
	if err != nil {
		return nil, fmt.Errorf("failed to query by data type: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var dataType string
		var count int
		if err := rows.Scan(&dataType, &count); err != nil {
			continue
		}
		stats.ByDataType[dataType] = count
	}

	// Count by export format
	rows2, err := s.db.GetDB().Query("SELECT export_format, COUNT(*) FROM history GROUP BY export_format")
	if err != nil {
		return nil, fmt.Errorf("failed to query by export format: %w", err)
	}
	defer rows2.Close()

	for rows2.Next() {
		var format string
		var count int
		if err := rows2.Scan(&format, &count); err != nil {
			continue
		}
		stats.ByExportFormat[format] = count
	}

	// Recent count (last 7 days)
	weekAgo := time.Now().AddDate(0, 0, -7)
	err = s.db.GetDB().QueryRow(
		"SELECT COUNT(*) FROM history WHERE created_at >= ?",
		weekAgo,
	).Scan(&stats.RecentCount)
	if err != nil {
		stats.RecentCount = 0
	}

	return stats, nil
}

// GetHistoryCount returns the total number of history entries.
//
// Returns:
//   - int: Number of history entries
//   - error: Database error if query fails
func (s *HistoryService) GetHistoryCount() (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	var count int
	err := s.db.GetDB().QueryRow("SELECT COUNT(*) FROM history").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count history: %w", err)
	}

	return count, nil
}
