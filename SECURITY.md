# Security Policy

## Supported versions

Security fixes are applied to the latest release line and the `main` branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private
security advisory workflow for this repository and include:

- affected version and platform;
- reproduction steps or a proof of concept;
- expected and observed behavior;
- potential impact;
- any suggested remediation.

Please avoid accessing data that does not belong to you while validating a
report.

## Desktop security model

QR Studio's Wails webview is bound only to an intent-specific desktop API. The
frontend does not receive generic arbitrary-path file read/write methods.
Exports and design-package imports require a user-selected native dialog and are
validated for type and size before processing.

All runtime assets are bundled locally. The application does not load third-party
JavaScript, fonts, or stylesheets at runtime, and the web entry point applies a
restrictive Content Security Policy.

## Local data and privacy

QR Studio is local-first. Desktop designs and preferences are stored in the
user's application-data directory. Browser mode uses the browser's local
storage.

Desktop export history is optional and redacted. It stores only a short label,
content type, export format, filename, and timestamp. It does not store raw QR
payloads, Wi-Fi passwords, or absolute file paths. Upgrading to schema version 6
redacts payloads and paths from legacy history rows.

Users can clear export history from the application. Removing application data
or browser storage deletes locally persisted designs and preferences, so export
a design package before doing so.
