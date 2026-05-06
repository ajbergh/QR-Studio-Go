# Copilot Instructions — QR Studio (qr-studio)

Short, actionable instructions to help AI agents be productive in this repo.

## Quick summary
- React + TypeScript frontend with Go/Wails backend for desktop (Windows, macOS, Linux).
- Dual-mode: runs as browser-based web app or native desktop application via Wails.
- QR generation uses `qr-code-styling` library on the frontend.
- Storage: localStorage (web) or SQLite database (desktop).
- E2E tests: Playwright (`frontend/e2e/`).

## Project Architecture

```
QR-Studio-Go/
├── backend/              # Go backend (Wails bindings)
│   ├── app.go            # Main app struct with lifecycle hooks
│   ├── database/         # SQLite database layer
│   └── services/         # Template, settings, export, history services
├── frontend/             # React + TypeScript frontend
│   ├── components/       # React components (QRControls, QRPreview, etc.)
│   ├── contexts/         # React contexts (SettingsContext)
│   ├── hooks/            # Custom hooks (keyboard shortcuts, window state)
│   ├── services/         # Storage abstraction, migration, file export
│   ├── e2e/              # Playwright E2E tests
│   └── wailsjs/          # Wails-generated TypeScript bindings
├── scripts/              # Build & dev scripts (PS1)
│   ├── build-wails-windows.ps1
│   ├── build-wails-macos.ps1
│   ├── build-wails-linux.ps1
│   ├── build-web.ps1
│   └── dev-backend.ps1
├── build/                # Build output (executables)
├── docs_internal/        # Architecture and roadmap docs
├── main.go               # Wails entry point
└── wails.json            # Wails configuration
```

## Key files & where to look

### Go Backend
- Entry point: `main.go` — Wails app configuration, embeds frontend/dist
- App lifecycle: `backend/app.go` — Startup, DomReady, Shutdown, BeforeClose hooks
- Database: `backend/database/db.go` — SQLite connection manager (WAL mode)
- Models: `backend/database/models.go` — Template, Setting, HistoryEntry structs
- Services: `backend/services/*.go` — Template, settings, export, history CRUD

### React Frontend (in `/frontend`)
- App entry: `index.tsx`, `App.tsx` — global state, settings provider, migration
- Types: `types.ts` — QRSettings, FrameStyle, DotType, etc.
- Controls: `components/QRControls.tsx` — content, design, colors, templates
- Preview: `components/QRPreview.tsx` — live QR preview, export, clipboard
- Settings: `components/SettingsPanel.tsx` — user preferences modal
- UI primitives: `components/ui/*` — Button, Input, Slider, ColorPicker, Tabs

### Services (in `/frontend/services`)
- Storage abstraction: `storage.ts` — IStorageService interface
- localStorage: `localStorage.ts` — browser storage implementation
- Wails storage: `wailsStorage.ts` — SQLite via Wails bindings
- Migration: `migration.ts` — migrate localStorage → SQLite on first desktop run
- Version: `version.ts` — compatibility checks, semantic versioning
- File export: `fileExport.ts` — native dialogs, file operations

## Dev workflow ⚙️

### Web Development
```powershell
cd frontend
npm install
npm run dev     # Vite dev server at localhost:3000
```

### Desktop Development
```powershell
wails dev       # Hot-reload desktop app (Wails manages Vite internally)

# Or run Vite and the Go backend in separate terminals:
cd frontend; npm run dev                                     # Terminal 1
.\scripts\dev-backend.ps1 -ViteUrl http://localhost:3000     # Terminal 2
```

### Production Builds
```powershell
# Desktop
.\scripts\build-wails-windows.ps1                   # Windows x64
.\scripts\build-wails-windows.ps1 -Architecture all # Windows x64 + ARM64
.\scripts\build-wails-macos.ps1                     # macOS Universal
.\scripts\build-wails-linux.ps1                     # Linux x64

# Web only
.\scripts\build-web.ps1     # Output: frontend/dist/
```

## Important patterns & conventions 🔧

### State Management
- `App.tsx` holds `settings: QRSettings` and passes `updateSettings(newPartial)`
- Shallow merge at top level; for nested objects, spread the existing:
  ```typescript
  updateSettings({ wifiOptions: { ...settings.wifiOptions, ssid: 'x' } })
  ```

### Storage Abstraction
- Use `getStorageService()` factory — returns correct implementation automatically
- Never access localStorage/Wails directly from components
  ```typescript
  import { getStorageService } from './services';
  const storage = getStorageService();
  const templates = await storage.getTemplates();
  ```

### Desktop Detection
```typescript
import { isDesktopMode } from './services';
if (isDesktopMode()) {
  // Use native features
}
```

### Wails Backend Calls
- Backend methods exposed via `wailsjs/go/backend/App.ts`
- All calls are async (Promise-based IPC)
  ```typescript
  import { SaveTemplate } from '../wailsjs/go/backend/App';
  await SaveTemplate(id, name, settingsJson);
  ```

### Adding Go Backend Methods
1. Add method to `backend/app.go` or a service file
2. Run `wails generate module` or `wails dev` to update bindings
3. Import from `wailsjs/go/backend/App` in TypeScript

### Adding Frontend Features
1. Add types to `frontend/types.ts`
2. Add UI controls to `frontend/components/QRControls.tsx`
3. Update `frontend/components/QRPreview.tsx` if affects rendering
4. Test both web and desktop modes

## Examples & snippets 💡

### Storage Service Usage
```typescript
const storage = getStorageService();

// Get all templates
const templates = await storage.getTemplates();

// Save template
await storage.saveTemplate(id, name, settings);

// Get/set settings
await storage.saveSetting('theme', 'dark');
const theme = await storage.getSetting('theme', 'system');
```

### Native File Dialog (Desktop)
```typescript
import { showSaveDialog, saveToPath } from './services';

const path = await showSaveDialog({
  title: 'Export QR Code',
  filters: [{ name: 'PNG Images', extensions: ['png'] }]
});
if (path) {
  await saveToPath(path, dataUrl);
}
```

### Keyboard Shortcuts
```typescript
import { useKeyboardShortcuts, SHORTCUTS } from './hooks';

const { registerShortcut } = useKeyboardShortcuts();
registerShortcut('save', SHORTCUTS.SAVE, handleSave);
```

## Common pitfalls ⚠️

### Storage
- Web: localStorage has ~5-10MB quota; large Base64 images may fail
- Desktop: SQLite has no practical limit; images stored as BLOBs
- Always use storage abstraction, never raw localStorage in new code

### Wails IPC
- All backend calls are async — always await
- Backend panics crash the app — use error returns, not panics
- Frontend/backend versions must match — rebuild after Go changes

### Build Issues
- `WAILS_BUILD=true` environment variable needed for Wails builds
- Frontend embed path: `all:frontend/dist` in main.go
- Run `go mod tidy` after changing Go dependencies

### Cross-Platform
- `cross-env` npm package handles environment variables (Windows vs Unix)
- Build script uses PowerShell-specific features (Windows only)
- Go backend uses `os.UserConfigDir()` for portable paths

## Tests & CI
- E2E tests: Playwright (`frontend/e2e/`) — smoke tests + QR generation tests
- Run tests: `cd frontend && npm run test:e2e` (auto-starts Vite)
- UI mode: `npm run test:e2e:ui`
- Headed: `npm run test:e2e:headed`
- Config: `frontend/playwright.config.ts` (Chromium, Firefox, WebKit, Mobile Chrome)
- Always test both web mode (`npm run dev`) and desktop mode (`wails dev`)
- Verify: template save/load, export (PNG/JPEG/SVG), clipboard, settings

## Database

SQLite database at `%APPDATA%\QRStudio\qr-studio.db`:

| Table | Purpose |
|-------|---------|
| `templates` | Saved QR templates (id, name, settings JSON, preview BLOB) |
| `settings` | User preferences (key-value) |
| `history` | Export history with timestamps |
| `_migrations` | Schema version tracking |

## Quick Reference

| Command | Description |
|---------|-------------|
| `wails dev` | Desktop hot-reload (Wails manages Vite) |
| `cd frontend; npm run dev` | Web-only Vite dev server (localhost:3000) |
| `.\scripts\dev-backend.ps1` | Go backend only (use with external Vite) |
| `.\scripts\build-wails-windows.ps1` | Build Windows desktop executable |
| `.\scripts\build-wails-macos.ps1` | Build macOS desktop app |
| `.\scripts\build-wails-linux.ps1` | Build Linux desktop executable |
| `.\scripts\build-web.ps1` | Build browser-based web app |
| `cd frontend && npm run test:e2e` | Run Playwright E2E tests |
| `go mod tidy` | Update Go dependencies |

---
See [docs_internal/WAILS_IMPLEMENTATION.md](../docs_internal/WAILS_IMPLEMENTATION.md) for detailed implementation notes.
