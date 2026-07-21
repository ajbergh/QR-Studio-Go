package services

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"
)

// AddRedactedHistoryEntry stores only a user-facing label and filename. It uses
// NULL for the optional template foreign key, avoiding invalid empty-string
// references when foreign-key enforcement is enabled.
func (s *HistoryService) AddRedactedHistoryEntry(label, dataType, exportFormat, path string) error {
	if s.db == nil {
		return fmt.Errorf("database not initialized")
	}
	label = truncateHistoryValue(label, 120)
	dataType = truncateHistoryValue(dataType, 32)
	exportFormat = truncateHistoryValue(strings.ToLower(exportFormat), 16)
	filename := filepath.Base(path)
	_, err := s.db.GetDB().Exec(`
		INSERT INTO history (template_id, data_type, data_content, exported_path, export_format, created_at)
		VALUES (NULL, ?, ?, ?, ?, ?)`, dataType, label, filename, exportFormat, time.Now())
	if err != nil {
		return fmt.Errorf("failed to add redacted history entry: %w", err)
	}
	return nil
}

func truncateHistoryValue(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) > max {
		return value[:max]
	}
	return value
}
