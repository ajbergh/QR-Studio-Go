# QR Studio

Professional QR code generator built with React + TypeScript and a Go/Wails backend. Runs as a browser-based web app **or** as a native desktop application on Windows, macOS, and Linux.

---

## 🚀 Quick Start

### Prerequisites

**Web mode only:**
- Node.js 18+ and npm

**Desktop mode (all platforms):**
- Go 1.25+
- Node.js 18+ and npm
- Wails CLI v2.11+
  ```
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```

### Web Development

```powershell
cd frontend
npm install
npm run dev     # Vite dev server at http://localhost:3000
```

### Desktop Development

```powershell
# Full hot-reload (Wails manages the Vite dev server automatically)
wails dev

# Or: start Vite and the Go backend separately
cd frontend; npm run dev                                       # Terminal 1 — Vite at :3000
.\scripts\dev-backend.ps1 -ViteUrl http://localhost:3000       # Terminal 2 — Go backend
```

### Production Builds

**Desktop:**
```powershell
.\scripts\build-wails-windows.ps1                          # Windows x64
.\scripts\build-wails-windows.ps1 -Architecture arm64     # Windows ARM64
.\scripts\build-wails-windows.ps1 -Architecture all       # Both Windows arches

.\scripts\build-wails-macos.ps1                            # macOS Universal (Intel + Apple Silicon)
.\scripts\build-wails-macos.ps1 -Architecture arm64       # Apple Silicon only
.\scripts\build-wails-macos.ps1 -Architecture amd64       # Intel only

.\scripts\build-wails-linux.ps1                            # Linux x64
.\scripts\build-wails-linux.ps1 -Architecture arm64       # Linux ARM64
.\scripts\build-wails-linux.ps1 -Architecture all         # Both Linux arches
```

All desktop scripts accept `-Clean` and `-SkipDeps` flags.

**Web:**
```powershell
.\scripts\build-web.ps1           # Build static site → frontend/dist/
.\scripts\build-web.ps1 -Clean   # Clean dist first, then build
```

---

## 📁 Project Structure

```
QR-Studio-Go/
├── backend/                  # Go backend
│   ├── app.go                # Wails App struct + lifecycle hooks
│   ├── database/
│   │   ├── db.go             # SQLite connection manager (WAL mode)
│   │   ├── migrations.go     # Schema migrations
│   │   └── models.go         # Template, Setting, HistoryEntry structs
│   └── services/
│       ├── templates.go      # Template CRUD
│       ├── settings.go       # User settings persistence
│       ├── export.go         # File export + native dialogs
│       └── history.go        # Export history tracking
├── frontend/                 # React + TypeScript frontend
│   ├── App.tsx               # Root component, global QRSettings state
│   ├── index.tsx             # Entry point
│   ├── types.ts              # QRSettings, DotType, FrameStyle, etc.
│   ├── components/
│   │   ├── QRControls.tsx    # Content, design, color, template controls
│   │   ├── QRPreview.tsx     # Live QR preview + export
│   │   ├── SettingsPanel.tsx # User preferences modal
│   │   └── ui/               # Button, Input, Slider, ColorPicker, Tabs
│   ├── contexts/
│   │   └── SettingsContext.tsx
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useWindowState.ts
│   ├── services/
│   │   ├── storage.ts        # IStorageService interface + factory
│   │   ├── localStorage.ts   # Web localStorage implementation
│   │   ├── wailsStorage.ts   # Desktop SQLite via Wails bindings
│   │   ├── migration.ts      # localStorage → SQLite migration
│   │   ├── fileExport.ts     # Native dialogs + file operations
│   │   └── version.ts        # Semantic versioning + compat checks
│   └── wailsjs/              # Wails-generated TypeScript bindings
├── scripts/                  # Build and dev scripts
│   ├── build-wails-windows.ps1
│   ├── build-wails-macos.ps1
│   ├── build-wails-linux.ps1
│   ├── build-web.ps1
│   ├── dev-backend.ps1       # Start backend only (use with external Vite)
│   └── build.ps1             # Legacy Windows build script
├── build/                    # Build output (generated)
│   └── bin/                  # Compiled executables
├── docs_internal/            # Internal documentation
│   ├── WAILS_IMPLEMENTATION.md
│   └── ROADMAP.md
├── main.go                   # Wails entry point
├── go.mod                    # Go module (go 1.25, wails v2.11)
└── wails.json                # Wails configuration
```

---

## 🔧 Dual-Mode Architecture

QR Studio shares the same React frontend across both modes — the storage layer and file-export layer adapt automatically.

### Web Mode (Browser)
- Storage: `localStorage`
- File export: Browser download API
- Limitation: ~5–10 MB storage quota, no native file dialogs

### Desktop Mode (Wails)
- Storage: SQLite at `%APPDATA%\QRStudio\qr-studio.db` (Windows) / OS-equivalent path
- File export: Native OS dialogs
- Extras: Unlimited storage, keyboard shortcuts, window state persistence

### Storage Abstraction

Always access storage through the factory — never touch `localStorage` or Wails IPC directly in components:

```typescript
import { getStorageService } from './services';

const storage = getStorageService();
const templates = await storage.getTemplates();
await storage.saveTemplate(id, name, settings);
await storage.saveSetting('theme', 'dark');
const theme  = await storage.getSetting('theme', 'system');
```

### First-Run Migration (Desktop)

On the first desktop launch, any templates saved in `localStorage` are automatically migrated to SQLite:

```typescript
import { initMigration } from './services';

// Called once in App.tsx on mount
const result = await initMigration();
```

---

## QR Content Types

| Type | Fields |
|------|--------|
| URL / Text / Email | Free-form text |
| Wi-Fi | SSID, password, encryption (WEP/WPA/none), hidden |
| vCard | Name, phone, mobile, email, website, company, address |
| Calendar Event | Title, location, description, start/end time |
| Location | Latitude, longitude |

---

## ⌨️ Keyboard Shortcuts (Desktop)

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save template |
| `Ctrl+E` | Export QR code |
| `Ctrl+,` | Open settings |
| `Escape` | Close dialogs |

---

## 🗄️ Database (Desktop)

SQLite database — tables:

| Table | Purpose |
|-------|---------|
| `templates` | Saved QR templates (id, name, settings JSON, preview BLOB) |
| `settings` | Key-value user preferences |
| `history` | Export history with timestamps |
| `_migrations` | Schema version tracking |

---

## ⚙️ Configuration

**wails.json** key settings:
```json
{
  "frontend:build": "npm run build:wails",
  "outputfilename": "QRStudio",
  "info": {
    "productName": "QR Studio",
    "productVersion": "1.0.0"
  }
}
```

User settings stored in the database (desktop) or `localStorage` (web):

| Key | Values | Default |
|-----|--------|---------|
| `theme` | `light`, `dark`, `system` | `system` |
| `exportFormat` | `png`, `svg`, `jpeg` | `png` |
| `defaultSize` | 100–2000 | `1000` |
| `autoSave` | `true`, `false` | `false` |

---

## ⚠️ Known Limitations

- Frame export supports PNG/JPEG only (SVG frames not yet supported)
- Web mode storage capped at ~5–10 MB (browser `localStorage` quota)
- Clipboard copy may fail in insecure (non-HTTPS) contexts
- Cross-compiling for macOS or Linux requires the target platform's toolchain due to CGO (SQLite)

---

## 📚 Internal Documentation

- [docs_internal/WAILS_IMPLEMENTATION.md](docs_internal/WAILS_IMPLEMENTATION.md) — architecture decisions and implementation notes
- [docs_internal/ROADMAP.md](docs_internal/ROADMAP.md) — planned features and backlog

---

## Contributing

1. Create feature branches and open PRs against `main`
2. Test in both web mode (`npm run dev`) and desktop mode (`wails dev`)
3. Use the storage abstraction — never access `localStorage` or Wails IPC directly from components
4. Update `docs_internal/WAILS_IMPLEMENTATION.md` for significant architecture changes
