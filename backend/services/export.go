/*
================================================================================
QR STUDIO - EXPORT SERVICE
================================================================================

File: backend/services/export.go
Description: Service layer for file export operations and native dialogs.
             Provides native OS integration for file save/open dialogs,
             clipboard operations, and file I/O.

Responsibilities:
  - Show native file save dialogs
  - Show native file open dialogs
  - Write files to disk
  - Read files from disk
  - Get application data directory path

Methods (Bound to Frontend):
  - ShowSaveDialog(defaultName, filters) - Native save file dialog
  - ShowOpenDialog(filters) - Native open file dialog
  - SaveFile(path, data) - Write data to file
  - ReadFile(path) - Read data from file
  - GetAppDataPath() - Get app data directory

Wails Integration:
  - Uses wails/v2/pkg/runtime for native dialogs
  - Dialogs are OS-native (Windows Explorer style on Windows)

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

package services

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	goruntime "runtime"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// ExportService provides file export and native dialog operations.
// It uses the Wails context for native OS integration.
//
// Fields:
//   - ctx: Wails runtime context for native dialogs
type ExportService struct {
	// ctx is the Wails runtime context.
	// Required for native dialog operations.
	ctx context.Context
}

// FileFilter represents a file type filter for dialogs.
// Used to restrict file selection to specific types.
//
// Fields:
//   - DisplayName: Human-readable filter name (e.g., "PNG Images")
//   - Pattern: File pattern (e.g., "*.png")
type FileFilter struct {
	DisplayName string `json:"displayName"`
	Pattern     string `json:"pattern"`
}

// NewExportService creates a new ExportService instance.
//
// Parameters:
//   - ctx: Wails runtime context
//
// Returns:
//   - *ExportService: Initialized service ready for use
func NewExportService(ctx context.Context) *ExportService {
	return &ExportService{ctx: ctx}
}

// ShowSaveDialog displays a native file save dialog.
// Returns the selected file path, or empty string if cancelled.
//
// Parameters:
//   - defaultFilename: Suggested filename
//   - filters: File type filters (optional)
//
// Returns:
//   - string: Selected file path, or empty if cancelled
//   - error: Error if dialog fails to open
func (s *ExportService) ShowSaveDialog(defaultFilename string, filters []FileFilter) (string, error) {
	if s.ctx == nil {
		return "", fmt.Errorf("context not initialized")
	}

	// Convert filters to Wails format
	var wailsFilters []runtime.FileFilter
	for _, f := range filters {
		wailsFilters = append(wailsFilters, runtime.FileFilter{
			DisplayName: f.DisplayName,
			Pattern:     f.Pattern,
		})
	}

	// Show native save dialog
	path, err := runtime.SaveFileDialog(s.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultFilename,
		Title:           "Save QR Code",
		Filters:         wailsFilters,
	})

	if err != nil {
		return "", fmt.Errorf("failed to show save dialog: %w", err)
	}

	return path, nil
}

// ShowOpenDialog displays a native file open dialog.
// Returns the selected file path, or empty string if cancelled.
//
// Parameters:
//   - filters: File type filters (optional)
//
// Returns:
//   - string: Selected file path, or empty if cancelled
//   - error: Error if dialog fails to open
func (s *ExportService) ShowOpenDialog(filters []FileFilter) (string, error) {
	if s.ctx == nil {
		return "", fmt.Errorf("context not initialized")
	}

	// Convert filters to Wails format
	var wailsFilters []runtime.FileFilter
	for _, f := range filters {
		wailsFilters = append(wailsFilters, runtime.FileFilter{
			DisplayName: f.DisplayName,
			Pattern:     f.Pattern,
		})
	}

	// Show native open dialog
	path, err := runtime.OpenFileDialog(s.ctx, runtime.OpenDialogOptions{
		Title:   "Open File",
		Filters: wailsFilters,
	})

	if err != nil {
		return "", fmt.Errorf("failed to show open dialog: %w", err)
	}

	return path, nil
}

// ShowOpenMultipleDialog displays a native multiple file selection dialog.
// Returns an array of selected file paths.
//
// Parameters:
//   - filters: File type filters (optional)
//
// Returns:
//   - []string: Selected file paths
//   - error: Error if dialog fails to open
func (s *ExportService) ShowOpenMultipleDialog(filters []FileFilter) ([]string, error) {
	if s.ctx == nil {
		return nil, fmt.Errorf("context not initialized")
	}

	// Convert filters to Wails format
	var wailsFilters []runtime.FileFilter
	for _, f := range filters {
		wailsFilters = append(wailsFilters, runtime.FileFilter{
			DisplayName: f.DisplayName,
			Pattern:     f.Pattern,
		})
	}

	// Show native open multiple dialog
	paths, err := runtime.OpenMultipleFilesDialog(s.ctx, runtime.OpenDialogOptions{
		Title:   "Select Files",
		Filters: wailsFilters,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to show open dialog: %w", err)
	}

	return paths, nil
}

// ShowDirectoryDialog displays a native directory selection dialog.
// Returns the selected directory path, or empty string if cancelled.
//
// Returns:
//   - string: Selected directory path
//   - error: Error if dialog fails to open
func (s *ExportService) ShowDirectoryDialog() (string, error) {
	if s.ctx == nil {
		return "", fmt.Errorf("context not initialized")
	}

	path, err := runtime.OpenDirectoryDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Select Directory",
	})

	if err != nil {
		return "", fmt.Errorf("failed to show directory dialog: %w", err)
	}

	return path, nil
}

// SaveFile writes data to a file at the specified path.
// Creates parent directories if they don't exist.
//
// Parameters:
//   - path: Full file path
//   - data: Byte data to write
//
// Returns:
//   - error: Error if write fails
func (s *ExportService) SaveFile(path string, data []byte) error {
	// Ensure directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Write file
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// SaveTextFile writes text content to a file.
// Convenience wrapper around SaveFile for string data.
//
// Parameters:
//   - path: Full file path
//   - content: Text content to write
//
// Returns:
//   - error: Error if write fails
func (s *ExportService) SaveTextFile(path, content string) error {
	return s.SaveFile(path, []byte(content))
}

// ReadFile reads data from a file.
//
// Parameters:
//   - path: Full file path
//
// Returns:
//   - []byte: File contents
//   - error: Error if read fails
func (s *ExportService) ReadFile(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	return data, nil
}

// ReadTextFile reads text content from a file.
// Convenience wrapper around ReadFile for string data.
//
// Parameters:
//   - path: Full file path
//
// Returns:
//   - string: File contents as text
//   - error: Error if read fails
func (s *ExportService) ReadTextFile(path string) (string, error) {
	data, err := s.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FileExists checks if a file exists at the given path.
//
// Parameters:
//   - path: File path to check
//
// Returns:
//   - bool: True if file exists
func (s *ExportService) FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// GetAppDataPath returns the application data directory.
// This is where the database and other app data is stored.
//
// Returns:
//   - string: App data directory path
//   - error: Error if path cannot be determined
func (s *ExportService) GetAppDataPath() (string, error) {
	var appDataDir string

	switch goruntime.GOOS {
	case "windows":
		appDataDir = os.Getenv("APPDATA")
		if appDataDir == "" {
			return "", fmt.Errorf("APPDATA environment variable not set")
		}
	case "darwin":
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("failed to get home directory: %w", err)
		}
		appDataDir = filepath.Join(homeDir, "Library", "Application Support")
	default:
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("failed to get home directory: %w", err)
		}
		appDataDir = filepath.Join(homeDir, ".config")
	}

	return filepath.Join(appDataDir, "QRStudio"), nil
}

// GetDesktopPath returns the user's desktop directory.
// Useful for default save locations.
//
// Returns:
//   - string: Desktop directory path
//   - error: Error if path cannot be determined
func (s *ExportService) GetDesktopPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}
	return filepath.Join(homeDir, "Desktop"), nil
}

// GetDocumentsPath returns the user's documents directory.
// Alternative save location.
//
// Returns:
//   - string: Documents directory path
//   - error: Error if path cannot be determined
func (s *ExportService) GetDocumentsPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}
	return filepath.Join(homeDir, "Documents"), nil
}

// GetImageFilters returns common image file filters for dialogs.
// Convenience method for consistent filter usage.
//
// Returns:
//   - []FileFilter: PNG, JPEG, and SVG filters
func (s *ExportService) GetImageFilters() []FileFilter {
	return []FileFilter{
		{DisplayName: "PNG Images", Pattern: "*.png"},
		{DisplayName: "JPEG Images", Pattern: "*.jpg;*.jpeg"},
		{DisplayName: "SVG Images", Pattern: "*.svg"},
		{DisplayName: "All Files", Pattern: "*.*"},
	}
}

// GetTemplateFilters returns template file filters for import/export.
//
// Returns:
//   - []FileFilter: JSON filter for templates
func (s *ExportService) GetTemplateFilters() []FileFilter {
	return []FileFilter{
		{DisplayName: "Template Files", Pattern: "*.json"},
		{DisplayName: "All Files", Pattern: "*.*"},
	}
}
