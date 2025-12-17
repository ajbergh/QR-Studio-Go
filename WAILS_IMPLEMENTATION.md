# QR Studio - Wails + Go Backend Implementation Plan

> **Status:** ✅ Phase 5 Complete  
> **Target:** Windows Desktop Application with React Frontend + Go Backend + SQLite
> **Last Updated:** 2025-12-16

---

## Overview

This document tracks the implementation steps for refactoring QR Studio from a pure client-side React web app to a native Windows desktop application using [Wails](https://wails.io/).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     QR STUDIO (Wails)                       │
├─────────────────────────────────────────────────────────────┤
│   ┌───────────────────────────────────────────────────┐    │
│   │           REACT FRONTEND                           │    │
│   │  • Existing UI components (preserved)             │    │
│   │  • qr-code-styling for QR generation              │    │
│   │  • Wails runtime for backend calls                │    │
│   └───────────────────────────────────────────────────┘    │
│                            │                                │
│                     Wails IPC Bridge                        │
│                            │                                │
│   ┌───────────────────────────────────────────────────┐    │
│   │              GO BACKEND                            │    │
│   │  • SQLite database                                 │    │
│   │  • Template management                            │    │
│   │  • User settings persistence                      │    │
│   │  • Native file dialogs                            │    │
│   │  • Export handlers                                │    │
│   └───────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Project Setup ✅ COMPLETED (2025-12-16)
> Initialize Wails project structure alongside existing React frontend

- [x] **1.1** Install Wails CLI - Already installed (v2.10.2)
- [x] **1.2** Initialize Go module (`go mod init qr-studio`)
- [x] **1.3** Create `backend/` folder structure:
  ```
  backend/
  ├── app.go              # Main Wails app struct with lifecycle hooks
  ├── database/
  │   ├── db.go           # SQLite connection with WAL mode
  │   ├── migrations.go   # Schema migrations (5 migrations defined)
  │   └── models.go       # Template, Setting, HistoryEntry structs
  └── services/
      ├── templates.go    # Full CRUD + import/export
      ├── settings.go     # User preferences with defaults
      ├── export.go       # Native file dialogs + file I/O
      └── history.go      # Generation history tracking
  ```
- [x] **1.4** Configure `wails.json` for Wails build
- [x] **1.5** Update `vite.config.ts` for Wails compatibility
- [x] **1.6** Add Go dependencies: Wails v2.11.0, modernc.org/sqlite v1.40.1
- [x] **1.7** Update `package.json` with Wails-specific scripts
- [x] **1.8** Fix index.html for proper Vite bundling (removed importmap)
- [x] **1.9** Verify Go compilation successful
- [x] **1.10** Verify frontend build successful (1696 modules bundled)

**Files Created:**
- `main.go` - Wails application entry point
- `backend/app.go` - App struct with lifecycle management
- `backend/database/db.go` - SQLite connection manager
- `backend/database/migrations.go` - Database schema migrations
- `backend/database/models.go` - Data models (Template, Setting, HistoryEntry)
- `backend/services/templates.go` - Template CRUD service
- `backend/services/settings.go` - Settings service with defaults
- `backend/services/export.go` - File export and native dialogs
- `backend/services/history.go` - Generation history tracking
- `wails.json` - Wails configuration

**Files Modified:**
- `vite.config.ts` - Added Wails build support
- `package.json` - Added version 1.0.0, Wails build scripts
- `index.html` - Added script entry point, removed importmap
- `go.mod` - Added dependencies

### Phase 2: Database Layer ⬜
> Implement SQLite database with schema and basic operations

- [x] **2.1** Create SQLite database file location handling (app data folder) ✅ In db.go
- [x] **2.2** Implement database connection with auto-creation ✅ In db.go
- [x] **2.3** Create schema migrations ✅ In migrations.go:
  ```sql
  -- settings table
  CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- templates table
  CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      logo_data BLOB,
      background_data BLOB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- history table (optional)
  CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id TEXT,
      data_type TEXT,
      data_content TEXT,
      exported_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [x] **2.4** Implement Go models matching TypeScript `QRSettings` ✅ In models.go
- [x] **2.5** Add database initialization on app startup ✅ In app.go Startup()

**Note:** Phase 2 was implemented as part of Phase 1 to provide a complete foundation.

### Phase 3: Backend Services ✅ COMPLETED (2025-12-16)
> Create Go services for template and settings management

- [x] **3.1** Implement `TemplateService` (templates.go):
  - [x] `GetAllTemplates() ([]TemplateListItem, error)`
  - [x] `GetTemplate(id string) (*Template, error)`
  - [x] `SaveTemplate(template Template) (*Template, error)`
  - [x] `DeleteTemplate(id string) error`
  - [x] `ImportTemplates(json string) (int, error)`
  - [x] `ExportTemplates() (string, error)`
  - [x] `GetTemplateCount() (int, error)`
- [x] **3.2** Implement `SettingsService` (settings.go):
  - [x] `GetSetting(key string) (string, error)`
  - [x] `SetSetting(key, value string) error`
  - [x] `GetAllSettings() (map[string]string, error)`
  - [x] `GetSettingBool(key string) (bool, error)`
  - [x] `GetSettingInt(key string) (int, error)`
  - [x] `DeleteSetting(key string) error`
  - [x] `ResetToDefaults() error`
- [x] **3.3** Implement `ExportService` (export.go):
  - [x] `ShowSaveDialog(defaultFilename string, filters []FileFilter) (string, error)`
  - [x] `ShowOpenDialog(filters []FileFilter) (string, error)`
  - [x] `ShowDirectoryDialog() (string, error)`
  - [x] `SaveFile(path string, data []byte) error`
  - [x] `ReadFile(path string) ([]byte, error)`
  - [x] `GetAppDataPath() (string, error)`
  - [x] `GetDesktopPath() (string, error)`
  - [x] `GetImageFilters() []FileFilter`
- [x] **3.4** Implement `HistoryService` (history.go):
  - [x] `AddHistoryEntry(entry HistoryEntry) (*HistoryEntry, error)`
  - [x] `GetHistory(limit int) ([]HistoryEntry, error)`
  - [x] `GetHistoryByTemplate(templateId string, limit int) ([]HistoryEntry, error)`
  - [x] `ClearHistory() (int, error)`
  - [x] `GetHistoryStats() (*HistoryStats, error)`
- [x] **3.5** Bind services to Wails app struct ✅ In app.go

**Note:** Phase 3 was implemented as part of Phase 1 to provide a complete backend.

### Phase 4: Frontend Storage Abstraction ✅ COMPLETED (2025-12-16)
> Create abstraction layer to support both web (localStorage) and desktop (Wails) modes

- [x] **4.1** Create `services/storage.ts` with interface:
  ```typescript
  interface IStorageService {
    getTemplates(): Promise<QRSettings[]>;
    saveTemplate(template: QRSettings): Promise<void>;
    deleteTemplate(id: string): Promise<void>;
    importTemplates(data: string): Promise<number>;
    exportTemplates(): Promise<string>;
    getSetting(key: string): Promise<string | null>;
    setSetting(key: string, value: string): Promise<void>;
  }
  ```
- [x] **4.2** Implement `LocalStorageService` (services/localStorage.ts)
- [x] **4.3** Implement `WailsStorageService` (services/wailsStorage.ts)
- [x] **4.4** Create `getStorageService()` factory with runtime detection (services/index.ts)
- [x] **4.5** Add Wails runtime type declarations (`wailsjs/runtime/` and `wailsjs/go/backend/`)
- [x] **4.6** Refactor `QRControls.tsx` to use storage abstraction
- [x] **4.7** Verify frontend build successful (1700 modules bundled)

**Files Created:**
- `services/storage.ts` - IStorageService interface and constants
- `services/localStorage.ts` - Browser localStorage implementation
- `services/wailsStorage.ts` - Wails backend implementation
- `services/index.ts` - Factory and exports
- `wailsjs/go/backend/App.d.ts` - TypeScript declarations for Go bindings
- `wailsjs/go/backend/App.js` - JavaScript stubs for browser mode
- `wailsjs/runtime/runtime.d.ts` - Wails runtime type declarations
- `wailsjs/runtime/runtime.js` - Wails runtime stubs for browser mode

**Files Modified:**
- `components/QRControls.tsx` - Uses storage abstraction, async operations

### Phase 5: Frontend Migration ✅ COMPLETED (2025-12-16)
> Update React components to use storage abstraction

- [x] **5.1** Refactor `QRControls.tsx`: ✅ Completed in Phase 4
  - [x] Replace `localStorage.getItem` with `storageService.getTemplates()`
  - [x] Replace `localStorage.setItem` with `storageService.saveTemplate()`
  - [x] Update import/export to use service methods
- [x] **5.2** Create `SettingsContext` for user preferences:
  - [x] Theme preference (light/dark/system)
  - [x] Default export format (PNG/JPEG/SVG/WEBP)
  - [x] Default QR size
  - [x] Default error correction level
  - [x] Auto-save and show history toggles
  - [x] Window size/position (desktop only)
- [x] **5.3** Update `App.tsx` to load settings on startup
  - [x] Wrap with SettingsProvider
  - [x] Theme management with system preference detection
  - [x] Theme cycling button (system → light → dark)
  - [x] Settings panel integration
- [x] **5.4** Add native file dialog integration for export (desktop mode)
  - [x] Created `services/fileExport.ts` with downloadFile, showSaveDialog, showOpenDialog
  - [x] History tracking for exports in desktop mode

**Files Created:**
- `contexts/SettingsContext.tsx` - Settings context with useSettings hook
- `components/SettingsPanel.tsx` - Settings modal panel UI
- `services/fileExport.ts` - File export service with native dialog support

**Files Modified:**
- `App.tsx` - SettingsProvider wrapper, theme management, settings button
- `services/storage.ts` - Added SETTING_KEYS constant
- `services/index.ts` - Export fileExport utilities

### Phase 6: Native Features ✅
> Implement Windows-specific functionality

- [x] **6.1** Native save dialogs for QR export ✅ (services/fileExport.ts)
- [x] **6.2** Native open dialogs for image upload (logo/background) ✅ (openImageDialog in fileExport.ts)
- [ ] **6.3** System tray integration (optional - deferred)
- [x] **6.4** Window state persistence (size, position) ✅ (hooks/useWindowState.ts)
- [x] **6.5** Keyboard shortcuts (Ctrl+S to save, etc.) ✅ (hooks/useKeyboardShortcuts.ts)
- [ ] **6.6** Drag and drop support for images (optional - deferred)

**Files Created:**
- `hooks/useKeyboardShortcuts.ts` - Global keyboard shortcut handler with SHORTCUTS constant
- `hooks/useWindowState.ts` - Window state persistence with toggleMaximize/toggleFullscreen
- `hooks/index.ts` - Hook exports

**Files Modified:**
- `services/fileExport.ts` - Added openImageDialog for native image selection
- `App.tsx` - Integrated keyboard shortcuts (Ctrl+,, Escape), maximize button for desktop

### Phase 7: Build & Distribution ✅
> Configure production builds and installer

- [x] **7.1** Configure Wails build for Windows: ✅
  - Updated wails.json with productName, version, copyright, company info
  - Added `frontend:dir` configuration for root-level frontend
  - Updated go.mod to use Wails v2.11.0
  ```json
  {
    "outputfilename": "QRStudio",
    "productName": "QR Studio",
    "productVersion": "1.0.0",
    "companyName": "QR Studio",
    "copyright": "Copyright © 2025 QR Studio Team"
  }
  ```
- [x] **7.2** Create application icon (`.ico` for Windows) ✅
  - build.ps1 generates appicon.png using .NET System.Drawing
  - Wails automatically converts to ICO format during build
- [x] **7.3** Test production build: `wails build` ✅
  - Created comprehensive `build.ps1` PowerShell script
  - Build output: `build/bin/QRStudio.exe` (13.83 MB)
  - Build time: ~35-45 seconds
- [ ] **7.4** Create NSIS or WiX installer (optional - deferred)
- [ ] **7.5** Set up GitHub Actions for automated builds (optional - deferred)

**Files Created:**
- `build.ps1` - Comprehensive Windows build script with icon generation, dependency management, and full Wails build
- `build/appicon.png` - Application icon (1024x1024 PNG, auto-generated)

**Files Modified:**
- `wails.json` - Added `frontend:dir`, verified build configuration
- `go.mod` - Updated to Wails v2.11.0 for compatibility
- `package.json` - Added cross-env for Windows environment variable support

### Phase 8: Migration & Compatibility ✅
> Handle migration from web version and maintain compatibility

- [x] **8.1** Create migration tool to import localStorage templates on first run ✅
  - Created `services/migration.ts` with full migration workflow
  - Auto-detects desktop mode and migrates templates on first launch
  - Integrated into App.tsx via `initMigration()` call
  - Tracks migration status in localStorage to prevent re-runs
- [x] **8.2** Maintain web build option (`npm run build:web`) ✅
  - Web build works independently: `cd frontend && npm run build:web`
  - Output: `frontend/dist/` (331.98 kB gzipped)
  - Preview available: `npm run preview`
- [x] **8.3** Document dual-mode configuration ✅
  - Updated README.md with comprehensive documentation
  - Storage abstraction explained
  - Keyboard shortcuts documented
  - Configuration options listed
- [x] **8.4** Version compatibility checks ✅
  - Created `services/version.ts` with semantic versioning utilities
  - Template and settings version compatibility checks
  - Migration support for version upgrades
  - Version metadata helpers for stored data

**Files Created:**
- `frontend/services/migration.ts` - Data migration from localStorage to SQLite
- `frontend/services/version.ts` - Version compatibility utilities

**Files Modified:**
- `frontend/services/index.ts` - Export migration and version utilities
- `frontend/App.tsx` - Integrated migration on first load
- `README.md` - Comprehensive dual-mode documentation

---

## File Structure (Current)

```
QR-Studio-Go/
├── .github/
│   └── copilot-instructions.md
├── backend/                    # Go backend ✅ CREATED
│   ├── app.go                  # Main Wails app struct
│   ├── database/
│   │   ├── db.go               # SQLite connection manager
│   │   ├── migrations.go       # Schema migrations
│   │   └── models.go           # Data models
│   └── services/
│       ├── templates.go        # Template CRUD
│       ├── settings.go         # Settings management
│       ├── export.go           # File operations
│       └── history.go          # History tracking
├── frontend/                   # ✅ React frontend (reorganized)
│   ├── components/             # React components
│   │   ├── QRControls.tsx      # Updated with storage abstraction
│   │   ├── QRPreview.tsx
│   │   ├── SettingsPanel.tsx   # User preferences panel
│   │   └── ui/                 # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── ColorPicker.tsx
│   │       ├── Input.tsx
│   │       ├── Slider.tsx
│   │       └── Tabs.tsx
│   ├── contexts/               # React contexts
│   │   └── SettingsContext.tsx # User settings context + provider
│   ├── hooks/                  # React hooks
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useWindowState.ts
│   │   └── index.ts
│   ├── services/               # Frontend services
│   │   ├── storage.ts          # Storage abstraction interface
│   │   ├── localStorage.ts     # Browser localStorage implementation
│   │   ├── wailsStorage.ts     # Wails backend implementation
│   │   ├── fileExport.ts       # File export with native dialogs
│   │   ├── migration.ts        # ✅ NEW - Data migration from localStorage
│   │   ├── version.ts          # ✅ NEW - Version compatibility utilities
│   │   └── index.ts            # Factory and exports
│   ├── wailsjs/                # Wails bindings
│   │   ├── go/backend/
│   │   │   ├── App.d.ts        # TypeScript declarations
│   │   │   └── App.js          # JavaScript stubs
│   │   └── runtime/
│   │       ├── runtime.d.ts
│   │       └── runtime.js
│   ├── dist/                   # Vite build output
│   ├── node_modules/           # npm packages
│   ├── App.tsx                 # Main application component
│   ├── index.tsx               # React entry point
│   ├── index.html              # HTML template
│   ├── types.ts                # TypeScript type definitions
│   ├── package.json            # npm configuration
│   ├── package-lock.json
│   ├── tsconfig.json           # TypeScript configuration
│   └── vite.config.ts          # Vite build configuration
├── build/                      # Build output directory
│   ├── appicon.png             # Application icon (auto-generated)
│   └── bin/
│       └── QRStudio.exe        # Windows executable (13.83 MB)
├── go.mod                      # Go module definition
├── go.sum                      # Go module checksums
├── main.go                     # Wails entry point
├── wails.json                  # Wails configuration
├── build.ps1                   # Windows build script
├── README.md
└── WAILS_IMPLEMENTATION.md     # This file
```

---

## Dependencies

### Go Backend
| Package | Purpose |
|---------|---------|
| `github.com/wailsapp/wails/v2` | Desktop app framework (v2.11.0) |
| `modernc.org/sqlite` | Pure Go SQLite driver (CGO-free) |

### Frontend (Existing)
| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | UI framework |
| `qr-code-styling` | QR code generation |
| `lucide-react` | Icons |
| `vite` | Build tool |
| `cross-env` | Cross-platform environment variables |

---

## Commands Reference

```bash
# Development
wails dev                    # Run in dev mode with hot reload
npm run dev                  # Web-only development (existing)

# Build
wails build                  # Build production Windows executable
wails build -clean           # Clean build
npm run build                # Web-only build
npm run build:wails          # Frontend build for Wails (sets WAILS_BUILD=true)

# Go commands
go build .                   # Verify Go compilation
go mod tidy                  # Tidy dependencies

# Testing
npm run preview              # Preview production web build
```

---

## Notes & Decisions

| Decision | Rationale |
|----------|-----------|
| Use `modernc.org/sqlite` | Pure Go, no CGO required, simpler Windows builds |
| Keep qr-code-styling client-side | Already works well, no need to move to Go |
| Storage abstraction layer | Allows maintaining both web and desktop builds |
| SQLite for persistence | Robust, portable, handles images as BLOBs efficiently |
| Keep frontend at root | Less disruption, Wails works with root-level frontend |
| Remove importmap from index.html | Required for proper Vite bundling |

---

## Progress Log

| Date | Phase | Notes |
|------|-------|-------|
| 2025-12-16 | 1-3 | ✅ Complete project setup: Go module, Wails config, backend structure, all services, database layer |
| 2025-12-16 | 4 | ✅ Storage abstraction: IStorageService interface, LocalStorageService, WailsStorageService, Wails type stubs |
| 2025-12-16 | 5.1 | ✅ Refactored QRControls.tsx to use storage abstraction |
| 2025-12-16 | 5.2-5.4 | ✅ SettingsContext, SettingsPanel, App.tsx updates, fileExport service |
| 2025-12-16 | 6 | ✅ Native features: keyboard shortcuts (Ctrl+,, Escape), window state hooks, maximize button, openImageDialog |
| 2025-12-16 | 7.1-7.3 | ✅ Build & Distribution: wails.json config, build.ps1 script with icon generation, successful Windows build (13.83 MB) |
| 2025-12-16 | Refactor | ✅ Reorganized frontend into /frontend directory, updated main.go embed paths, wails.json, build.ps1 |
| 2025-12-16 | 8 | ✅ Migration & Compatibility: migration.ts, version.ts, README.md update, web build verified |

---

## 🎉 IMPLEMENTATION COMPLETE

All 8 phases have been successfully implemented:

- ✅ **Phase 1-3**: Project setup, database layer, backend services
- ✅ **Phase 4**: Frontend storage abstraction
- ✅ **Phase 5**: Frontend migration (settings, file export)
- ✅ **Phase 6**: Native features (keyboard shortcuts, window state)
- ✅ **Phase 7**: Build & distribution (build.ps1, Windows executable)
- ✅ **Phase 8**: Migration & compatibility (version checks, documentation)

**Optional Enhancements (for future consideration):**
- Phase 7.4: Create NSIS/WiX installer
- Phase 7.5: GitHub Actions for CI/CD
- Phase 6.3: System tray integration
- Phase 6.6: Drag and drop support

## Quick Start

### Development Mode
```powershell
wails dev              # Hot-reload development server
```

### Production Build
```powershell
.\build.ps1            # Full Windows build (icon + deps + executable)
.\build.ps1 -Clean     # Clean build directories first
.\build.ps1 -DevMode   # Start dev server via script
```

### Web-Only Build
```powershell
cd frontend
npm run build:web      # Standard Vite web build
npm run preview        # Preview production build
```

---

## Resources
- [Wails v2 Examples](https://github.com/wailsapp/wails/tree/master/v2/examples)
- [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite)
- [React + Wails Best Practices](https://wails.io/docs/guides/frontend)
