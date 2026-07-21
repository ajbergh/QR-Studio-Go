# QR Studio Full Remediation Status

Target release: `1.1.0`  
Implementation branch: `agent/full-remediation`  
Final documentation review: July 21, 2026

## Phase 0 — Release blockers

| Work item | Status | Implementation |
|---|---|---|
| Preserve images during design mutations | Complete | Full-document loading, dedicated rename/duplicate methods, explicit image transport, regression tests |
| Fix desktop design-package export | Complete | Native save dialog, validated JSON, atomic write, explicit saved/cancelled result |
| Repair legacy browser migration | Complete | Multi-schema normalization, detailed failures, count verification, retry-safe completion marker |
| Unify QR export behavior | Complete | Single artifact pipeline for PNG, JPEG, WebP, SVG, framed output, clipboard, print, gallery, and multi-size export |
| Standards-compliant QR payloads | Complete | Dedicated URL, email, Wi-Fi, vCard, iCalendar, and geo serializers with validation tests |
| Remove frontend secret injection | Complete | Gemini environment definitions removed from Vite |
| Harden desktop trust boundary | Complete | Curated Wails API, no generic filesystem binding, local runtime assets, CSP, size/type validation |
| Add correctness tests | Complete | Payload unit tests, QR decode test, PNG signature test, persistence and image-preservation tests |

## Phase 1 — Functional completion

| Work item | Status | Implementation |
|---|---|---|
| Make preferences functional | Complete | Defaults initialize new designs; format, size, correction, filename, auto-save, history, and theme are persisted |
| Version and validate imports | Complete | Versioned design packages, duplicate reporting, record-level errors, transactional backend writes |
| Handle database startup failures | Complete | Services remain unavailable after initialization/migration failure; frontend receives an explicit error |
| Redesign history for privacy | Complete | Optional redacted history, basename only, no raw payload/password/path, legacy row redaction migration |
| Improve storage error behavior | Complete | Errors propagate to visible notifications instead of false success states |
| Escape framed SVG output | Complete | XML escaping for frame text, colors, and font values |
| Preserve image MIME types | Complete | Image bytes are signature-detected when restored from SQLite |

## Phase 2 — Release hardening

| Work item | Status | Implementation |
|---|---|---|
| Add CI | Complete | Type checking, unit tests, web build, Chromium E2E, npm audit, Go test/vet/vulnerability scan, Windows Wails build |
| Decompose frontend | Complete | Focused content, design, preview, library, preferences, domain, and platform modules replace the original monolith |
| Reproducible packaging | Complete | `npm ci`, module verification, isolated multi-architecture staging, SHA-256 checksums |
| Accessibility improvements | Complete | Semantic tabs/dialogs, labels, keyboard workflows, visible focus, reduced-motion support |
| Scannability guardrails | Complete | Contrast, quiet-zone, logo-size, error-correction, and background-image warnings plus decode validation |
| Repair documentation and licensing | Complete | README, changelog, contribution guide, security policy, MIT license, and this phase ledger |

## Final validation

All merge gates completed successfully before the final documentation pass:

- frontend strict TypeScript check;
- payload unit tests;
- production web build;
- Chromium Playwright workflows, including QR decode and exported-artifact checks;
- high-severity npm dependency audit;
- Go module verification;
- Go tests and `go vet`;
- Go vulnerability scan with Go 1.25.12 and `golang.org/x/sys` 0.44.0;
- Windows Wails production build and executable artifact upload.

The documentation-only final pass must repeat the repository CI checks before
merge. Native macOS signing/notarization and Windows code signing require
project-owned certificates and release secrets. The build scripts produce
unsigned staged artifacts and checksums without embedding credentials in the
repository.
