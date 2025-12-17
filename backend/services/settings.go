/*
================================================================================
QR STUDIO - SETTINGS SERVICE
================================================================================

File: backend/services/settings.go
Description: Service layer for user settings and application configuration.
             Provides get/set operations for key-value settings stored in SQLite.

Responsibilities:
  - Read and write user preferences
  - Provide default values for missing settings
  - Handle type conversion for common setting types
  - Cache frequently accessed settings (future)

Common Settings:
  - theme: UI theme preference (light/dark/system)
  - default_export_format: Default export format (png/svg/jpeg)
  - default_qr_size: Default QR code dimensions
  - show_history: Whether to track generation history
  - auto_save_templates: Auto-save templates on change
  - window_width/height: Window dimensions (desktop only)
  - window_x/y: Window position (desktop only)

Methods (Bound to Frontend):
  - GetSetting(key) - Get single setting value
  - SetSetting(key, value) - Set single setting
  - GetAllSettings() - Get all settings as map
  - GetSettingBool(key) - Get setting as boolean
  - GetSettingInt(key) - Get setting as integer

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

package services

import (
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"qr-studio/backend/database"
)

// SettingsService provides operations for user settings management.
// It uses the database connection provided during initialization.
//
// Fields:
//   - db: Database connection wrapper
type SettingsService struct {
	// db is the database connection wrapper.
	db *database.Database
}

// defaultSettings defines default values for all settings.
// These are used when a setting doesn't exist in the database.
var defaultSettings = map[string]string{
	"theme":                 "system",
	"default_export_format": "png",
	"default_qr_size":       "1000",
	"show_history":          "true",
	"auto_save_templates":   "false",
	"window_width":          "1280",
	"window_height":         "800",
	"window_x":              "",
	"window_y":              "",
	"last_export_path":      "",
	"recent_templates":      "[]",
}

// NewSettingsService creates a new SettingsService instance.
//
// Parameters:
//   - db: Database connection wrapper
//
// Returns:
//   - *SettingsService: Initialized service ready for use
func NewSettingsService(db *database.Database) *SettingsService {
	return &SettingsService{db: db}
}

// GetSetting retrieves a single setting value by key.
// Returns the default value if the setting doesn't exist.
//
// Parameters:
//   - key: Setting key to retrieve
//
// Returns:
//   - string: Setting value (or default)
//   - error: Database error if query fails
func (s *SettingsService) GetSetting(key string) (string, error) {
	if s.db == nil {
		return s.getDefault(key), fmt.Errorf("database not initialized")
	}

	var value string
	err := s.db.GetDB().QueryRow(
		"SELECT value FROM settings WHERE key = ?",
		key,
	).Scan(&value)

	if err == sql.ErrNoRows {
		return s.getDefault(key), nil
	}
	if err != nil {
		return s.getDefault(key), fmt.Errorf("failed to get setting: %w", err)
	}

	return value, nil
}

// SetSetting saves a setting value.
// Creates the setting if it doesn't exist, updates if it does.
//
// Parameters:
//   - key: Setting key
//   - value: Setting value
//
// Returns:
//   - error: Database error if save fails
func (s *SettingsService) SetSetting(key, value string) error {
	if s.db == nil {
		return fmt.Errorf("database not initialized")
	}

	query := `
		INSERT INTO settings (key, value, updated_at) 
		VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
	`
	now := time.Now()
	_, err := s.db.GetDB().Exec(query, key, value, now, value, now)
	if err != nil {
		return fmt.Errorf("failed to set setting: %w", err)
	}

	return nil
}

// GetAllSettings retrieves all settings as a key-value map.
// Includes default values for any missing settings.
//
// Returns:
//   - map[string]string: All settings
//   - error: Database error if query fails
func (s *SettingsService) GetAllSettings() (map[string]string, error) {
	// Start with defaults
	settings := make(map[string]string)
	for k, v := range defaultSettings {
		settings[k] = v
	}

	if s.db == nil {
		return settings, fmt.Errorf("database not initialized")
	}

	rows, err := s.db.GetDB().Query("SELECT key, value FROM settings")
	if err != nil {
		return settings, fmt.Errorf("failed to query settings: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		settings[key] = value
	}

	return settings, nil
}

// GetSettingBool retrieves a setting as a boolean.
// Returns false for any value other than "true", "1", "yes".
//
// Parameters:
//   - key: Setting key
//
// Returns:
//   - bool: Parsed boolean value
//   - error: Database error if query fails
func (s *SettingsService) GetSettingBool(key string) (bool, error) {
	value, err := s.GetSetting(key)
	if err != nil {
		return false, err
	}

	return value == "true" || value == "1" || value == "yes", nil
}

// SetSettingBool saves a boolean setting.
// Stores as "true" or "false" string.
//
// Parameters:
//   - key: Setting key
//   - value: Boolean value
//
// Returns:
//   - error: Database error if save fails
func (s *SettingsService) SetSettingBool(key string, value bool) error {
	strValue := "false"
	if value {
		strValue = "true"
	}
	return s.SetSetting(key, strValue)
}

// GetSettingInt retrieves a setting as an integer.
// Returns 0 if the value cannot be parsed.
//
// Parameters:
//   - key: Setting key
//
// Returns:
//   - int: Parsed integer value
//   - error: Database or parse error
func (s *SettingsService) GetSettingInt(key string) (int, error) {
	value, err := s.GetSetting(key)
	if err != nil {
		return 0, err
	}

	intValue, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("failed to parse setting as int: %w", err)
	}

	return intValue, nil
}

// SetSettingInt saves an integer setting.
// Stores as string representation.
//
// Parameters:
//   - key: Setting key
//   - value: Integer value
//
// Returns:
//   - error: Database error if save fails
func (s *SettingsService) SetSettingInt(key string, value int) error {
	return s.SetSetting(key, strconv.Itoa(value))
}

// DeleteSetting removes a setting from the database.
// The setting will revert to its default value on next read.
//
// Parameters:
//   - key: Setting key to delete
//
// Returns:
//   - error: Database error if delete fails
func (s *SettingsService) DeleteSetting(key string) error {
	if s.db == nil {
		return fmt.Errorf("database not initialized")
	}

	_, err := s.db.GetDB().Exec("DELETE FROM settings WHERE key = ?", key)
	if err != nil {
		return fmt.Errorf("failed to delete setting: %w", err)
	}

	return nil
}

// ResetToDefaults removes all settings, reverting to defaults.
// Use with caution - this cannot be undone.
//
// Returns:
//   - error: Database error if delete fails
func (s *SettingsService) ResetToDefaults() error {
	if s.db == nil {
		return fmt.Errorf("database not initialized")
	}

	_, err := s.db.GetDB().Exec("DELETE FROM settings")
	if err != nil {
		return fmt.Errorf("failed to reset settings: %w", err)
	}

	return nil
}

// getDefault returns the default value for a setting key.
// Returns empty string if no default is defined.
//
// Parameters:
//   - key: Setting key
//
// Returns:
//   - string: Default value or empty string
func (s *SettingsService) getDefault(key string) string {
	if val, ok := defaultSettings[key]; ok {
		return val
	}
	return ""
}

// HasSetting checks if a setting exists in the database.
// Useful for detecting first-run or migration scenarios.
//
// Parameters:
//   - key: Setting key to check
//
// Returns:
//   - bool: True if setting exists
//   - error: Database error if query fails
func (s *SettingsService) HasSetting(key string) (bool, error) {
	if s.db == nil {
		return false, fmt.Errorf("database not initialized")
	}

	var count int
	err := s.db.GetDB().QueryRow(
		"SELECT COUNT(*) FROM settings WHERE key = ?",
		key,
	).Scan(&count)

	if err != nil {
		return false, fmt.Errorf("failed to check setting: %w", err)
	}

	return count > 0, nil
}
