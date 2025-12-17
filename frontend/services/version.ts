/*
================================================================================
QR STUDIO - VERSION COMPATIBILITY SERVICE
================================================================================

File: services/version.ts
Description: Handles version compatibility checking between the frontend and
             backend, as well as template/settings version migrations. Ensures
             data integrity when upgrading QR Studio.

Version Strategy:
  - Semantic versioning (major.minor.patch)
  - Major version changes = breaking changes requiring migration
  - Minor version changes = new features, backward compatible
  - Patch version changes = bug fixes

Compatibility Checks:
  1. Template version - ensures templates can be loaded
  2. Settings version - ensures user settings are compatible
  3. Database schema version - ensures SQLite migrations are applied
  4. Frontend/Backend version - ensures IPC compatibility

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

// ============================================================================
// VERSION CONSTANTS
// ============================================================================

/**
 * Current application version.
 * Must match package.json and wails.json versions.
 */
export const APP_VERSION = '1.0.0';

/**
 * Minimum supported template version.
 * Templates older than this require migration or may not load.
 */
export const MIN_TEMPLATE_VERSION = '1.0.0';

/**
 * Current template format version.
 * Increment when template structure changes.
 */
export const TEMPLATE_VERSION = '1.0.0';

/**
 * Current settings format version.
 * Increment when settings structure changes.
 */
export const SETTINGS_VERSION = '1.0.0';

/**
 * Minimum supported settings version.
 */
export const MIN_SETTINGS_VERSION = '1.0.0';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Parsed semantic version.
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/**
 * Result of a version compatibility check.
 */
export interface CompatibilityResult {
  compatible: boolean;
  currentVersion: string;
  requiredVersion: string;
  message: string;
  migrationRequired?: boolean;
}

/**
 * Version metadata for stored data.
 */
export interface VersionedData {
  version: string;
  createdAt: string;
  updatedAt: string;
  appVersion: string;
}

// ============================================================================
// VERSION PARSING
// ============================================================================

/**
 * Parses a semantic version string into its components.
 * 
 * @param version - Version string (e.g., "1.2.3" or "1.2.3-beta.1")
 * @returns Parsed version object
 * 
 * @example
 * parseVersion("1.2.3") // { major: 1, minor: 2, patch: 3 }
 * parseVersion("2.0.0-beta.1") // { major: 2, minor: 0, patch: 0, prerelease: "beta.1" }
 */
export function parseVersion(version: string): SemanticVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  
  if (!match) {
    console.warn(`[Version] Invalid version string: ${version}`);
    return { major: 0, minor: 0, patch: 0 };
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

/**
 * Converts a SemanticVersion back to a string.
 * 
 * @param version - Parsed version object
 * @returns Version string
 */
export function versionToString(version: SemanticVersion): string {
  const base = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease ? `${base}-${version.prerelease}` : base;
}

// ============================================================================
// VERSION COMPARISON
// ============================================================================

/**
 * Compares two semantic versions.
 * 
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 * 
 * @example
 * compareVersions("1.0.0", "1.0.1") // -1 (a is older)
 * compareVersions("2.0.0", "1.9.9") // 1 (a is newer)
 * compareVersions("1.0.0", "1.0.0") // 0 (equal)
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const vA = parseVersion(a);
  const vB = parseVersion(b);
  
  // Compare major version
  if (vA.major !== vB.major) {
    return vA.major > vB.major ? 1 : -1;
  }
  
  // Compare minor version
  if (vA.minor !== vB.minor) {
    return vA.minor > vB.minor ? 1 : -1;
  }
  
  // Compare patch version
  if (vA.patch !== vB.patch) {
    return vA.patch > vB.patch ? 1 : -1;
  }
  
  // Handle prerelease versions (prerelease < release)
  if (vA.prerelease && !vB.prerelease) return -1;
  if (!vA.prerelease && vB.prerelease) return 1;
  
  return 0;
}

/**
 * Checks if version a is greater than or equal to version b.
 * 
 * @param a - Version to check
 * @param b - Minimum required version
 * @returns True if a >= b
 */
export function isVersionAtLeast(a: string, b: string): boolean {
  return compareVersions(a, b) >= 0;
}

/**
 * Checks if two versions are compatible (same major version).
 * 
 * @param a - First version
 * @param b - Second version
 * @returns True if major versions match
 */
export function areVersionsCompatible(a: string, b: string): boolean {
  const vA = parseVersion(a);
  const vB = parseVersion(b);
  return vA.major === vB.major;
}

// ============================================================================
// COMPATIBILITY CHECKS
// ============================================================================

/**
 * Checks if a template version is compatible with the current app.
 * 
 * @param templateVersion - Version of the template to check
 * @returns Compatibility result with details
 * 
 * @example
 * const result = checkTemplateCompatibility("0.9.0");
 * if (!result.compatible) {
 *   console.warn(result.message);
 * }
 */
export function checkTemplateCompatibility(templateVersion: string): CompatibilityResult {
  // Check if version meets minimum requirement
  if (!isVersionAtLeast(templateVersion, MIN_TEMPLATE_VERSION)) {
    return {
      compatible: false,
      currentVersion: templateVersion,
      requiredVersion: MIN_TEMPLATE_VERSION,
      message: `Template version ${templateVersion} is too old. Minimum required: ${MIN_TEMPLATE_VERSION}`,
      migrationRequired: true,
    };
  }
  
  // Check if major version matches (for forward compatibility)
  if (!areVersionsCompatible(templateVersion, TEMPLATE_VERSION)) {
    return {
      compatible: false,
      currentVersion: templateVersion,
      requiredVersion: TEMPLATE_VERSION,
      message: `Template version ${templateVersion} is from a different major version. Current: ${TEMPLATE_VERSION}`,
      migrationRequired: true,
    };
  }
  
  return {
    compatible: true,
    currentVersion: templateVersion,
    requiredVersion: TEMPLATE_VERSION,
    message: 'Template is compatible',
  };
}

/**
 * Checks if user settings version is compatible.
 * 
 * @param settingsVersion - Version of the settings to check
 * @returns Compatibility result with details
 */
export function checkSettingsCompatibility(settingsVersion: string): CompatibilityResult {
  if (!isVersionAtLeast(settingsVersion, MIN_SETTINGS_VERSION)) {
    return {
      compatible: false,
      currentVersion: settingsVersion,
      requiredVersion: MIN_SETTINGS_VERSION,
      message: `Settings version ${settingsVersion} is too old. Minimum required: ${MIN_SETTINGS_VERSION}`,
      migrationRequired: true,
    };
  }
  
  return {
    compatible: true,
    currentVersion: settingsVersion,
    requiredVersion: SETTINGS_VERSION,
    message: 'Settings are compatible',
  };
}

// ============================================================================
// VERSION METADATA HELPERS
// ============================================================================

/**
 * Creates version metadata for new data.
 * 
 * @param dataVersion - Version of the data format
 * @returns VersionedData object
 */
export function createVersionMetadata(dataVersion: string): VersionedData {
  const now = new Date().toISOString();
  return {
    version: dataVersion,
    createdAt: now,
    updatedAt: now,
    appVersion: APP_VERSION,
  };
}

/**
 * Updates version metadata timestamp.
 * 
 * @param metadata - Existing version metadata
 * @returns Updated metadata with new updatedAt timestamp
 */
export function updateVersionMetadata(metadata: VersionedData): VersionedData {
  return {
    ...metadata,
    updatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
}

// ============================================================================
// APP VERSION INFO
// ============================================================================

/**
 * Returns formatted version information for display.
 * 
 * @returns Version info object
 */
export function getVersionInfo(): {
  app: string;
  template: string;
  settings: string;
  isPrerelease: boolean;
} {
  const parsed = parseVersion(APP_VERSION);
  return {
    app: APP_VERSION,
    template: TEMPLATE_VERSION,
    settings: SETTINGS_VERSION,
    isPrerelease: !!parsed.prerelease,
  };
}

/**
 * Logs version information to console.
 * Useful for debugging.
 */
export function logVersionInfo(): void {
  const info = getVersionInfo();
  console.log('[Version] QR Studio Version Info:');
  console.log(`  App Version: ${info.app}`);
  console.log(`  Template Version: ${info.template}`);
  console.log(`  Settings Version: ${info.settings}`);
  console.log(`  Is Prerelease: ${info.isPrerelease}`);
}
