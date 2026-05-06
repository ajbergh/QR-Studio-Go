/*
================================================================================
QR STUDIO - STORAGE SERVICE INDEX
================================================================================

File: services/index.ts
Description: Main entry point for storage services. Provides the factory
             function for obtaining the appropriate storage service based
             on the runtime environment.

Usage:
  import { getStorageService, storageService } from './services';
  
  // Option 1: Use singleton
  const templates = await storageService.getTemplates();
  
  // Option 2: Get fresh instance
  const storage = getStorageService();
  const templates = await storage.getTemplates();

Runtime Detection:
  - If window.go.backend exists → WailsStorageService (desktop mode)
  - Otherwise → LocalStorageService (web mode)

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

// Re-export types and interfaces
export type { IStorageService } from './storage';
export { DEFAULT_SETTINGS, SETTING_KEYS, TEMPLATES_STORAGE_KEY } from './storage';

// Export implementations
export { LocalStorageService } from './localStorage';
export { WailsStorageService, isWailsAvailable } from './wailsStorage';

// Export file export utilities
export { 
  downloadFile, 
  showSaveDialog, 
  showOpenDialog, 
  saveToPath, 
  readFromPath,
  getDesktopPath,
  getAppDataPath,
  openImageDialog,
  IMAGE_FILTERS,
  type FileFilter,
  type ExportOptions
} from './fileExport';

// Export migration utilities
export {
  getMigrationStatus,
  checkMigrationNeeded,
  migrateFromLocalStorage,
  clearLocalStorageData,
  resetMigrationStatus,
  initMigration,
  MIGRATION_VERSION,
  MIGRATION_STATUS_KEY,
  LEGACY_TEMPLATES_KEY,
  type MigrationStatus,
  type MigrationResult,
} from './migration';

// Export version utilities
export {
  APP_VERSION,
  TEMPLATE_VERSION,
  SETTINGS_VERSION,
  MIN_TEMPLATE_VERSION,
  MIN_SETTINGS_VERSION,
  parseVersion,
  compareVersions,
  isVersionAtLeast,
  areVersionsCompatible,
  checkTemplateCompatibility,
  checkSettingsCompatibility,
  createVersionMetadata,
  updateVersionMetadata,
  getVersionInfo,
  logVersionInfo,
  type SemanticVersion,
  type CompatibilityResult,
  type VersionedData,
} from './version';

// Import implementations for factory
import type { IStorageService } from './storage';
import { LocalStorageService } from './localStorage';
import { WailsStorageService, isWailsAvailable } from './wailsStorage';

/**
 * Singleton storage service instance.
 * Created lazily on first access.
 */
let _storageService: IStorageService | null = null;

/**
 * Factory function to get the appropriate storage service.
 * Automatically detects the runtime environment and returns
 * the correct implementation.
 * 
 * @param forceNew - If true, creates a new instance instead of using singleton
 * @returns IStorageService implementation for current environment
 * 
 * @example
 * const storage = getStorageService();
 * const templates = await storage.getTemplates();
 */
export function getStorageService(forceNew: boolean = false): IStorageService {
  if (_storageService && !forceNew) {
    return _storageService;
  }

  // Detect environment and create appropriate service
  if (isWailsAvailable()) {
    console.log('[Storage] Using WailsStorageService (desktop mode)');
    _storageService = new WailsStorageService();
  } else {
    console.log('[Storage] Using LocalStorageService (web mode)');
    _storageService = new LocalStorageService();
  }

  return _storageService;
}

/**
 * Singleton storage service instance.
 * Use this for most cases to avoid creating multiple instances.
 * 
 * Note: This is lazily initialized via a getter.
 */
export const storageService = {
  get instance(): IStorageService {
    return getStorageService();
  }
};

/**
 * Hook for React components to use storage service.
 * Returns a stable storage service reference.
 * 
 * @returns IStorageService instance
 * 
 * @example
 * function MyComponent() {
 *   const storage = useStorageService();
 *   const [templates, setTemplates] = useState([]);
 *   
 *   useEffect(() => {
 *     storage.getTemplates().then(setTemplates);
 *   }, []);
 * }
 */
export function useStorageService(): IStorageService {
  return getStorageService();
}

/**
 * Checks if the application is running in desktop mode.
 * Convenience wrapper around isWailsAvailable.
 * 
 * @returns True if running as Wails desktop app
 */
export function isDesktopMode(): boolean {
  return isWailsAvailable();
}

/**
 * Re-initializes the storage service.
 * Useful for testing or when the environment changes.
 */
export function resetStorageService(): void {
  _storageService = null;
}
