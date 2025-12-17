/*
================================================================================
QR STUDIO - LOCALSTORAGE SERVICE IMPLEMENTATION
================================================================================

File: services/localStorage.ts
Description: Browser localStorage implementation of the IStorageService interface.
             This is the storage backend for web mode operation.

Features:
  - Full template storage in localStorage
  - Settings persistence with prefix
  - Base64 image handling (with quota error handling)
  - JSON import/export

Limitations:
  - ~5-10MB storage quota (browser dependent)
  - Large images may cause quota errors
  - Data cleared with browser data

Migration:
  This implementation extracts and standardizes the existing localStorage
  logic from QRControls.tsx for consistent storage abstraction.

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

import { QRSettings } from '../types';
import { 
  IStorageService, 
  TEMPLATES_STORAGE_KEY, 
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS 
} from './storage';

/**
 * LocalStorage implementation of IStorageService.
 * Used in web mode when running in a browser without Wails.
 * 
 * Storage Structure:
 * - qr_studio_templates: JSON array of QRSettings
 * - qr_studio_settings_<key>: Individual setting values
 */
export class LocalStorageService implements IStorageService {
  /**
   * In-memory cache of templates for quota error fallback.
   * If localStorage quota is exceeded, templates are kept in memory only.
   */
  private memoryTemplates: QRSettings[] | null = null;

  /**
   * Flag indicating if we're in memory-only mode due to quota error.
   */
  private memoryOnlyMode: boolean = false;

  // =========================================================================
  // TEMPLATE OPERATIONS
  // =========================================================================

  /**
   * Retrieves all saved templates from localStorage.
   * Falls back to in-memory cache if in memory-only mode.
   * 
   * @returns Promise resolving to array of templates
   */
  async getTemplates(): Promise<QRSettings[]> {
    // If in memory-only mode, return cached templates
    if (this.memoryOnlyMode && this.memoryTemplates) {
      return this.memoryTemplates;
    }

    try {
      const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (saved) {
        const templates = JSON.parse(saved) as QRSettings[];
        return templates;
      }
    } catch (error) {
      console.error('Failed to load templates from localStorage:', error);
    }

    return [];
  }

  /**
   * Retrieves a single template by ID.
   * 
   * @param id - Template ID to retrieve
   * @returns Promise resolving to template or null if not found
   */
  async getTemplate(id: string): Promise<QRSettings | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === id) || null;
  }

  /**
   * Saves a new template or updates an existing one.
   * Handles quota errors by falling back to memory-only mode.
   * 
   * @param template - Template data to save
   * @returns Promise resolving to saved template with ID
   */
  async saveTemplate(template: QRSettings): Promise<QRSettings> {
    const templates = await this.getTemplates();
    
    // Generate ID if not present
    const savedTemplate: QRSettings = {
      ...template,
      id: template.id || `tpl_${Date.now()}`,
    };

    // Check if updating existing or creating new
    const existingIndex = templates.findIndex(t => t.id === savedTemplate.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = savedTemplate;
    } else {
      templates.push(savedTemplate);
    }

    // Try to persist to localStorage
    await this.persistTemplates(templates);

    return savedTemplate;
  }

  /**
   * Persists templates to localStorage with quota error handling.
   * 
   * @param templates - Templates array to persist
   */
  private async persistTemplates(templates: QRSettings[]): Promise<void> {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      this.memoryOnlyMode = false;
    } catch (error) {
      console.error('Failed to save templates to localStorage:', error);
      
      // Check for quota error
      if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || 
           error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        // Fall back to memory-only mode
        this.memoryTemplates = templates;
        this.memoryOnlyMode = true;
        
        console.warn(
          'LocalStorage quota exceeded. Templates saved to memory only. ' +
          'Large logo images may exceed browser storage limits.'
        );
      }
    }
  }

  /**
   * Deletes a template by ID.
   * 
   * @param id - Template ID to delete
   */
  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    await this.persistTemplates(filtered);
  }

  /**
   * Imports templates from JSON string.
   * Merges with existing templates, skipping duplicates by ID.
   * 
   * @param jsonData - JSON string containing template array
   * @returns Promise resolving to number of templates imported
   */
  async importTemplates(jsonData: string): Promise<number> {
    try {
      const importedTemplates = JSON.parse(jsonData) as QRSettings[];
      
      if (!Array.isArray(importedTemplates)) {
        throw new Error('Invalid template file format');
      }

      const existingTemplates = await this.getTemplates();
      const existingIds = new Set(existingTemplates.map(t => t.id));
      
      // Filter out duplicates
      const newTemplates = importedTemplates.filter(t => !existingIds.has(t.id));
      
      // Merge and persist
      const merged = [...existingTemplates, ...newTemplates];
      await this.persistTemplates(merged);

      return newTemplates.length;
    } catch (error) {
      console.error('Failed to import templates:', error);
      throw error;
    }
  }

  /**
   * Exports all templates to JSON string.
   * 
   * @returns Promise resolving to formatted JSON string
   */
  async exportTemplates(): Promise<string> {
    const templates = await this.getTemplates();
    return JSON.stringify(templates, null, 2);
  }

  // =========================================================================
  // SETTINGS OPERATIONS
  // =========================================================================

  /**
   * Retrieves a setting value by key.
   * Returns default value if not found.
   * 
   * @param key - Setting key
   * @returns Promise resolving to value or null
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      const value = localStorage.getItem(`${SETTINGS_STORAGE_KEY}_${key}`);
      if (value !== null) {
        return value;
      }
      // Return default if available
      return DEFAULT_SETTINGS[key] || null;
    } catch (error) {
      console.error(`Failed to get setting '${key}':`, error);
      return DEFAULT_SETTINGS[key] || null;
    }
  }

  /**
   * Saves a setting value.
   * 
   * @param key - Setting key
   * @param value - Setting value
   */
  async setSetting(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(`${SETTINGS_STORAGE_KEY}_${key}`, value);
    } catch (error) {
      console.error(`Failed to set setting '${key}':`, error);
    }
  }

  /**
   * Retrieves all settings as a key-value map.
   * Includes defaults for missing settings.
   * 
   * @returns Promise resolving to settings map
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    
    // Override with stored values
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const value = await this.getSetting(key);
      if (value !== null) {
        settings[key] = value;
      }
    }

    return settings;
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Returns false for localStorage service (not in desktop mode).
   */
  isDesktopMode(): boolean {
    return false;
  }

  /**
   * Returns the template count.
   * 
   * @returns Promise resolving to number of saved templates
   */
  async getTemplateCount(): Promise<number> {
    const templates = await this.getTemplates();
    return templates.length;
  }

  /**
   * Returns whether we're in memory-only mode due to quota error.
   * Useful for showing warnings to the user.
   */
  isMemoryOnlyMode(): boolean {
    return this.memoryOnlyMode;
  }
}
