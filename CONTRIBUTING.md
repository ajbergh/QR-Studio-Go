# Contributing to QR Studio

## Development requirements

- Node.js 22 or newer
- npm with the committed `frontend/package-lock.json`
- Go 1.25.12, as declared in `go.mod`
- Wails CLI v2.11 for desktop development
- Platform-specific Wails dependencies for native builds
- PowerShell 7+ for the repository release scripts

## Setup

```powershell
cd frontend
npm ci
npm test
npm run dev
```

For desktop development from the repository root:

```powershell
wails dev
```

## Required validation

Before opening a pull request, run:

```powershell
cd frontend
npm ci
npm test
npm run build:web
npm run test:e2e -- --project=chromium
npm audit --audit-level=high
cd ..
go mod download
go mod verify
go test ./...
go vet ./...
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
```

A change that affects desktop bindings, persistence, native assets, or packaging
must also pass an appropriate Wails production build. The CI workflow validates
the Windows build and uploads the resulting executable; macOS and Linux changes
must be validated on their native platforms before release.

## Architecture rules

- Components must not call Wails bindings, `localStorage`, or filesystem APIs
  directly. Use `frontend/services/remediatedPlatform.ts`.
- New desktop capabilities must be intent-specific methods on `DesktopAPI`.
  Generic arbitrary-path file read/write methods are not permitted.
- QR payload generation belongs in `frontend/domain/payloads.js` and requires
  unit tests for escaping and validation.
- Design-package changes must remain versioned and backward compatible through
  `frontend/domain/templatePackage.ts`.
- Template summary records must not be treated as complete documents. Load the
  full design before operations that need logo or background data.
- Do not add externally hosted runtime scripts, fonts, or stylesheets.
- Do not weaken the Content Security Policy or expand the desktop API boundary
  without documenting the threat model and adding regression coverage.

## Database migrations

Never modify a migration that may have shipped. Append a new migration with a
strictly increasing version, make it transactional and idempotent where
possible, and add tests for fresh and upgraded databases.

Migration changes must preserve the local-first privacy model. Raw QR payloads,
Wi-Fi credentials, and absolute export paths must not be introduced into export
history or diagnostic records.

## Pull requests

Keep pull requests focused. Describe the user-visible behavior, data-migration
impact, security implications, validation performed, and any follow-up work.
Include screenshots or exported artifacts when a change affects rendering or
export fidelity.
