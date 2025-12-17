/*
================================================================================
QR STUDIO - FILE EXPORT SERVICE
================================================================================

File: services/fileExport.ts
Description: File export service that handles saving files in both browser and
             desktop (Wails) modes. In browser mode, uses download links.
             In desktop mode, uses native save dialogs via Wails.

Features:
  - Native save dialog in desktop mode
  - Fallback to download links in browser mode
  - Support for PNG, JPEG, SVG, and WEBP formats
  - History tracking for exports (desktop mode)

Usage:
  import { downloadFile, showSaveDialog } from './services/fileExport';
  
  // Download a file
  await downloadFile('qr-code.png', blob);
  
  // Or with native dialog (desktop mode)
  const path = await showSaveDialog('qr-code.png', [{ displayName: 'PNG Image', pattern: '*.png' }]);
  if (path) {
    await saveToPath(path, blob);
  }

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

import { isDesktopMode } from './index';
import * as WailsApp from '../wailsjs/go/backend/App';

// ============================================================================
// TYPES
// ============================================================================

/**
 * File filter for save/open dialogs.
 */
export interface FileFilter {
  displayName: string;
  pattern: string;
}

/**
 * Export options for QR code download.
 */
export interface ExportOptions {
  /** File name without extension */
  filename: string;
  /** File format */
  format: 'png' | 'jpeg' | 'svg' | 'webp';
  /** Optional: Template ID for history tracking */
  templateId?: string;
  /** Optional: Data type for history tracking */
  dataType?: string;
  /** Optional: Data content for history tracking */
  dataContent?: string;
}

// ============================================================================
// FILE FILTERS
// ============================================================================

/**
 * Common file filters for image formats.
 */
export const IMAGE_FILTERS: Record<string, FileFilter> = {
  png: { displayName: 'PNG Image', pattern: '*.png' },
  jpeg: { displayName: 'JPEG Image', pattern: '*.jpg;*.jpeg' },
  svg: { displayName: 'SVG Vector', pattern: '*.svg' },
  webp: { displayName: 'WebP Image', pattern: '*.webp' },
  all: { displayName: 'All Images', pattern: '*.png;*.jpg;*.jpeg;*.svg;*.webp;*.gif;*.bmp' },
  logo: { displayName: 'Logo Images', pattern: '*.png;*.jpg;*.jpeg;*.svg;*.webp' },
  json: { displayName: 'JSON Files', pattern: '*.json' },
};

// ============================================================================
// BROWSER MODE HELPERS
// ============================================================================

/**
 * Download a file in browser mode using a download link.
 * Creates a temporary anchor element to trigger the download.
 * 
 * @param filename - Name of the file to download
 * @param blob - File data as Blob
 */
function browserDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Convert a Blob to a byte array for Wails.
 * Wails expects []byte (number[]) for binary data.
 * 
 * @param blob - Blob to convert
 * @returns Promise resolving to byte array
 */
async function blobToBytes(blob: Blob): Promise<number[]> {
  const buffer = await blob.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Download a file with automatic mode detection.
 * In browser mode: Uses download link
 * In desktop mode: Uses native save dialog
 * 
 * @param options - Export options including filename and format
 * @param blob - File data as Blob
 * @returns Promise resolving to saved file path (desktop) or empty string (browser)
 */
export async function downloadFile(options: ExportOptions, blob: Blob): Promise<string> {
  const { filename, format } = options;
  const fullFilename = `${filename}.${format}`;
  
  if (!isDesktopMode()) {
    // Browser mode: use download link
    browserDownload(fullFilename, blob);
    return '';
  }

  // Desktop mode: use native save dialog
  try {
    const filter = IMAGE_FILTERS[format] || IMAGE_FILTERS.all;
    const path = await WailsApp.ShowSaveDialog(fullFilename, [filter]);
    
    if (!path) {
      // User cancelled
      return '';
    }

    // Convert blob to bytes and save
    const bytes = await blobToBytes(blob);
    await WailsApp.SaveFile(path, bytes);

    // Track in history if template info provided
    if (options.templateId || options.dataType) {
      try {
        await WailsApp.AddHistoryEntry({
          templateId: options.templateId || '',
          dataType: options.dataType || 'unknown',
          dataContent: options.dataContent || '',
          exportedPath: path,
          exportFormat: format,
        });
      } catch (historyError) {
        console.warn('Failed to track export in history:', historyError);
      }
    }

    return path;
  } catch (error) {
    console.error('Desktop save failed, falling back to browser download:', error);
    browserDownload(fullFilename, blob);
    return '';
  }
}

/**
 * Show a native save dialog (desktop mode only).
 * In browser mode, returns null immediately.
 * 
 * @param defaultFilename - Default filename to suggest
 * @param filters - File type filters
 * @returns Promise resolving to selected path or null if cancelled/browser mode
 */
export async function showSaveDialog(
  defaultFilename: string, 
  filters: FileFilter[]
): Promise<string | null> {
  if (!isDesktopMode()) {
    return null;
  }

  try {
    const path = await WailsApp.ShowSaveDialog(defaultFilename, filters);
    return path || null;
  } catch (error) {
    console.error('Save dialog failed:', error);
    return null;
  }
}

/**
 * Show a native open dialog (desktop mode only).
 * In browser mode, returns null immediately.
 * 
 * @param filters - File type filters
 * @returns Promise resolving to selected path or null if cancelled/browser mode
 */
export async function showOpenDialog(filters: FileFilter[]): Promise<string | null> {
  if (!isDesktopMode()) {
    return null;
  }

  try {
    const path = await WailsApp.ShowOpenDialog(filters);
    return path || null;
  } catch (error) {
    console.error('Open dialog failed:', error);
    return null;
  }
}

/**
 * Save data to a specific file path (desktop mode only).
 * 
 * @param path - Full file path
 * @param data - File data as Blob or Uint8Array
 * @returns Promise resolving when save is complete
 */
export async function saveToPath(path: string, data: Blob | Uint8Array): Promise<void> {
  if (!isDesktopMode()) {
    throw new Error('saveToPath is only available in desktop mode');
  }

  const bytes = data instanceof Blob 
    ? await blobToBytes(data) 
    : Array.from(data);
    
  await WailsApp.SaveFile(path, bytes);
}

/**
 * Read a file from path (desktop mode only).
 * 
 * @param path - Full file path
 * @returns Promise resolving to file data as Uint8Array
 */
export async function readFromPath(path: string): Promise<Uint8Array> {
  if (!isDesktopMode()) {
    throw new Error('readFromPath is only available in desktop mode');
  }

  const bytes = await WailsApp.ReadFile(path);
  return new Uint8Array(bytes);
}

/**
 * Get the user's desktop path (desktop mode only).
 * 
 * @returns Promise resolving to desktop path or null in browser mode
 */
export async function getDesktopPath(): Promise<string | null> {
  if (!isDesktopMode()) {
    return null;
  }

  try {
    return await WailsApp.GetDesktopPath();
  } catch {
    return null;
  }
}

/**
 * Get the app data path (desktop mode only).
 * 
 * @returns Promise resolving to app data path or null in browser mode
 */
export async function getAppDataPath(): Promise<string | null> {
  if (!isDesktopMode()) {
    return null;
  }

  try {
    return await WailsApp.GetAppDataPath();
  } catch {
    return null;
  }
}
// ============================================================================
// IMAGE UPLOAD FUNCTIONS
// ============================================================================

/**
 * Open a native file dialog to select an image file.
 * In desktop mode: Uses native OS dialog
 * In browser mode: Returns null (use HTML file input instead)
 * 
 * @param purpose - Purpose of the image (for filter selection)
 * @returns Promise resolving to base64 data URL or null if cancelled
 */
export async function openImageDialog(
  purpose: 'logo' | 'background' = 'logo'
): Promise<string | null> {
  if (!isDesktopMode()) {
    // In browser mode, this should be handled by HTML file input
    return null;
  }

  try {
    const filter = IMAGE_FILTERS.logo;
    const path = await WailsApp.ShowOpenDialog([filter]);
    
    if (!path) {
      // User cancelled
      return null;
    }

    // Read the file
    const bytes = await WailsApp.ReadFile(path);
    
    // Detect mime type from extension
    const mimeType = getMimeTypeFromPath(path);
    
    // Convert to base64 data URL
    const base64 = bytesToBase64(bytes);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Failed to open image dialog:', error);
    return null;
  }
}

/**
 * Get MIME type from file path based on extension.
 */
function getMimeTypeFromPath(path: string): string {
  const ext = path.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
  };
  return mimeTypes[ext] || 'image/png';
}

/**
 * Convert byte array to base64 string.
 */
function bytesToBase64(bytes: number[]): string {
  const uint8 = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}