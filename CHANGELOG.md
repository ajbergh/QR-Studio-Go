# Changelog

All notable changes to QR Studio are documented in this file.

## 1.1.0 — 2026-07-21

### Security

- Replaced the broad Wails application binding with an intent-specific
  `DesktopAPI` that does not expose generic arbitrary-path filesystem methods.
- Added type, size, and schema validation for native imports and exports, plus
  atomic file writes for generated artifacts and design packages.
- Removed frontend secret injection and runtime CDN dependencies.
- Added a restrictive Content Security Policy and localhost-only development
  server binding.
- Redacted legacy export-history payloads and absolute file paths during the
  schema version 6 migration.
- Upgraded the Go toolchain to 1.25.12 and `golang.org/x/sys` to 0.44.0, and
  updated the frontend dependency graph to patched Vite, Rollup, Picomatch, and
  PostCSS releases.

### Added

- Standards-aware URL, email, Wi-Fi, vCard, iCalendar, and geographic payload
  generation with validation and escaping tests.
- Scan-reliability warnings for contrast, quiet zones, logo sizing,
  error-correction levels, and background images.
- JPEG, WebP, SVG, framed, clipboard, print, gallery, and multi-size export
  workflows through a unified artifact pipeline.
- Versioned design-package import and export with duplicate and record-level
  reporting.
- Functional preferences for theme, default size, format, error correction,
  filename, auto-save, and export history.
- Strict TypeScript, payload unit, Playwright QR decode, exported-artifact,
  persistence, migration, and Go regression coverage.
- CI gates for dependency audits, Go vulnerability scanning, and a native
  Windows Wails production build.
- Reproducible Windows, macOS, Linux, and web build scripts with isolated output
  staging and SHA-256 checksum generation.

### Fixed

- Preserved logo and background image data when loading, renaming, duplicating,
  updating, importing, and exporting saved designs.
- Repaired browser-to-SQLite migration for both known legacy record shapes and
  made migration completion dependent on verified destination counts.
- Prevented database initialization or migration failures from producing a
  partially operational desktop application.
- Made storage and export failures visible instead of reporting false success.
- Stabilized iCalendar identity and timestamps so preview rendering does not
  continuously regenerate event payloads.
- Corrected history writes for designs without a persisted template identifier.

### Changed

- Decomposed the frontend into focused content, design, preview, library,
  preferences, domain, and platform modules.
- Reworked export history to be optional and privacy-preserving, storing only a
  short label, content type, format, filename, and timestamp.
- Standardized development on Node.js 22+, Go 1.25.12, Wails 2.11, and
  PowerShell 7+ for repository release scripts.

### Release limitations

- Windows code signing and macOS signing/notarization are not performed without
  project-owned certificates and repository secrets.
- macOS and Linux release scripts must be executed and validated on their native
  operating systems.
