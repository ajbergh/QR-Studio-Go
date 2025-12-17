/*
================================================================================
QR STUDIO - MIGRATION SERVICE
================================================================================

File: services/migration.ts
Description: Handles migration of data from localStorage (web version) to SQLite
             (desktop version) on first run. This enables users to transition
             from the web app to the desktop app without losing their templates.

Migration Process:
  1. Check if migration has already been performed
  2. Read templates from localStorage (if available)
  3. Import templates to SQLite via Wails backend
  4. Mark migration as complete
  5. Optionally clear localStorage data

Key Functions:
  - checkMigrationNeeded(): Check if migration should run
  - migrateFromLocalStorage(): Perform the migration
  - getMigrationStatus(): Get current migration status
  - clearLocalStorageData(): Clean up after migration

Dependencies:
  - services/storage.ts - Template type definitions
  - wailsjs/go/backend/App - Backend template service

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

import { Template, STORAGE_KEYS } from './storage';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Migration status information.
 * Tracks when migration was performed and any errors encountered.
 */
export interface MigrationStatus {
  /** Whether migration has been completed */
  completed: boolean;
  /** ISO timestamp of when migration was performed */
  migratedAt?: string;
  /** Number of templates migrated */
  templateCount?: number;
  /** Any error message from failed migration */
  error?: string;
  /** Version of the migration tool used */
  version: string;
}

/**
 * Result of a migration operation.
 * Contains details about what was migrated and any issues.
 */
export interface MigrationResult {
  /** Whether the migration was successful */
  success: boolean;
  /** Number of templates migrated */
  templatesImported: number;
  /** Number of templates that failed to import */
  templatesFailed: number;
  /** Any error message */
  error?: string;
  /** Detailed log of the migration */
  log: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Current migration tool version.
 * Increment this when making breaking changes to migration logic.
 */
export const MIGRATION_VERSION = '1.0.0';

/**
 * Key used to store migration status in localStorage.
 * This persists even after migration to prevent re-running.
 */
export const MIGRATION_STATUS_KEY = 'qr_studio_migration_status';

/**
 * Legacy localStorage key from the web version.
 * This is where templates were stored before the desktop app.
 */
export const LEGACY_TEMPLATES_KEY = 'qr_studio_templates';

// ============================================================================
// MIGRATION STATUS FUNCTIONS
// ============================================================================

/**
 * Gets the current migration status from localStorage.
 * 
 * @returns The migration status, or a default "not completed" status
 * 
 * @example
 * const status = getMigrationStatus();
 * if (!status.completed) {
 *   await migrateFromLocalStorage();
 * }
 */
export function getMigrationStatus(): MigrationStatus {
  try {
    const stored = localStorage.getItem(MIGRATION_STATUS_KEY);
    if (stored) {
      return JSON.parse(stored) as MigrationStatus;
    }
  } catch (error) {
    console.warn('[Migration] Failed to read migration status:', error);
  }
  
  // Default: migration not completed
  return {
    completed: false,
    version: MIGRATION_VERSION,
  };
}

/**
 * Saves the migration status to localStorage.
 * 
 * @param status - The migration status to save
 */
function saveMigrationStatus(status: MigrationStatus): void {
  try {
    localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('[Migration] Failed to save migration status:', error);
  }
}

/**
 * Checks if migration is needed and possible.
 * 
 * Migration is needed when:
 * 1. We're running in desktop mode (Wails)
 * 2. Migration hasn't been completed yet
 * 3. There are templates in localStorage to migrate
 * 
 * @returns True if migration should be performed
 * 
 * @example
 * if (await checkMigrationNeeded()) {
 *   const result = await migrateFromLocalStorage();
 *   console.log(`Migrated ${result.templatesImported} templates`);
 * }
 */
export async function checkMigrationNeeded(): Promise<boolean> {
  // Check if we're in desktop mode
  const isDesktop = typeof window !== 'undefined' && 
                    'go' in window;
  
  if (!isDesktop) {
    console.log('[Migration] Not in desktop mode, skipping migration check');
    return false;
  }
  
  // Check if migration has already been completed
  const status = getMigrationStatus();
  if (status.completed) {
    console.log('[Migration] Migration already completed at:', status.migratedAt);
    return false;
  }
  
  // Check if there are templates to migrate
  const legacyTemplates = getLegacyTemplates();
  if (legacyTemplates.length === 0) {
    console.log('[Migration] No legacy templates found');
    // Mark as complete since there's nothing to migrate
    saveMigrationStatus({
      completed: true,
      migratedAt: new Date().toISOString(),
      templateCount: 0,
      version: MIGRATION_VERSION,
    });
    return false;
  }
  
  console.log(`[Migration] Found ${legacyTemplates.length} templates to migrate`);
  return true;
}

// ============================================================================
// LEGACY DATA ACCESS
// ============================================================================

/**
 * Retrieves templates from the legacy localStorage format.
 * 
 * The web version stored templates as a JSON array under the
 * 'qr_studio_templates' key. This function parses that data.
 * 
 * @returns Array of templates from localStorage, or empty array if none found
 */
export function getLegacyTemplates(): Template[] {
  try {
    const stored = localStorage.getItem(LEGACY_TEMPLATES_KEY);
    if (!stored) {
      return [];
    }
    
    const templates = JSON.parse(stored);
    if (!Array.isArray(templates)) {
      console.warn('[Migration] Legacy templates is not an array');
      return [];
    }
    
    // Validate and normalize template objects
    return templates.filter((t: unknown) => {
      if (typeof t !== 'object' || t === null) return false;
      const template = t as Record<string, unknown>;
      return typeof template.id === 'string' && 
             typeof template.name === 'string' &&
             typeof template.settings === 'object';
    }) as Template[];
    
  } catch (error) {
    console.error('[Migration] Failed to parse legacy templates:', error);
    return [];
  }
}

// ============================================================================
// MIGRATION EXECUTION
// ============================================================================

/**
 * Performs the migration from localStorage to SQLite.
 * 
 * This function:
 * 1. Reads all templates from localStorage
 * 2. Imports each template to the SQLite database via Wails
 * 3. Logs the results of each import
 * 4. Saves the migration status
 * 
 * @param clearAfterMigration - Whether to clear localStorage after successful migration
 * @returns Migration result with details about what was migrated
 * 
 * @example
 * const result = await migrateFromLocalStorage(true);
 * if (result.success) {
 *   console.log(`Successfully migrated ${result.templatesImported} templates`);
 * } else {
 *   console.error('Migration failed:', result.error);
 * }
 */
export async function migrateFromLocalStorage(
  clearAfterMigration: boolean = false
): Promise<MigrationResult> {
  const log: string[] = [];
  let templatesImported = 0;
  let templatesFailed = 0;
  
  log.push(`[${new Date().toISOString()}] Starting migration...`);
  log.push(`Migration version: ${MIGRATION_VERSION}`);
  
  try {
    // Get legacy templates
    const templates = getLegacyTemplates();
    log.push(`Found ${templates.length} templates in localStorage`);
    
    if (templates.length === 0) {
      log.push('No templates to migrate');
      saveMigrationStatus({
        completed: true,
        migratedAt: new Date().toISOString(),
        templateCount: 0,
        version: MIGRATION_VERSION,
      });
      return {
        success: true,
        templatesImported: 0,
        templatesFailed: 0,
        log,
      };
    }
    
    // Import templates to backend
    // Dynamic import to avoid issues in web mode
    const { SaveTemplate } = await import('../wailsjs/go/backend/App');
    
    for (const template of templates) {
      try {
        log.push(`Importing template: ${template.name} (${template.id})`);
        
        // Convert template settings to JSON string for the backend
        const settingsJson = JSON.stringify(template.settings);
        
        // Save to SQLite via backend
        await SaveTemplate(template.id, template.name, settingsJson);
        
        templatesImported++;
        log.push(`  ✓ Successfully imported: ${template.name}`);
        
      } catch (templateError) {
        templatesFailed++;
        const errorMsg = templateError instanceof Error 
          ? templateError.message 
          : String(templateError);
        log.push(`  ✗ Failed to import ${template.name}: ${errorMsg}`);
      }
    }
    
    // Update migration status
    const status: MigrationStatus = {
      completed: true,
      migratedAt: new Date().toISOString(),
      templateCount: templatesImported,
      version: MIGRATION_VERSION,
    };
    
    if (templatesFailed > 0) {
      status.error = `${templatesFailed} template(s) failed to import`;
    }
    
    saveMigrationStatus(status);
    log.push(`Migration complete: ${templatesImported} imported, ${templatesFailed} failed`);
    
    // Optionally clear localStorage
    if (clearAfterMigration && templatesFailed === 0) {
      clearLocalStorageData();
      log.push('Cleared legacy localStorage data');
    }
    
    return {
      success: templatesFailed === 0,
      templatesImported,
      templatesFailed,
      log,
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.push(`Migration failed with error: ${errorMsg}`);
    
    saveMigrationStatus({
      completed: false,
      error: errorMsg,
      version: MIGRATION_VERSION,
    });
    
    return {
      success: false,
      templatesImported,
      templatesFailed: templatesFailed + 1,
      error: errorMsg,
      log,
    };
  }
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Clears legacy localStorage data after successful migration.
 * 
 * This removes:
 * - Legacy templates (qr_studio_templates)
 * - Any other legacy keys that are no longer needed
 * 
 * Note: Does NOT remove the migration status key, as that's needed
 * to prevent re-running migration.
 */
export function clearLocalStorageData(): void {
  try {
    // Remove legacy templates
    localStorage.removeItem(LEGACY_TEMPLATES_KEY);
    
    // Remove any other legacy keys
    const legacyKeys = [
      'qr_studio_settings',  // Old settings if any
      'qr_studio_history',   // Old history if any
    ];
    
    for (const key of legacyKeys) {
      localStorage.removeItem(key);
    }
    
    console.log('[Migration] Cleared legacy localStorage data');
  } catch (error) {
    console.error('[Migration] Failed to clear localStorage:', error);
  }
}

/**
 * Resets the migration status, allowing migration to run again.
 * 
 * This is primarily useful for debugging or if a user wants to
 * re-import their templates.
 * 
 * @warning This will NOT restore cleared localStorage data
 */
export function resetMigrationStatus(): void {
  try {
    localStorage.removeItem(MIGRATION_STATUS_KEY);
    console.log('[Migration] Reset migration status');
  } catch (error) {
    console.error('[Migration] Failed to reset migration status:', error);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Runs the migration check and performs migration if needed.
 * 
 * This function should be called early in the app initialization
 * (e.g., in App.tsx useEffect) to ensure templates are migrated
 * before the user interacts with the app.
 * 
 * @returns Migration result if migration was performed, null otherwise
 * 
 * @example
 * // In App.tsx
 * useEffect(() => {
 *   initMigration().then(result => {
 *     if (result) {
 *       console.log('Migration completed:', result);
 *     }
 *   });
 * }, []);
 */
export async function initMigration(): Promise<MigrationResult | null> {
  const needed = await checkMigrationNeeded();
  
  if (!needed) {
    return null;
  }
  
  console.log('[Migration] Starting automatic migration...');
  const result = await migrateFromLocalStorage(false); // Don't clear by default
  
  if (result.success) {
    console.log(`[Migration] Successfully migrated ${result.templatesImported} templates`);
  } else {
    console.error('[Migration] Migration failed:', result.error);
  }
  
  return result;
}
