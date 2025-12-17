# QR Studio

Professional QR code generator with React + TypeScript frontend and optional Go/Wails desktop app. Supports both web browser and native Windows deployment.

---

## 🚀 Quick Start

### Prerequisites

**Web Mode:**
- Node.js (>=18) and npm

**Desktop Mode (Windows):**
- Go 1.21+
- Node.js 18+
- Wails CLI v2.11+ (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Web Development

```powershell
cd frontend
npm install
npm run dev     # Open at http://localhost:5173
```

### Desktop Development

```powershell
wails dev       # Hot-reload desktop app
```

### Production Builds

**Desktop (Windows):**
```powershell
.\build.ps1           # Full build with icon generation
.\build.ps1 -Clean    # Clean build directories first
# Output: build/bin/QRStudio.exe
```

**Web:**
```powershell
cd frontend
npm run build:web     # Output: frontend/dist/
npm run preview       # Preview production build
```

---

## 📁 Project Structure

```
QR-Studio-Go/
├── backend/                  # Go backend services
│   ├── app.go                # Wails app struct with lifecycle hooks
│   ├── database/             # SQLite database layer
│   │   ├── db.go             # Connection manager
│   │   ├── migrations.go     # Schema migrations
│   │   └── models.go         # Data models
│   └── services/             # Backend services
│       ├── templates.go      # Template CRUD
│       ├── settings.go       # User settings
│       ├── export.go         # File operations
│       └── history.go        # History tracking
├── frontend/                 # React frontend
│   ├── components/           # React components
│   │   ├── QRControls.tsx    # Settings controls
│   │   ├── QRPreview.tsx     # Live preview
│   │   ├── SettingsPanel.tsx # User preferences
│   │   └── ui/               # Reusable UI components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   ├── services/             # Frontend services
│   │   ├── storage.ts        # Storage abstraction
│   │   ├── localStorage.ts   # Web localStorage
│   │   ├── wailsStorage.ts   # Desktop SQLite
│   │   ├── migration.ts      # Data migration
│   │   └── fileExport.ts     # File export
│   └── wailsjs/              # Wails bindings
├── build/                    # Build output
│   └── bin/QRStudio.exe      # Windows executable
├── main.go                   # Wails entry point
├── wails.json                # Wails configuration
├── build.ps1                 # Windows build script
└── WAILS_IMPLEMENTATION.md   # Implementation details
```

---

## 🔧 Dual-Mode Architecture

QR Studio runs in two modes with the same React frontend:

### Web Mode (Browser)
- Storage: `localStorage` with `qr_studio_templates` key
- File export: Browser download API
- Limitations: ~5-10MB storage quota, no native file dialogs

### Desktop Mode (Wails)
- Storage: SQLite database at `%APPDATA%\QRStudio\qr-studio.db`
- File export: Native Windows dialogs
- Features: Unlimited storage, keyboard shortcuts, window state persistence

### Storage Abstraction

The frontend uses a unified storage interface:

```typescript
import { getStorageService } from './services';

const storage = getStorageService();
const templates = await storage.getTemplates();
await storage.saveTemplate(id, name, settings);
```

The factory automatically detects the runtime and returns the appropriate implementation.

### Migration (Desktop First Run)

When running the desktop app for the first time, templates from `localStorage` are automatically migrated to SQLite:

```typescript
import { initMigration } from './services';

// Called in App.tsx on mount
const result = await initMigration();
if (result?.templatesImported > 0) {
  console.log(`Migrated ${result.templatesImported} templates`);
}
```

---

## ⌨️ Keyboard Shortcuts (Desktop)

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save template |
| `Ctrl+E` | Export QR |
| `Ctrl+,` | Open settings |
| `Escape` | Close dialogs |

---

## 🔧 Configuration

### User Settings

Stored in SQLite (desktop) or localStorage (web):

| Setting | Options | Default |
|---------|---------|---------|
| Theme | `light`, `dark`, `system` | `system` |
| Export Format | `png`, `svg`, `jpeg` | `png` |
| Default QR Size | 100-2000px | 1000 |
| Auto Save | boolean | false |

### Build Configuration

**wails.json** - Desktop app settings:
```json
{
  "frontend:dir": "./frontend",
  "outputfilename": "QRStudio",
  "info": {
    "productName": "QR Studio",
    "productVersion": "1.0.0"
  }
}
```

---

## ⚠️ Known Limitations

- Frame export supports PNG/JPEG only (no SVG)
- Web mode storage limited to ~5-10MB
- Clipboard may fail in insecure contexts
- Windows-only desktop build (Linux/macOS possible with Wails)

---

## 📚 Documentation

See [WAILS_IMPLEMENTATION.md](WAILS_IMPLEMENTATION.md) for detailed implementation notes, progress tracking, and architecture decisions.

---

## Contributing

1. Create feature branches and open PRs
2. Focus on small, reversible commits
3. Test both web and desktop modes
4. Update WAILS_IMPLEMENTATION.md for significant changes
