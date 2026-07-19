<p align="center">
  <img src="assets/banner.svg" alt="QR Studio banner showing a live QR preview, design controls, and export options" width="100%" />
</p>

# QR Studio

QR Studio is a local-first professional QR code generator for the web and native
Windows, macOS, and Linux desktops. The shared React and TypeScript frontend uses
browser storage in web mode and a curated Go/Wails API with SQLite in desktop
mode.

## Capabilities

- URL, text, email, Wi-Fi, vCard, calendar-event, and geographic QR payloads.
- Standards-aware escaping and validation for Wi-Fi, vCard, iCalendar, and geo
  payloads.
- Dot, finder, color, gradient, logo, background, frame, quiet-zone, size, and
  error-correction controls.
- Live scan-reliability warnings for low contrast, small quiet zones, oversized
  logos, and background-image risk.
- PNG, JPEG, WebP, and SVG export, including framed output and multi-size PNG
  export.
- Clipboard copy, printing, local gallery snapshots, reusable designs, and
  versioned design-package import/export.
- Verified migration from legacy browser design formats to desktop SQLite.
- Optional redacted desktop export history that excludes raw payloads, Wi-Fi
  credentials, and absolute file paths.

## Requirements

### Web development

- Node.js 22+
- npm

### Desktop development

- Go version declared in `go.mod`
- Node.js 22+
- Wails CLI v2.11
- Native platform dependencies required by Wails

Install Wails:

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0
```

## Development

Web mode:

```powershell
cd frontend
npm ci
npm test
npm run dev
```

Desktop mode from the repository root:

```powershell
wails dev
```

The development server binds to `127.0.0.1:3000` rather than all network
interfaces.

## Validation

```powershell
cd frontend
npm test
npm run build:web
npm run test:e2e -- --project=chromium
cd ..
go test ./...
go vet ./...
```

The test suite covers payload escaping and validation, real PNG output, design
persistence, invalid-content blocking, template image preservation, duplicate
handling, and transactional import reporting. CI also performs dependency audits,
Go vulnerability checks, and a Windows Wails build.

## Production builds

```powershell
# Web static build
.\scripts\build-web.ps1 -Clean

# Windows
.\scripts\build-wails-windows.ps1 -Architecture amd64 -Clean
.\scripts\build-wails-windows.ps1 -Architecture all -Clean

# macOS — run on macOS
.\scripts\build-wails-macos.ps1 -Architecture universal -Clean

# Linux — run on Linux
.\scripts\build-wails-linux.ps1 -Architecture amd64 -Clean
```

Build scripts use `npm ci`, `go mod download`, and `go mod verify`; they do not
rewrite dependency metadata. Multi-architecture outputs are staged separately
and accompanied by SHA-256 checksums.

## Architecture

```text
backend/
  database/                 SQLite connection and versioned migrations
  services/                 Templates, settings, exports, and redacted history
  runtime.go                Strict lifecycle and startup recovery boundary
  desktop_api.go            Intent-specific Wails API
  template_document_api.go  Explicit base64 image transport

frontend/
  components/v2/            Focused editor, preview, library, and preferences UI
  domain/                    QR payloads, defaults, and design-package schemas
  services/remediatedPlatform.ts
                            Browser/desktop persistence and export adapter
  tests/                     Domain unit tests
  e2e/                       Playwright workflow and artifact tests
```

The Wails webview is bound only to `DesktopAPI`. Generic arbitrary-path file
read/write methods are not exposed to JavaScript. Native import and export use
user-selected dialogs, type and size validation, and atomic writes.

## Data storage and migration

- Browser mode stores designs and preferences in local storage.
- Desktop mode stores designs and settings in the operating system's application
  data directory using SQLite.
- Legacy raw `QRSettings[]` records and nested legacy design records are both
  recognized during migration.
- Migration is marked complete only after destination counts are verified and no
  records fail.
- Database schema version 6 adds missing defaults and redacts legacy export
  payloads and paths.

Export a design package before clearing browser or application data.

## Security and contribution guidance

- [Security policy](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
- [MIT license](LICENSE)

## Release status

The `1.1.0` line is the stabilization and security-hardening release. It replaces
the original broad Wails binding, unifies export behavior, fixes image-preserving
design operations, repairs browser-to-desktop migration, makes preferences
functional, and adds reproducible validation and packaging.
