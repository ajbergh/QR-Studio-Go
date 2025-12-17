/*
================================================================================
QR STUDIO - DATABASE MODELS
================================================================================

File: backend/database/models.go
Description: Data models for the QR Studio application. These structs map
             directly to database tables and are used for serialization
             between Go and the React frontend via Wails.

Models:
  - Template: QR code template with styling settings
  - Setting: Key-value configuration pair
  - HistoryEntry: Record of generated QR codes

Serialization:
  - All models use json tags for Wails/frontend serialization
  - db tags are used for database column mapping
  - Optional fields use pointers for null handling

TypeScript Mapping:
  These models correspond to TypeScript interfaces in types.ts.
  The Template.SettingsJSON field contains a serialized QRSettings object.

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

package database

import (
	"time"
)

// Template represents a saved QR code template with all styling settings.
// This is the primary entity for user-created QR designs.
//
// Database Table: templates
//
// Fields:
//   - ID: Unique identifier (format: tpl_<timestamp>)
//   - Name: User-friendly template name
//   - SettingsJSON: JSON-serialized QRSettings from frontend
//   - LogoData: Binary logo image data (optional)
//   - BackgroundData: Binary background image data (optional)
//   - CreatedAt: Template creation timestamp
//   - UpdatedAt: Last modification timestamp
//
// Note: LogoData and BackgroundData are stored as binary BLOBs
// to avoid Base64 encoding overhead that plagued localStorage.
type Template struct {
	// ID is the unique template identifier.
	// Format: tpl_<unix_timestamp_ms>
	// Generated on the frontend when saving.
	ID string `json:"id" db:"id"`

	// Name is the user-provided template name.
	// Displayed in the template list.
	Name string `json:"name" db:"name"`

	// SettingsJSON contains the full QRSettings object as JSON.
	// This includes all styling options, colors, dot types, etc.
	// Parsed on the frontend into the QRSettings TypeScript interface.
	SettingsJSON string `json:"settingsJson" db:"settings_json"`

	// LogoData contains the binary logo image.
	// Stored as BLOB to avoid Base64 size inflation.
	// nil if no logo is set.
	LogoData []byte `json:"logoData,omitempty" db:"logo_data"`

	// BackgroundData contains the binary background image.
	// Stored as BLOB to avoid Base64 size inflation.
	// nil if no background image is set.
	BackgroundData []byte `json:"backgroundData,omitempty" db:"background_data"`

	// CreatedAt is when the template was first saved.
	CreatedAt time.Time `json:"createdAt" db:"created_at"`

	// UpdatedAt is when the template was last modified.
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// Setting represents a single configuration key-value pair.
// Used for user preferences and application settings.
//
// Database Table: settings
//
// Fields:
//   - Key: Unique setting identifier (e.g., "theme", "default_export_format")
//   - Value: Setting value as string (parsed by consumer)
//   - UpdatedAt: Last modification timestamp
//
// Common Keys:
//   - theme: "light" | "dark" | "system"
//   - default_export_format: "png" | "svg" | "jpeg"
//   - default_qr_size: numeric string (e.g., "1000")
//   - show_history: "true" | "false"
//   - auto_save_templates: "true" | "false"
type Setting struct {
	// Key is the unique setting identifier.
	// Should be lowercase with underscores (snake_case).
	Key string `json:"key" db:"key"`

	// Value is the setting value as a string.
	// Consumer is responsible for type conversion.
	Value string `json:"value" db:"value"`

	// UpdatedAt is when the setting was last modified.
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// HistoryEntry represents a record of a generated QR code.
// Used for tracking generation history and analytics.
//
// Database Table: history
//
// Fields:
//   - ID: Auto-incrementing primary key
//   - TemplateID: Associated template (optional, nullable)
//   - DataType: Type of QR content (url, text, wifi, etc.)
//   - DataContent: The actual content encoded in the QR
//   - ExportedPath: File path if exported (optional)
//   - ExportFormat: Export format used (png, svg, jpeg)
//   - CreatedAt: When the QR was generated
type HistoryEntry struct {
	// ID is the auto-generated primary key.
	ID int64 `json:"id" db:"id"`

	// TemplateID links to the template used (if any).
	// May be empty string if using default/custom settings.
	TemplateID string `json:"templateId,omitempty" db:"template_id"`

	// DataType indicates the QR content type.
	// Values: "url", "text", "email", "wifi", "vcard", "event", "location"
	DataType string `json:"dataType" db:"data_type"`

	// DataContent is the actual data encoded in the QR code.
	// For privacy, this could be truncated or hashed in future versions.
	DataContent string `json:"dataContent" db:"data_content"`

	// ExportedPath is the file path where the QR was saved.
	// Empty if copied to clipboard or not exported.
	ExportedPath string `json:"exportedPath,omitempty" db:"exported_path"`

	// ExportFormat is the format used for export.
	// Values: "png", "svg", "jpeg", "clipboard"
	ExportFormat string `json:"exportFormat" db:"export_format"`

	// CreatedAt is when the QR code was generated.
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// TemplateListItem is a lightweight version of Template for list views.
// Excludes binary data to reduce payload size.
//
// Used when fetching template lists where full data isn't needed.
type TemplateListItem struct {
	// ID is the unique template identifier.
	ID string `json:"id"`

	// Name is the user-provided template name.
	Name string `json:"name"`

	// HasLogo indicates if the template has a logo.
	HasLogo bool `json:"hasLogo"`

	// HasBackground indicates if the template has a background image.
	HasBackground bool `json:"hasBackground"`

	// CreatedAt is when the template was first saved.
	CreatedAt time.Time `json:"createdAt"`

	// UpdatedAt is when the template was last modified.
	UpdatedAt time.Time `json:"updatedAt"`
}

// NewTemplate creates a new Template with generated ID and timestamps.
// Use this when creating a template from frontend data.
//
// Parameters:
//   - name: User-provided template name
//   - settingsJSON: JSON-serialized QRSettings
//
// Returns:
//   - *Template: New template with ID and timestamps set
func NewTemplate(name, settingsJSON string) *Template {
	now := time.Now()
	return &Template{
		ID:           generateTemplateID(),
		Name:         name,
		SettingsJSON: settingsJSON,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// generateTemplateID creates a unique template identifier.
// Format: tpl_<unix_timestamp_nanoseconds>
//
// Returns:
//   - string: Unique template ID
func generateTemplateID() string {
	return "tpl_" + time.Now().Format("20060102150405.000000000")
}
