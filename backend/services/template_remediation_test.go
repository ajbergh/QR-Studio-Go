package services

import (
	"path/filepath"
	"testing"

	"qr-studio/backend/database"
)

func newTestTemplateService(t *testing.T) *TemplateService {
	t.Helper()
	db, err := database.NewDatabaseAt(filepath.Join(t.TempDir(), "qr-studio-test.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Migrate(); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}
	return NewTemplateService(db)
}

func TestSaveTemplatePreservesImages(t *testing.T) {
	service := newTestTemplateService(t)
	original, err := service.SaveTemplate(database.Template{
		ID:             "tpl_original",
		Name:           "Original",
		SettingsJSON:   `{"dataType":"url","dotsOptions":{},"backgroundOptions":{},"qrOptions":{}}`,
		LogoData:       []byte{1, 2, 3},
		BackgroundData: []byte{4, 5, 6},
	})
	if err != nil {
		t.Fatalf("save original: %v", err)
	}

	_, err = service.SaveTemplatePreservingImages(database.Template{
		ID:           original.ID,
		Name:         "Updated",
		SettingsJSON: `{"dataType":"text","dotsOptions":{},"backgroundOptions":{},"qrOptions":{}}`,
	}, true, true)
	if err != nil {
		t.Fatalf("save preserving images: %v", err)
	}

	updated, err := service.GetTemplate(original.ID)
	if err != nil {
		t.Fatalf("reload updated template: %v", err)
	}
	if string(updated.LogoData) != string(original.LogoData) {
		t.Fatalf("logo data changed: got %v want %v", updated.LogoData, original.LogoData)
	}
	if string(updated.BackgroundData) != string(original.BackgroundData) {
		t.Fatalf("background data changed: got %v want %v", updated.BackgroundData, original.BackgroundData)
	}
}

func TestRenameAndDuplicatePreserveImages(t *testing.T) {
	service := newTestTemplateService(t)
	_, err := service.SaveTemplate(database.Template{
		ID:           "tpl_source",
		Name:         "Source",
		SettingsJSON: `{"dataType":"url","dotsOptions":{},"backgroundOptions":{},"qrOptions":{}}`,
		LogoData:     []byte{9, 8, 7},
	})
	if err != nil {
		t.Fatalf("save source: %v", err)
	}
	if err := service.RenameTemplate("tpl_source", "Renamed"); err != nil {
		t.Fatalf("rename: %v", err)
	}
	duplicate, err := service.DuplicateTemplate("tpl_source", "tpl_copy", "Copy")
	if err != nil {
		t.Fatalf("duplicate: %v", err)
	}
	if string(duplicate.LogoData) != string([]byte{9, 8, 7}) {
		t.Fatalf("duplicate lost logo data: %v", duplicate.LogoData)
	}
}

func TestTransactionalImportReportsFailuresAndDuplicates(t *testing.T) {
	service := newTestTemplateService(t)
	valid := database.Template{ID: "tpl_valid", Name: "Valid", SettingsJSON: `{"dataType":"url","dotsOptions":{},"backgroundOptions":{},"qrOptions":{}}`}
	invalid := database.Template{ID: "tpl_invalid", Name: "Invalid", SettingsJSON: `{not-json}`}

	result, err := service.ImportTemplatesTransactional([]database.Template{valid, invalid})
	if err != nil {
		t.Fatalf("import: %v", err)
	}
	if result.Imported != 1 || len(result.Failed) != 1 {
		t.Fatalf("unexpected import report: %+v", result)
	}

	result, err = service.ImportTemplatesTransactional([]database.Template{valid})
	if err != nil {
		t.Fatalf("duplicate import: %v", err)
	}
	if result.Skipped != 1 || result.Imported != 0 {
		t.Fatalf("expected duplicate to be skipped: %+v", result)
	}
}
