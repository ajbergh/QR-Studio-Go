package backend

import (
	"context"
	"fmt"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"qr-studio/backend/database"
	"qr-studio/backend/services"
)

// Runtime owns the application lifecycle. It intentionally separates lifecycle
// methods from the object bound to the Wails webview so only the curated
// DesktopAPI surface is exposed to JavaScript.
type Runtime struct {
	mu sync.RWMutex

	ctx context.Context
	db  *database.Database

	templateService *services.TemplateService
	settingsService *services.SettingsService
	exportService   *services.ExportService
	historyService  *services.HistoryService

	startupErr error
	api        *DesktopAPI
}

func NewRuntime() *Runtime {
	r := &Runtime{}
	r.api = &DesktopAPI{runtime: r}
	return r
}

func (r *Runtime) API() *DesktopAPI { return r.api }

func (r *Runtime) Startup(ctx context.Context) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.ctx = ctx
	r.startupErr = nil

	db, err := database.NewDatabaseHardened()
	if err != nil {
		r.startupErr = fmt.Errorf("database initialization failed: %w", err)
		runtime.LogError(ctx, r.startupErr.Error())
		return
	}

	if err := db.Migrate(); err != nil {
		_ = db.Close()
		r.startupErr = fmt.Errorf("database migration failed: %w", err)
		runtime.LogError(ctx, r.startupErr.Error())
		return
	}

	r.db = db
	r.templateService = services.NewTemplateService(db)
	r.settingsService = services.NewSettingsService(db)
	r.exportService = services.NewExportService(ctx)
	r.historyService = services.NewHistoryService(db)

	runtime.LogInfo(ctx, "QR Studio secure runtime initialized")
}

func (r *Runtime) DomReady(ctx context.Context) {
	runtime.LogInfo(ctx, "QR Studio frontend ready")
}

func (r *Runtime) BeforeClose(context.Context) bool { return false }

func (r *Runtime) Shutdown(ctx context.Context) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.db != nil {
		if err := r.db.Close(); err != nil {
			runtime.LogError(ctx, fmt.Sprintf("database close failed: %v", err))
		}
		r.db = nil
	}
}

func (r *Runtime) ready() error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.startupErr != nil {
		return r.startupErr
	}
	if r.db == nil || r.templateService == nil || r.settingsService == nil || r.exportService == nil || r.historyService == nil {
		return fmt.Errorf("desktop runtime is not initialized")
	}
	return nil
}
