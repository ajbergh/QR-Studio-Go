/*
================================================================================
QR STUDIO - KEYBOARD SHORTCUTS HOOK
================================================================================

File: hooks/useKeyboardShortcuts.ts
Description: React hook for managing keyboard shortcuts across the application.
             Provides consistent keyboard navigation and quick actions.

Shortcuts:
  - Ctrl+S / Cmd+S: Save current template
  - Ctrl+E / Cmd+E: Export QR code
  - Ctrl+C / Cmd+C: Copy QR to clipboard (when preview focused)
  - Ctrl+N / Cmd+N: New template
  - Ctrl+, / Cmd+,: Open settings
  - Escape: Close modals/panels

Usage:
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  
  useEffect(() => {
    registerShortcut('save', { key: 's', ctrl: true }, handleSave);
    return () => unregisterShortcut('save');
  }, []);

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

import { useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Keyboard shortcut definition.
 */
export interface ShortcutConfig {
  /** Main key (lowercase) */
  key: string;
  /** Require Ctrl (Windows/Linux) or Cmd (Mac) */
  ctrl?: boolean;
  /** Require Shift */
  shift?: boolean;
  /** Require Alt */
  alt?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Description for help display */
  description?: string;
}

/**
 * Shortcut handler function.
 */
export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Registered shortcut entry.
 */
interface ShortcutEntry {
  config: ShortcutConfig;
  handler: ShortcutHandler;
}

// ============================================================================
// PREDEFINED SHORTCUTS
// ============================================================================

/**
 * Common shortcut configurations.
 */
export const SHORTCUTS: Record<string, ShortcutConfig> = {
  SAVE: { key: 's', ctrl: true, preventDefault: true, description: 'Save template' },
  EXPORT: { key: 'e', ctrl: true, preventDefault: true, description: 'Export QR code' },
  COPY: { key: 'c', ctrl: true, description: 'Copy to clipboard' },
  NEW: { key: 'n', ctrl: true, preventDefault: true, description: 'New template' },
  SETTINGS: { key: ',', ctrl: true, preventDefault: true, description: 'Open settings' },
  ESCAPE: { key: 'Escape', description: 'Close panel/modal' },
  UNDO: { key: 'z', ctrl: true, description: 'Undo' },
  REDO: { key: 'z', ctrl: true, shift: true, description: 'Redo' },
  HELP: { key: '?', shift: true, description: 'Show shortcuts help' },
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Global shortcut registry.
 * Shared across all hook instances.
 */
const globalShortcuts = new Map<string, ShortcutEntry>();
let isGlobalListenerAttached = false;

/**
 * Check if an event matches a shortcut config.
 */
function matchesShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  // Check main key
  const keyMatches = event.key.toLowerCase() === config.key.toLowerCase();
  if (!keyMatches) return false;

  // Check modifiers (Cmd on Mac, Ctrl on others)
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
  
  if (config.ctrl && !ctrlKey) return false;
  if (!config.ctrl && ctrlKey && config.key.length === 1) return false; // Don't trigger on Ctrl+key if not specified
  
  if (config.shift && !event.shiftKey) return false;
  if (!config.shift && event.shiftKey && config.key.length === 1) return false;
  
  if (config.alt && !event.altKey) return false;
  if (!config.alt && event.altKey) return false;

  return true;
}

/**
 * Global keyboard event handler.
 */
function handleGlobalKeyDown(event: KeyboardEvent) {
  // Skip if typing in an input field
  const target = event.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.isContentEditable;
  
  // Allow Escape even in inputs
  if (isInput && event.key !== 'Escape') {
    return;
  }

  // Check all registered shortcuts
  for (const [, entry] of globalShortcuts) {
    if (matchesShortcut(event, entry.config)) {
      if (entry.config.preventDefault) {
        event.preventDefault();
      }
      entry.handler(event);
      return; // Only trigger first matching shortcut
    }
  }
}

/**
 * useKeyboardShortcuts - Hook for registering keyboard shortcuts.
 * 
 * @returns Object with register/unregister functions and utilities
 * 
 * @example
 * ```tsx
 * const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
 * 
 * useEffect(() => {
 *   registerShortcut('save', SHORTCUTS.SAVE, handleSave);
 *   return () => unregisterShortcut('save');
 * }, [handleSave]);
 * ```
 */
export function useKeyboardShortcuts() {
  const registeredIds = useRef<Set<string>>(new Set());

  // Attach global listener on first use
  useEffect(() => {
    if (!isGlobalListenerAttached) {
      window.addEventListener('keydown', handleGlobalKeyDown);
      isGlobalListenerAttached = true;
    }

    // Cleanup: remove shortcuts registered by this hook instance
    return () => {
      for (const id of registeredIds.current) {
        globalShortcuts.delete(id);
      }
      registeredIds.current.clear();
    };
  }, []);

  /**
   * Register a keyboard shortcut.
   * 
   * @param id - Unique identifier for the shortcut
   * @param config - Shortcut configuration
   * @param handler - Function to call when shortcut is triggered
   */
  const registerShortcut = useCallback((
    id: string,
    config: ShortcutConfig,
    handler: ShortcutHandler
  ) => {
    globalShortcuts.set(id, { config, handler });
    registeredIds.current.add(id);
  }, []);

  /**
   * Unregister a keyboard shortcut.
   * 
   * @param id - Unique identifier of the shortcut to remove
   */
  const unregisterShortcut = useCallback((id: string) => {
    globalShortcuts.delete(id);
    registeredIds.current.delete(id);
  }, []);

  /**
   * Get all registered shortcuts for help display.
   */
  const getRegisteredShortcuts = useCallback(() => {
    const shortcuts: Array<{ id: string; config: ShortcutConfig }> = [];
    for (const [id, entry] of globalShortcuts) {
      shortcuts.push({ id, config: entry.config });
    }
    return shortcuts;
  }, []);

  /**
   * Format a shortcut for display.
   */
  const formatShortcut = useCallback((config: ShortcutConfig): string => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const parts: string[] = [];
    
    if (config.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
    if (config.shift) parts.push(isMac ? '⇧' : 'Shift');
    if (config.alt) parts.push(isMac ? '⌥' : 'Alt');
    
    // Format key
    let keyDisplay = config.key.toUpperCase();
    if (config.key === 'Escape') keyDisplay = 'Esc';
    if (config.key === ',') keyDisplay = ',';
    if (config.key === '?') keyDisplay = '?';
    
    parts.push(keyDisplay);
    
    return parts.join(isMac ? '' : '+');
  }, []);

  return {
    registerShortcut,
    unregisterShortcut,
    getRegisteredShortcuts,
    formatShortcut,
    SHORTCUTS,
  };
}

export default useKeyboardShortcuts;
