package backend

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"qr-studio/backend/database"
	"qr-studio/backend/services"
)

const (
	applicationVersion = "1.1.0"
	maxArtifactBytes    = 64 * 1024 * 1024
	maxPackageBytes     = 32 * 1024 * 1024
)

// DesktopAPI is the only object bound to the Wails webview. It exposes
// intent-specific operations instead of arbitrary filesystem primitives.
type DesktopAPI struct{ runtime *Runtime }

type ReleaseInfo struct {
	Version       string `json:"version"`
	SchemaVersion int    `json:"schemaVersion"`
	Desktop       bool   `json:"desktop"`
}

type TemplateSaveRequest struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	SettingsJSON       string `json:"settingsJson"`
	LogoData           []byte `json:"logoData,omitempty"`
	BackgroundData     []byte `json:"backgroundData,omitempty"`
	PreserveLogo       bool   `json:"preserveLogo"`
	PreserveBackground bool   `json:"preserveBackground"`
}

type TemplatePackage struct {
	FormatVersion string              `json:"formatVersion"`
	ExportedAt    string              `json:"exportedAt"`
	Templates     []database.Template `json:"templates"`
}

type FileOperationResult struct {
	Status string `json:"status"`
	Path   string `json:"path,omitempty"`
}

type SafeHistoryEntry struct {
	ID           int64     `json:"id"`
	Label        string    `json:"label"`
	DataType     string    `json:"dataType"`
	ExportFormat string    `json:"exportFormat"`
	Filename     string    `json:"filename"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (a *DesktopAPI) ensureReady() error {
	if a == nil || a.runtime == nil {
		return fmt.Errorf("desktop API is unavailable")
	}
	return a.runtime.ready()
}

func (a *DesktopAPI) GetReleaseInfo() (ReleaseInfo, error) {
	if err := a.ensureReady(); err != nil {
		return ReleaseInfo{}, err
	}
	return ReleaseInfo{Version: applicationVersion, SchemaVersion: database.GetMigrationCount(), Desktop: true}, nil
}

func (a *DesktopAPI) ListTemplates() ([]services.TemplateSummary, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	return a.runtime.templateService.ListTemplateSummaries()
}

func (a *DesktopAPI) GetTemplate(id string) (*database.Template, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	return a.runtime.templateService.GetTemplate(id)
}

func (a *DesktopAPI) SaveTemplate(request TemplateSaveRequest) (*database.Template, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	if len(request.LogoData) > 12*1024*1024 || len(request.BackgroundData) > 20*1024*1024 {
		return nil, fmt.Errorf("template image exceeds the allowed size")
	}
	return a.runtime.templateService.SaveTemplatePreservingImages(database.Template{
		ID: request.ID, Name: request.Name, SettingsJSON: request.SettingsJSON,
		LogoData: request.LogoData, BackgroundData: request.BackgroundData,
	}, request.PreserveLogo, request.PreserveBackground)
}

func (a *DesktopAPI) RenameTemplate(id, name string) error {
	if err := a.ensureReady(); err != nil {
		return err
	}
	return a.runtime.templateService.RenameTemplate(id, name)
}

func (a *DesktopAPI) DuplicateTemplate(sourceID, newID, newName string) (*database.Template, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	return a.runtime.templateService.DuplicateTemplate(sourceID, newID, newName)
}

func (a *DesktopAPI) DeleteTemplate(id string) error {
	if err := a.ensureReady(); err != nil {
		return err
	}
	return a.runtime.templateService.DeleteTemplate(id)
}

func (a *DesktopAPI) GetTemplateCount() (int, error) {
	if err := a.ensureReady(); err != nil {
		return 0, err
	}
	return a.runtime.templateService.GetTemplateCount()
}

func (a *DesktopAPI) ImportTemplates(packageJSON string) (services.TemplateImportResult, error) {
	if err := a.ensureReady(); err != nil {
		return services.TemplateImportResult{}, err
	}
	if len(packageJSON) == 0 || len(packageJSON) > maxPackageBytes {
		return services.TemplateImportResult{}, fmt.Errorf("template package is empty or too large")
	}
	var envelope TemplatePackage
	if err := json.Unmarshal([]byte(packageJSON), &envelope); err != nil {
		return services.TemplateImportResult{}, fmt.Errorf("invalid template package: %w", err)
	}
	if envelope.FormatVersion != "1" {
		return services.TemplateImportResult{}, fmt.Errorf("unsupported template package version: %s", envelope.FormatVersion)
	}
	if len(envelope.Templates) > 1000 {
		return services.TemplateImportResult{}, fmt.Errorf("template package exceeds 1000 records")
	}
	return a.runtime.templateService.ImportTemplatesTransactional(envelope.Templates)
}

func (a *DesktopAPI) SaveTemplatePackage(defaultFilename, packageJSON string) (FileOperationResult, error) {
	if err := a.ensureReady(); err != nil {
		return FileOperationResult{}, err
	}
	if len(packageJSON) == 0 || len(packageJSON) > maxPackageBytes || !json.Valid([]byte(packageJSON)) {
		return FileOperationResult{}, fmt.Errorf("template package is invalid")
	}
	path, err := a.runtime.exportService.ShowSaveDialog(safeFilename(defaultFilename, "qr-studio-designs.json"), []services.FileFilter{{DisplayName: "QR Studio Design Package", Pattern: "*.json"}})
	if err != nil {
		return FileOperationResult{}, err
	}
	if path == "" {
		return FileOperationResult{Status: "cancelled"}, nil
	}
	if strings.ToLower(filepath.Ext(path)) != ".json" {
		path += ".json"
	}
	if err := atomicWrite(path, []byte(packageJSON), 0600); err != nil {
		return FileOperationResult{}, err
	}
	return FileOperationResult{Status: "saved", Path: path}, nil
}

func (a *DesktopAPI) OpenTemplatePackage() (string, error) {
	if err := a.ensureReady(); err != nil {
		return "", err
	}
	path, err := a.runtime.exportService.ShowOpenDialog([]services.FileFilter{{DisplayName: "QR Studio Design Package", Pattern: "*.json"}})
	if err != nil || path == "" {
		return "", err
	}
	info, err := os.Stat(path)
	if err != nil {
		return "", fmt.Errorf("failed to inspect package: %w", err)
	}
	if info.Size() > maxPackageBytes {
		return "", fmt.Errorf("template package exceeds 32 MB")
	}
	content, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("failed to read package: %w", err)
	}
	if !json.Valid(content) {
		return "", fmt.Errorf("selected file is not valid JSON")
	}
	return string(content), nil
}

func (a *DesktopAPI) SaveArtifact(defaultFilename, format, dataType, label string, data []byte) (FileOperationResult, error) {
	if err := a.ensureReady(); err != nil {
		return FileOperationResult{}, err
	}
	format = strings.ToLower(strings.TrimSpace(format))
	filters := map[string]services.FileFilter{
		"png": {DisplayName: "PNG Image", Pattern: "*.png"}, "jpeg": {DisplayName: "JPEG Image", Pattern: "*.jpg;*.jpeg"},
		"webp": {DisplayName: "WebP Image", Pattern: "*.webp"}, "svg": {DisplayName: "SVG Vector", Pattern: "*.svg"},
	}
	filter, ok := filters[format]
	if !ok {
		return FileOperationResult{}, fmt.Errorf("unsupported export format: %s", format)
	}
	if len(data) == 0 || len(data) > maxArtifactBytes {
		return FileOperationResult{}, fmt.Errorf("export artifact is empty or too large")
	}
	fallback := "qr-code." + format
	if format == "jpeg" {
		fallback = "qr-code.jpg"
	}
	path, err := a.runtime.exportService.ShowSaveDialog(safeFilename(defaultFilename, fallback), []services.FileFilter{filter})
	if err != nil {
		return FileOperationResult{}, err
	}
	if path == "" {
		return FileOperationResult{Status: "cancelled"}, nil
	}
	if format == "jpeg" {
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".jpg" && ext != ".jpeg" {
			path += ".jpg"
		}
	} else if strings.ToLower(filepath.Ext(path)) != "."+format {
		path += "." + format
	}
	if err := atomicWrite(path, data, 0600); err != nil {
		return FileOperationResult{}, err
	}

	showHistory, settingsErr := a.runtime.settingsService.GetSettingBool("show_history")
	if settingsErr == nil && showHistory {
		if err := a.runtime.historyService.AddRedactedHistoryEntry(label, dataType, format, path); err != nil {
			fmt.Printf("history write failed: %v\n", err)
		}
	}
	return FileOperationResult{Status: "saved", Path: path}, nil
}

func (a *DesktopAPI) GetHistory(limit int) ([]SafeHistoryEntry, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	if limit < 0 || limit > 500 {
		return nil, fmt.Errorf("history limit must be between 0 and 500")
	}
	entries, err := a.runtime.historyService.GetHistory(limit)
	if err != nil {
		return nil, err
	}
	result := make([]SafeHistoryEntry, 0, len(entries))
	for _, entry := range entries {
		result = append(result, SafeHistoryEntry{ID: entry.ID, Label: entry.DataContent, DataType: entry.DataType, ExportFormat: entry.ExportFormat, Filename: filepath.Base(entry.ExportedPath), CreatedAt: entry.CreatedAt})
	}
	return result, nil
}

func (a *DesktopAPI) ClearHistory() (int, error) {
	if err := a.ensureReady(); err != nil {
		return 0, err
	}
	return a.runtime.historyService.ClearHistory()
}

var allowedSettings = map[string]bool{
	"theme": true, "default_export_format": true, "default_qr_size": true, "default_error_correction": true,
	"show_history": true, "auto_save_templates": true, "autosave_draft": true, "migration_v2_status": true,
	"saved_qrs": true, "logo_history": true, "color_history": true, "filename_template": true, "last_format": true,
}

func (a *DesktopAPI) GetSetting(key string) (string, error) {
	if err := a.ensureReady(); err != nil {
		return "", err
	}
	if !allowedSettings[key] {
		return "", fmt.Errorf("setting is not allowed: %s", key)
	}
	return a.runtime.settingsService.GetSetting(key)
}

func (a *DesktopAPI) SetSetting(key, value string) error {
	if err := a.ensureReady(); err != nil {
		return err
	}
	if !allowedSettings[key] {
		return fmt.Errorf("setting is not allowed: %s", key)
	}
	if len(value) > 5*1024*1024 {
		return fmt.Errorf("setting value is too large")
	}
	return a.runtime.settingsService.SetSetting(key, value)
}

func (a *DesktopAPI) GetAllSettings() (map[string]string, error) {
	if err := a.ensureReady(); err != nil {
		return nil, err
	}
	all, err := a.runtime.settingsService.GetAllSettings()
	if err != nil {
		return nil, err
	}
	filtered := make(map[string]string)
	for key, value := range all {
		if allowedSettings[key] {
			filtered[key] = value
		}
	}
	return filtered, nil
}

func (a *DesktopAPI) ResetSettings() error {
	if err := a.ensureReady(); err != nil {
		return err
	}
	return a.runtime.settingsService.ResetToDefaults()
}

func atomicWrite(path string, data []byte, mode os.FileMode) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to create export directory: %w", err)
	}
	temp, err := os.CreateTemp(dir, ".qr-studio-*")
	if err != nil {
		return fmt.Errorf("failed to create temporary export: %w", err)
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)
	if err := temp.Chmod(mode); err != nil {
		_ = temp.Close()
		return fmt.Errorf("failed to secure temporary export: %w", err)
	}
	if _, err := temp.Write(data); err != nil {
		_ = temp.Close()
		return fmt.Errorf("failed to write temporary export: %w", err)
	}
	if err := temp.Sync(); err != nil {
		_ = temp.Close()
		return fmt.Errorf("failed to flush temporary export: %w", err)
	}
	if err := temp.Close(); err != nil {
		return fmt.Errorf("failed to close temporary export: %w", err)
	}
	if err := os.Rename(tempPath, path); err != nil {
		return fmt.Errorf("failed to finalize export: %w", err)
	}
	return nil
}

var unsafeFilename = regexp.MustCompile(`[\\/:*?"<>|\x00-\x1f]+`)

func safeFilename(value, fallback string) string {
	value = strings.TrimSpace(unsafeFilename.ReplaceAllString(value, "_"))
	if value == "" {
		return fallback
	}
	if len(value) > 180 {
		value = value[:180]
	}
	return value
}
