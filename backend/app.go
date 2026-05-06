/*
================================================================================
QR STUDIO - WAILS APPLICATION CORE
================================================================================

File: backend/app.go
Description: Core application struct and lifecycle management for the QR Studio
             Wails application. This file defines the main App struct that holds
             all services and implements Wails lifecycle hooks.

Responsibilities:
  - Initialize and manage application services (database, templates, settings)
  - Provide Wails lifecycle hooks (Startup, DomReady, Shutdown, BeforeClose)
  - Expose methods to the React frontend via Wails bindings
  - Manage application context for graceful operations

Services Managed:
  - Database: SQLite connection and operations
  - TemplateService: CRUD operations for QR templates
  - SettingsService: User preferences and app configuration
  - ExportService: File export and native dialog operations

Lifecycle Flow:
  1. NewApp() - Creates App instance with nil services
  2. Startup() - Initializes database and all services
  3. DomReady() - Called when frontend is ready
  4. BeforeClose() - Cleanup before window closes
  5. Shutdown() - Final cleanup, close database

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

package backend

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"qr-studio/backend/database"
	"qr-studio/backend/services"
)

// App is the main application struct that holds all backend services
// and manages the application lifecycle. It is bound to Wails and its
// public methods become available to the React frontend.
//
// Fields:
//   - ctx: Wails context for runtime operations (dialogs, events, etc.)
//   - db: Database connection manager
//   - templateService: Handles QR template CRUD operations
//   - settingsService: Handles user settings persistence
//   - exportService: Handles file exports and native dialogs
//   - historyService: Handles QR code generation history
type App struct {
	// ctx holds the Wails runtime context, provided during Startup.
	// Used for accessing runtime features like dialogs, events, clipboard.
	ctx context.Context

	// db is the database connection manager.
	// Initialized during Startup, closed during Shutdown.
	db *database.Database

	// templateService handles all template-related operations.
	// Provides CRUD, import/export for QR templates.
	templateService *services.TemplateService

	// settingsService handles user preferences and app settings.
	// Provides get/set operations for persistent configuration.
	settingsService *services.SettingsService

	// exportService handles file operations with native dialogs.
	// Provides save/open dialogs and file I/O.
	exportService *services.ExportService

	// historyService handles QR code generation history tracking.
	// Provides history CRUD and analytics operations.
	historyService *services.HistoryService
}

// NewApp creates a new App instance with nil services.
// Services are initialized later in the Startup lifecycle hook.
//
// This separation allows Wails to bind the App struct before
// the context is available, enabling proper lifecycle management.
//
// Returns:
//   - *App: New application instance ready for Wails binding
func NewApp() *App {
	return &App{}
}

// Startup is called when the Wails application starts.
// This is where we initialize the database and all services.
//
// Initialization order:
//  1. Store Wails context for runtime operations
//  2. Initialize SQLite database connection
//  3. Create service instances with database dependency
//
// Parameters:
//   - ctx: Wails runtime context for accessing runtime features
//
// Note: Errors during startup are logged but don't prevent app launch.
// The frontend should check service availability and show appropriate UI.
func (a *App) Startup(ctx context.Context) {
	// Store the context for use in other methods
	a.ctx = ctx

	// Initialize the database
	// The database file is created in the user's app data directory
	var err error
	a.db, err = database.NewDatabase()
	if err != nil {
		// Log error but continue - services will handle nil db gracefully
		fmt.Printf("Failed to initialize database: %v\n", err)
		runtime.LogError(ctx, fmt.Sprintf("Database initialization failed: %v", err))
		return
	}

	// Run database migrations to ensure schema is up to date
	if err := a.db.Migrate(); err != nil {
		fmt.Printf("Failed to run migrations: %v\n", err)
		runtime.LogError(ctx, fmt.Sprintf("Database migration failed: %v", err))
	}

	// Initialize services with database dependency
	a.templateService = services.NewTemplateService(a.db)
	a.settingsService = services.NewSettingsService(a.db)
	a.exportService = services.NewExportService(ctx)
	a.historyService = services.NewHistoryService(a.db)

	runtime.LogInfo(ctx, "QR Studio backend initialized successfully")
}

// DomReady is called after the frontend DOM has been loaded.
// This is the ideal time to perform any frontend-dependent initialization.
//
// Parameters:
//   - ctx: Wails runtime context
//
// Current implementation:
//   - Logs that frontend is ready
//   - Future: Could emit events to frontend, load initial data, etc.
func (a *App) DomReady(ctx context.Context) {
	runtime.LogInfo(ctx, "Frontend DOM ready")
}

// BeforeClose is called when the window is about to close.
// Return true to prevent the close, false to allow it.
//
// Parameters:
//   - ctx: Wails runtime context
//
// Returns:
//   - bool: false to allow close, true to prevent close
//
// Current implementation:
//   - Always allows close
//   - Future: Could prompt for unsaved changes
func (a *App) BeforeClose(ctx context.Context) bool {
	// Return false to allow the window to close
	// Return true to prevent the window from closing
	return false
}

// Shutdown is called when the application is terminating.
// This is where we clean up resources, close database connections, etc.
//
// Parameters:
//   - ctx: Wails runtime context
//
// Cleanup order:
//  1. Close database connection
//  2. Any other resource cleanup
func (a *App) Shutdown(ctx context.Context) {
	runtime.LogInfo(ctx, "QR Studio shutting down")

	// Close database connection
	if a.db != nil {
		if err := a.db.Close(); err != nil {
			runtime.LogError(ctx, fmt.Sprintf("Error closing database: %v", err))
		}
	}
}

// ============================================================================
// FRONTEND-BOUND METHODS
// ============================================================================
// The following methods are exposed to the React frontend via Wails bindings.
// They are generated into frontend/wailsjs/go/backend/App.js

// GetVersion returns the current application version.
// Used by the frontend to display version info and check compatibility.
//
// Returns:
//   - string: Application version in semver format
func (a *App) GetVersion() string {
	return "1.0.0"
}

// IsDesktopMode returns true to indicate we're running in Wails desktop mode.
// The frontend uses this to conditionally enable desktop-only features.
//
// Returns:
//   - bool: Always true when running in Wails
func (a *App) IsDesktopMode() bool {
	return true
}

// ============================================================================
// TEMPLATE METHODS - Frontend Bindings
// ============================================================================

// GetAllTemplates retrieves all templates from the database with settings.
// Returns templates with settingsJson for rendering previews (but no binary data).
//
// Returns:
//   - []database.Template: List of templates with settings
//   - error: Database error if query fails
func (a *App) GetAllTemplates() ([]database.Template, error) {
	runtime.LogInfo(a.ctx, "GetAllTemplates called")
	if a.templateService == nil {
		runtime.LogError(a.ctx, "GetAllTemplates: template service not initialized")
		return nil, fmt.Errorf("template service not initialized")
	}
	templates, err := a.templateService.GetAllTemplatesWithSettings()
	if err != nil {
		runtime.LogError(a.ctx, fmt.Sprintf("GetAllTemplates error: %v", err))
		return nil, err
	}
	runtime.LogInfo(a.ctx, fmt.Sprintf("GetAllTemplates success: %d templates", len(templates)))
	return templates, nil
}

// GetTemplate retrieves a single template by ID with full data.
//
// Parameters:
//   - id: Template ID to retrieve
//
// Returns:
//   - *database.Template: Full template data
//   - error: Not found error or database error
func (a *App) GetTemplate(id string) (*database.Template, error) {
	if a.templateService == nil {
		return nil, fmt.Errorf("template service not initialized")
	}
	return a.templateService.GetTemplate(id)
}

// SaveTemplate creates a new template or updates an existing one.
//
// Parameters:
//   - id: Template ID (empty for new templates)
//   - name: Template name
//   - settingsJSON: JSON-serialized QRSettings
//
// Returns:
//   - *database.Template: Saved template with updated timestamps
//   - error: Validation or database error
func (a *App) SaveTemplate(id, name, settingsJSON string) (*database.Template, error) {
	runtime.LogInfo(a.ctx, fmt.Sprintf("SaveTemplate called: id=%s, name=%s", id, name))
	if a.templateService == nil {
		runtime.LogError(a.ctx, "SaveTemplate: template service not initialized")
		return nil, fmt.Errorf("template service not initialized")
	}
	template := database.Template{
		ID:           id,
		Name:         name,
		SettingsJSON: settingsJSON,
	}
	result, err := a.templateService.SaveTemplate(template)
	if err != nil {
		runtime.LogError(a.ctx, fmt.Sprintf("SaveTemplate error: %v", err))
		return nil, err
	}
	runtime.LogInfo(a.ctx, fmt.Sprintf("SaveTemplate success: id=%s", result.ID))
	return result, nil
}

// SaveTemplateWithImages creates or updates a template with logo and background data.
//
// Parameters:
//   - id: Template ID (empty for new templates)
//   - name: Template name
//   - settingsJSON: JSON-serialized QRSettings
//   - logoData: Base64-encoded logo image (empty if none)
//   - backgroundData: Base64-encoded background image (empty if none)
//
// Returns:
//   - *database.Template: Saved template
//   - error: Validation or database error
func (a *App) SaveTemplateWithImages(id, name, settingsJSON string, logoData, backgroundData []byte) (*database.Template, error) {
	if a.templateService == nil {
		return nil, fmt.Errorf("template service not initialized")
	}
	template := database.Template{
		ID:             id,
		Name:           name,
		SettingsJSON:   settingsJSON,
		LogoData:       logoData,
		BackgroundData: backgroundData,
	}
	return a.templateService.SaveTemplate(template)
}

// DeleteTemplate removes a template from the database.
//
// Parameters:
//   - id: Template ID to delete
//
// Returns:
//   - error: Not found error or database error
func (a *App) DeleteTemplate(id string) error {
	if a.templateService == nil {
		return fmt.Errorf("template service not initialized")
	}
	return a.templateService.DeleteTemplate(id)
}

// ImportTemplates imports templates from a JSON string.
//
// Parameters:
//   - jsonData: JSON string containing array of templates
//
// Returns:
//   - int: Number of templates successfully imported
//   - error: Parse or database error
func (a *App) ImportTemplates(jsonData string) (int, error) {
	if a.templateService == nil {
		return 0, fmt.Errorf("template service not initialized")
	}
	return a.templateService.ImportTemplates(jsonData)
}

// ExportTemplates exports all templates to a JSON string.
//
// Returns:
//   - string: JSON string containing array of templates
//   - error: Database or serialization error
func (a *App) ExportTemplates() (string, error) {
	if a.templateService == nil {
		return "", fmt.Errorf("template service not initialized")
	}
	return a.templateService.ExportTemplates()
}

// GetTemplateCount returns the total number of saved templates.
//
// Returns:
//   - int: Number of templates in database
//   - error: Database error if query fails
func (a *App) GetTemplateCount() (int, error) {
	if a.templateService == nil {
		return 0, fmt.Errorf("template service not initialized")
	}
	return a.templateService.GetTemplateCount()
}

// ============================================================================
// SETTINGS METHODS - Frontend Bindings
// ============================================================================

// GetSetting retrieves a single setting value by key.
//
// Parameters:
//   - key: Setting key to retrieve
//
// Returns:
//   - string: Setting value (or default)
//   - error: Database error if query fails
func (a *App) GetSetting(key string) (string, error) {
	if a.settingsService == nil {
		return "", fmt.Errorf("settings service not initialized")
	}
	return a.settingsService.GetSetting(key)
}

// SetSetting saves a setting value.
//
// Parameters:
//   - key: Setting key
//   - value: Setting value
//
// Returns:
//   - error: Database error if save fails
func (a *App) SetSetting(key, value string) error {
	if a.settingsService == nil {
		return fmt.Errorf("settings service not initialized")
	}
	return a.settingsService.SetSetting(key, value)
}

// GetAllSettings retrieves all settings as a key-value map.
//
// Returns:
//   - map[string]string: All settings
//   - error: Database error if query fails
func (a *App) GetAllSettings() (map[string]string, error) {
	if a.settingsService == nil {
		return nil, fmt.Errorf("settings service not initialized")
	}
	return a.settingsService.GetAllSettings()
}

// GetSettingBool retrieves a setting as a boolean.
//
// Parameters:
//   - key: Setting key
//
// Returns:
//   - bool: Parsed boolean value
//   - error: Database error if query fails
func (a *App) GetSettingBool(key string) (bool, error) {
	if a.settingsService == nil {
		return false, fmt.Errorf("settings service not initialized")
	}
	return a.settingsService.GetSettingBool(key)
}

// GetSettingInt retrieves a setting as an integer.
//
// Parameters:
//   - key: Setting key
//
// Returns:
//   - int: Parsed integer value
//   - error: Database or parse error
func (a *App) GetSettingInt(key string) (int, error) {
	if a.settingsService == nil {
		return 0, fmt.Errorf("settings service not initialized")
	}
	return a.settingsService.GetSettingInt(key)
}

// ResetSettingsToDefaults removes all settings, reverting to defaults.
//
// Returns:
//   - error: Database error if delete fails
func (a *App) ResetSettingsToDefaults() error {
	if a.settingsService == nil {
		return fmt.Errorf("settings service not initialized")
	}
	return a.settingsService.ResetToDefaults()
}

// ============================================================================
// EXPORT METHODS - Frontend Bindings
// ============================================================================

// ShowSaveDialog displays a native file save dialog.
//
// Parameters:
//   - defaultFilename: Suggested filename
//   - filters: File type filters
//
// Returns:
//   - string: Selected file path, or empty if cancelled
//   - error: Error if dialog fails
func (a *App) ShowSaveDialog(defaultFilename string, filters []services.FileFilter) (string, error) {
	if a.exportService == nil {
		return "", fmt.Errorf("export service not initialized")
	}
	return a.exportService.ShowSaveDialog(defaultFilename, filters)
}

// ShowOpenDialog displays a native file open dialog.
//
// Parameters:
//   - filters: File type filters
//
// Returns:
//   - string: Selected file path, or empty if cancelled
//   - error: Error if dialog fails
func (a *App) ShowOpenDialog(filters []services.FileFilter) (string, error) {
	if a.exportService == nil {
		return "", fmt.Errorf("export service not initialized")
	}
	return a.exportService.ShowOpenDialog(filters)
}

// SaveFile writes data to a file at the specified path.
//
// Parameters:
//   - path: Full file path
//   - data: Byte data to write
//
// Returns:
//   - error: Error if write fails
func (a *App) SaveFile(path string, data []byte) error {
	if a.exportService == nil {
		return fmt.Errorf("export service not initialized")
	}
	return a.exportService.SaveFile(path, data)
}

// SaveTextFile writes text content to a file.
//
// Parameters:
//   - path: Full file path
//   - content: Text content to write
//
// Returns:
//   - error: Error if write fails
func (a *App) SaveTextFile(path, content string) error {
	if a.exportService == nil {
		return fmt.Errorf("export service not initialized")
	}
	return a.exportService.SaveTextFile(path, content)
}

// ReadFile reads data from a file.
//
// Parameters:
//   - path: Full file path
//
// Returns:
//   - []byte: File contents
//   - error: Error if read fails
func (a *App) ReadFile(path string) ([]byte, error) {
	if a.exportService == nil {
		return nil, fmt.Errorf("export service not initialized")
	}
	return a.exportService.ReadFile(path)
}

// GetAppDataPath returns the application data directory.
//
// Returns:
//   - string: App data directory path
//   - error: Error if path cannot be determined
func (a *App) GetAppDataPath() (string, error) {
	if a.exportService == nil {
		return "", fmt.Errorf("export service not initialized")
	}
	return a.exportService.GetAppDataPath()
}

// GetDesktopPath returns the user's desktop directory.
//
// Returns:
//   - string: Desktop directory path
//   - error: Error if path cannot be determined
func (a *App) GetDesktopPath() (string, error) {
	if a.exportService == nil {
		return "", fmt.Errorf("export service not initialized")
	}
	return a.exportService.GetDesktopPath()
}

// FileExists checks if a file exists at the given path.
//
// Parameters:
//   - path: File path to check
//
// Returns:
//   - bool: True if file exists
func (a *App) FileExists(path string) bool {
	if a.exportService == nil {
		return false
	}
	return a.exportService.FileExists(path)
}

// GetImageFilters returns common image file filters for dialogs.
//
// Returns:
//   - []services.FileFilter: PNG, JPEG, and SVG filters
func (a *App) GetImageFilters() []services.FileFilter {
	if a.exportService == nil {
		return nil
	}
	return a.exportService.GetImageFilters()
}

// ============================================================================
// HISTORY METHODS - Frontend Bindings
// ============================================================================

// AddHistoryEntry records a QR code generation event.
//
// Parameters:
//   - entry: History entry data
//
// Returns:
//   - *database.HistoryEntry: Created entry with ID
//   - error: Database error if insert fails
func (a *App) AddHistoryEntry(entry database.HistoryEntry) (*database.HistoryEntry, error) {
	if a.historyService == nil {
		return nil, fmt.Errorf("history service not initialized")
	}
	return a.historyService.AddHistoryEntry(entry)
}

// GetHistory retrieves recent history entries.
//
// Parameters:
//   - limit: Maximum number of entries to return (0 for all)
//
// Returns:
//   - []database.HistoryEntry: History entries
//   - error: Database error if query fails
func (a *App) GetHistory(limit int) ([]database.HistoryEntry, error) {
	if a.historyService == nil {
		return nil, fmt.Errorf("history service not initialized")
	}
	return a.historyService.GetHistory(limit)
}

// ClearHistory removes all history entries.
//
// Returns:
//   - int: Number of entries deleted
//   - error: Database error if delete fails
func (a *App) ClearHistory() (int, error) {
	if a.historyService == nil {
		return 0, fmt.Errorf("history service not initialized")
	}
	return a.historyService.ClearHistory()
}

// GetHistoryStats returns aggregate statistics about generation history.
//
// Returns:
//   - *services.HistoryStats: Aggregate statistics
//   - error: Database error if query fails
func (a *App) GetHistoryStats() (*services.HistoryStats, error) {
	if a.historyService == nil {
		return nil, fmt.Errorf("history service not initialized")
	}
	return a.historyService.GetHistoryStats()
}

// GetHistoryCount returns the total number of history entries.
//
// Returns:
//   - int: Number of history entries
//   - error: Database error if query fails
func (a *App) GetHistoryCount() (int, error) {
	if a.historyService == nil {
		return 0, fmt.Errorf("history service not initialized")
	}
	return a.historyService.GetHistoryCount()
}
