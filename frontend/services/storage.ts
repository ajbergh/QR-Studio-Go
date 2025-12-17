/*
================================================================================
QR STUDIO - STORAGE SERVICE INTERFACE
================================================================================

File: services/storage.ts
Description: Defines the storage abstraction interface for QR Studio.
             This interface enables dual-mode operation: web (localStorage)
             and desktop (Wails backend with SQLite).

Architecture:
  - IStorageService: Common interface for all storage implementations
  - LocalStorageService: Browser localStorage implementation (web mode)
  - WailsStorageService: Wails backend implementation (desktop mode)
  - getStorageService(): Factory function with runtime detection

Usage:
  import { getStorageService } from './services/storage';
  const storage = getStorageService();
  const templates = await storage.getTemplates();

Key Differences:
  - Web Mode: Uses localStorage, limited to ~5-10MB, Base64 images
  - Desktop Mode: Uses SQLite, unlimited size, binary images

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

import { QRSettings } from '../types';

/**
 * Represents a saved template with metadata.
 * Matches the database Template model in Go.
 */
export interface TemplateListItem {
  /** Unique template identifier (format: tpl_<timestamp>) */
  id: string;
  /** User-provided template name */
  name: string;
  /** Whether the template has a logo image */
  hasLogo: boolean;
  /** Whether the template has a background image */
  hasBackground: boolean;
  /** Template creation timestamp */
  createdAt: string;
  /** Last modification timestamp */
  updatedAt: string;
}

/**
 * Storage service interface for template and settings management.
 * Implemented by both LocalStorageService (web) and WailsStorageService (desktop).
 * 
 * All methods are async to support both sync localStorage and async Wails calls.
 */
export interface IStorageService {
  // =========================================================================
  // TEMPLATE OPERATIONS
  // =========================================================================

  /**
   * Retrieves all saved templates.
   * For web mode: Full templates from localStorage
   * For desktop mode: Lightweight list items (without binary data)
   * 
   * @returns Promise resolving to array of templates
   */
  getTemplates(): Promise<QRSettings[]>;

  /**
   * Retrieves a single template by ID with full data.
   * 
   * @param id - Template ID to retrieve
   * @returns Promise resolving to template or null if not found
   */
  getTemplate(id: string): Promise<QRSettings | null>;

  /**
   * Saves a new template or updates an existing one.
   * 
   * @param template - Template data to save
   * @returns Promise resolving to saved template with ID
   */
  saveTemplate(template: QRSettings): Promise<QRSettings>;

  /**
   * Deletes a template by ID.
   * 
   * @param id - Template ID to delete
   * @returns Promise resolving when deletion is complete
   */
  deleteTemplate(id: string): Promise<void>;

  /**
   * Imports templates from JSON string.
   * 
   * @param jsonData - JSON string containing template array
   * @returns Promise resolving to number of templates imported
   */
  importTemplates(jsonData: string): Promise<number>;

  /**
   * Exports all templates to JSON string.
   * 
   * @returns Promise resolving to JSON string of templates
   */
  exportTemplates(): Promise<string>;

  // =========================================================================
  // SETTINGS OPERATIONS
  // =========================================================================

  /**
   * Retrieves a setting value by key.
   * 
   * @param key - Setting key
   * @returns Promise resolving to value or null if not found
   */
  getSetting(key: string): Promise<string | null>;

  /**
   * Saves a setting value.
   * 
   * @param key - Setting key
   * @param value - Setting value
   * @returns Promise resolving when save is complete
   */
  setSetting(key: string, value: string): Promise<void>;

  /**
   * Retrieves all settings as a key-value map.
   * 
   * @returns Promise resolving to settings map
   */
  getAllSettings(): Promise<Record<string, string>>;

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Returns true if running in Wails desktop mode.
   * Used for conditional feature enabling.
   */
  isDesktopMode(): boolean;

  /**
   * Returns the template count.
   * 
   * @returns Promise resolving to number of saved templates
   */
  getTemplateCount(): Promise<number>;
}

/**
 * Default settings used when a setting is not found.
 * Should match defaultSettings in Go backend/services/settings.go
 */
export const DEFAULT_SETTINGS = {
  THEME: 'system',
  EXPORT_FORMAT: 'png',
  QR_SIZE: 1000,
  SHOW_HISTORY: true,
  AUTO_SAVE: false,
  ERROR_CORRECTION: 'M',
  WINDOW_WIDTH: 1280,
  WINDOW_HEIGHT: 800,
};

/**
 * Setting keys for storage operations.
 * Maps to the keys used in both localStorage and SQLite.
 */
export const SETTING_KEYS = {
  THEME: 'theme',
  EXPORT_FORMAT: 'default_export_format',
  QR_SIZE: 'default_qr_size',
  SHOW_HISTORY: 'show_history',
  AUTO_SAVE: 'auto_save_templates',
  ERROR_CORRECTION: 'default_error_correction',
  WINDOW_WIDTH: 'window_width',
  WINDOW_HEIGHT: 'window_height',
  WINDOW_X: 'window_x',
  WINDOW_Y: 'window_y',
};

/**
 * LocalStorage key for templates.
 * Must match the key used in existing QRControls.tsx
 */
export const TEMPLATES_STORAGE_KEY = 'qr_studio_templates';

/**
 * LocalStorage key prefix for settings.
 */
export const SETTINGS_STORAGE_KEY = 'qr_studio_settings';
