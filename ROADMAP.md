# QR Studio Roadmap

This document outlines planned improvements and new features for QR Studio, organized by priority and category.

---

## Current State Analysis

### ✅ What Works Well
- **Dual-mode architecture**: Seamless web and desktop operation
- **Rich QR customization**: Dot types, gradients, logos, backgrounds
- **Template system**: Save, load, import/export templates
- **Frame styles**: Simple, balloon, badge frames with text
- **Data types**: URL, text, email, WiFi, vCard, events, location
- **System presets**: Quick styling with 6 professional presets
- **Desktop features**: SQLite storage, native dialogs, keyboard shortcuts

### ⚠️ Areas for Improvement
- No batch QR generation
- No dynamic QR codes
- Limited analytics/history features
- No cloud sync
- No API for external integrations
- Limited accessibility features
- No undo/redo functionality
- No dark mode for QR codes

---

## 🚀 Phase 1: Core Improvements (v1.1)
*Estimated: 2-4 weeks*

### 1.1 User Experience Enhancements

#### Undo/Redo System
- [ ] Implement state history stack (15-20 states)
- [ ] Add `Ctrl+Z` / `Ctrl+Y` keyboard shortcuts
- [ ] Show undo/redo buttons in toolbar
- [ ] Persist state across tab changes

#### Live Preview Improvements
- [ ] Add zoom controls for preview (25%-400%)
- [ ] Add grid/guideline overlay toggle
- [ ] Add actual-size pixel preview
- [ ] Show QR version number and module count

#### Template Organization
- [ ] Add template folders/categories
- [ ] Add template search/filter
- [ ] Add template duplication
- [ ] Add template rename inline
- [ ] Add template preview thumbnails (cached)

### 1.2 Export Enhancements

#### Format Improvements
- [ ] Add WebP export format
- [ ] Add PDF export with vector graphics
- [ ] Add EPS export for print workflows
- [ ] Add ICO/favicon export

#### Batch Export
- [ ] Add "Export All Sizes" button (e.g., 256, 512, 1024, 2048)
- [ ] Add custom size presets (user-defined)
- [ ] Add filename templating (e.g., `{name}_{size}_{date}.png`)

#### Frame SVG Export
- [ ] Implement SVG export with frames (currently PNG/JPEG only)
- [ ] Add frame customization options (border radius, padding)

### 1.3 Quality of Life

#### Settings Persistence
- [ ] Remember last used export format
- [ ] Remember last used size
- [ ] Remember last export directory (desktop)
- [ ] Remember window position/size (desktop)

#### Error Handling
- [ ] Add toast notification system
- [ ] Better error messages for invalid content
- [ ] Validate QR content before generation (e.g., URL format)
- [ ] Show warning when QR data exceeds capacity

---

## 🎨 Phase 2: Design Features (v1.2)
*Estimated: 3-5 weeks*

### 2.1 Advanced Styling

#### New Dot Types
- [ ] Add "heart" dot type
- [ ] Add "star" dot type  
- [ ] Add "diamond" dot type
- [ ] Add "hexagon" dot type
- [ ] Add custom SVG dot support

#### Corner Styles
- [ ] Add more corner square styles (pointed, rounded-inner)
- [ ] Add corner logo/icon placement
- [ ] Add per-corner color customization

#### Color Features
- [ ] Add color palette presets (Material, Tailwind, etc.)
- [ ] Add color history/favorites
- [ ] Add eyedropper/color picker tool
- [ ] Add multi-stop gradients (3+ colors)
- [ ] Add color harmony suggestions

### 2.2 Logo Enhancements

#### Logo Processing
- [ ] Add logo background removal (AI-based)
- [ ] Add logo size presets (small, medium, large)
- [ ] Add logo border/shadow options
- [ ] Add logo shape mask (circle, square, rounded)

#### Logo Library
- [ ] Add built-in icon library (company logos, social icons)
- [ ] Add recent logos list
- [ ] Add logo import from URL

### 2.3 Background Features

#### Background Options
- [ ] Add pattern backgrounds (dots, lines, grid)
- [ ] Add image opacity control
- [ ] Add image blur option
- [ ] Add image position/crop controls
- [ ] Add solid color presets

#### Frame Improvements
- [ ] Add more frame styles (scanner, arrow, custom)
- [ ] Add frame animation preview (GIF)
- [ ] Add custom font support for frame text
- [ ] Add frame icon placement

---

## 📊 Phase 3: Analytics & History (v1.3)
*Estimated: 4-6 weeks*

### 3.1 Generation History

#### History Tracking
- [ ] Record all QR generations with timestamps
- [ ] Store QR content, template used, export format
- [ ] Add "Regenerate" button from history
- [ ] Add history search/filter

#### History Display
- [ ] Add history panel/tab
- [ ] Show preview thumbnails
- [ ] Show data type icons
- [ ] Add "Clear history" with confirmation

### 3.2 Usage Statistics

#### Analytics Dashboard
- [ ] Show total QR codes generated
- [ ] Show breakdown by data type
- [ ] Show breakdown by export format
- [ ] Show generation timeline graph

#### Template Analytics
- [ ] Track template usage counts
- [ ] Show "most used" templates
- [ ] Show "recently used" templates
- [ ] Suggest templates based on usage

### 3.3 Data Export

#### Reports
- [ ] Export history as CSV
- [ ] Export analytics as PDF
- [ ] Add date range filters
- [ ] Add scheduled exports (desktop)

---

## 🔗 Phase 4: Advanced Features (v2.0)
*Estimated: 6-10 weeks*

### 4.1 Dynamic QR Codes

#### URL Shortening
- [ ] Integrate URL shortener (self-hosted or API)
- [ ] Track scan counts
- [ ] Show scan analytics per QR code
- [ ] Add redirect management

#### QR Content Types
- [ ] Add App Store links (auto-detect iOS/Android)
- [ ] Add social media profile links
- [ ] Add cryptocurrency wallet addresses
- [ ] Add Zoom/Meet meeting links
- [ ] Add SMS with pre-filled text

### 4.2 Batch Generation

#### Bulk QR Creation
- [ ] Import data from CSV/Excel
- [ ] Map columns to QR fields
- [ ] Generate multiple QRs at once
- [ ] Export as ZIP archive
- [ ] Add naming templates

#### Mail Merge Style
- [ ] Variable substitution in templates
- [ ] Preview before generation
- [ ] Progress indicator for large batches

### 4.3 API & Integrations

#### REST API (Desktop Server Mode)
- [ ] Add local HTTP server mode
- [ ] POST `/generate` with settings JSON
- [ ] Return PNG/SVG/JPEG data
- [ ] API key authentication

#### Webhooks
- [ ] Send notification on generation
- [ ] Integration with Zapier/IFTTT
- [ ] Custom webhook URLs

### 4.4 Cloud Features

#### Cloud Sync (Optional)
- [ ] Sync templates across devices
- [ ] Cloud backup/restore
- [ ] Share templates via link
- [ ] Team templates (multi-user)

#### Online Export
- [ ] Upload directly to cloud storage (S3, Google Drive)
- [ ] Share links for generated QRs
- [ ] QR hosting with landing pages

---

## 🛠️ Phase 5: Technical Improvements (Ongoing)

### 5.1 Performance

#### Optimization
- [ ] Lazy load system presets
- [ ] Virtualize template list for large collections
- [ ] Cache generated QR images
- [ ] Optimize gradient rendering

#### Memory Management
- [ ] Limit history size
- [ ] Compress stored images
- [ ] Clean up old temp files

### 5.2 Accessibility

#### WCAG Compliance
- [ ] Add ARIA labels to all controls
- [ ] Improve keyboard navigation
- [ ] Add screen reader announcements
- [ ] Add high contrast mode
- [ ] Add reduced motion support

#### Internationalization
- [ ] Add i18n framework
- [ ] Support multiple languages
- [ ] RTL layout support
- [ ] Locale-aware formatting

### 5.3 Testing

#### Automated Tests
- [ ] Add unit tests for storage services
- [ ] Add integration tests for Wails IPC
- [ ] Add E2E tests with Playwright
- [ ] Add visual regression tests

#### Quality Assurance
- [ ] Set up CI/CD pipeline
- [ ] Add linting and formatting checks
- [ ] Add security scanning
- [ ] Add bundle size monitoring

### 5.4 Cross-Platform

#### Platform Support
- [ ] Add macOS build (Wails supports it)
- [ ] Add Linux build
- [ ] Add ARM64 builds
- [ ] Create installer packages (MSI, DMG, DEB)

#### Mobile Companion
- [ ] Create React Native mobile app
- [ ] Sync with desktop app
- [ ] Camera-based QR scanning

---

## 🐛 Bug Fixes & Technical Debt

### High Priority
- [ ] Fix SVG export with frames (currently unsupported)
- [ ] Fix clipboard copy in insecure contexts
- [ ] Handle localStorage quota errors gracefully
- [ ] Fix template preview rendering for complex gradients

### Medium Priority
- [ ] Clean up unused Wails binding stubs
- [ ] Consolidate duplicate code in services
- [ ] Improve error messages throughout app
- [ ] Add input validation for all data types

### Low Priority
- [ ] Remove deprecated event options
- [ ] Clean up commented-out code
- [ ] Update documentation
- [ ] Add code comments in complex areas

---

## 📋 Feature Requests Backlog

*Collected from common QR generator features:*

- [ ] Animated QR codes (GIF/MP4)
- [ ] QR code scanning/reading
- [ ] Print directly from app
- [ ] QR code watermarking
- [ ] Transparent QR codes
- [ ] Round QR codes (not square)
- [ ] QR code comparison tool
- [ ] Template marketplace
- [ ] AI-generated QR art
- [ ] QR code A/B testing
- [ ] QR code scheduling
- [ ] Multi-language QR content
- [ ] QR code chaining (sequences)
- [ ] Audio/video QR codes (links)

---

## Version Timeline

| Version | Focus Area | Target |
|---------|------------|--------|
| v1.0 | Current release | ✅ Complete |
| v1.1 | Core improvements, UX | Q1 2025 |
| v1.2 | Design features | Q2 2025 |
| v1.3 | Analytics & history | Q3 2025 |
| v2.0 | Dynamic QR, batch, API | Q4 2025 |
| v2.x | Cloud, mobile, enterprise | 2026 |

---

## Contributing

We welcome contributions! When picking up a roadmap item:

1. Create an issue referencing the roadmap item
2. Discuss approach in the issue before coding
3. Create a feature branch
4. Submit PR with tests
5. Update this roadmap when complete

### Priority Labels
- 🔴 **Critical**: Blocking issues or security concerns
- 🟠 **High**: Core functionality improvements
- 🟡 **Medium**: Nice-to-have features
- 🟢 **Low**: Future considerations

---

*Last updated: December 2024*
*Maintained by: QR Studio Team*
