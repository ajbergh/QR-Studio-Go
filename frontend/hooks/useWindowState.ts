/*
================================================================================
QR STUDIO - WINDOW STATE HOOK
================================================================================

File: hooks/useWindowState.ts
Description: React hook for managing window state in desktop (Wails) mode.
             Persists window position and size across sessions.

Features:
  - Save window position and size on change
  - Restore window state on startup
  - Debounced persistence to avoid excessive writes
  - Browser mode: No-op fallback

Usage:
  const { isMaximized, toggleMaximize, isFullscreen, toggleFullscreen } = useWindowState();

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

import { useEffect, useState, useCallback, useRef } from 'react';
import { isDesktopMode } from '../services';
import { useSettings } from '../contexts/SettingsContext';

// ============================================================================
// WAILS RUNTIME IMPORTS
// ============================================================================

// Import Wails runtime functions (will be stubs in browser mode)
import * as runtime from '../wailsjs/runtime/runtime';

// ============================================================================
// TYPES
// ============================================================================

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
  isFullscreen: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useWindowState - Hook for managing desktop window state.
 * In browser mode, returns no-op functions.
 * 
 * @returns Window state and control functions
 */
export function useWindowState() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const { settings, updateSettings } = useSettings();
  
  // Debounce timer for saving state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load initial window state on mount.
   */
  useEffect(() => {
    if (!isDesktopMode()) return;

    const loadState = async () => {
      try {
        // Check maximized/fullscreen state
        const maximized = await runtime.WindowIsMaximised();
        const fullscreen = await runtime.WindowIsFullscreen();
        setIsMaximized(maximized);
        setIsFullscreen(fullscreen);

        // Get current size and position
        const size = await runtime.WindowGetSize();
        const position = await runtime.WindowGetPosition();
        setWindowSize({ width: size.w, height: size.h });
        setWindowPosition({ x: position.x, y: position.y });

        // Restore saved position if valid
        if (settings.windowX > 0 && settings.windowY > 0) {
          runtime.WindowSetPosition(settings.windowX, settings.windowY);
        }
        if (settings.windowWidth > 0 && settings.windowHeight > 0) {
          runtime.WindowSetSize(settings.windowWidth, settings.windowHeight);
        }
      } catch (error) {
        console.warn('Failed to load window state:', error);
      }
    };

    loadState();
  }, []);

  /**
   * Save window state with debouncing.
   */
  const saveState = useCallback(() => {
    if (!isDesktopMode()) return;

    // Debounce saves to avoid excessive writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const size = await runtime.WindowGetSize();
        const position = await runtime.WindowGetPosition();
        const maximized = await runtime.WindowIsMaximised();

        // Only save if not maximized (to preserve normal window size)
        if (!maximized) {
          await updateSettings({
            windowWidth: size.w,
            windowHeight: size.h,
            windowX: position.x,
            windowY: position.y,
          });
        }
      } catch (error) {
        console.warn('Failed to save window state:', error);
      }
    }, 500);
  }, [updateSettings]);

  /**
   * Track window resize/move events.
   */
  useEffect(() => {
    if (!isDesktopMode()) return;

    // Use a resize observer or interval to detect changes
    // Wails doesn't expose native window events directly
    const checkState = setInterval(async () => {
      try {
        const size = await runtime.WindowGetSize();
        const position = await runtime.WindowGetPosition();
        
        if (size.w !== windowSize.width || size.h !== windowSize.height) {
          setWindowSize({ width: size.w, height: size.h });
          saveState();
        }
        if (position.x !== windowPosition.x || position.y !== windowPosition.y) {
          setWindowPosition({ x: position.x, y: position.y });
          saveState();
        }
      } catch (error) {
        // Silently ignore errors during polling
      }
    }, 2000); // Check every 2 seconds

    return () => {
      clearInterval(checkState);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [windowSize, windowPosition, saveState]);

  /**
   * Toggle maximized state.
   */
  const toggleMaximize = useCallback(() => {
    if (!isDesktopMode()) return;

    if (isMaximized) {
      runtime.WindowUnmaximise();
    } else {
      runtime.WindowMaximise();
    }
    setIsMaximized(!isMaximized);
  }, [isMaximized]);

  /**
   * Toggle fullscreen state.
   */
  const toggleFullscreen = useCallback(() => {
    if (!isDesktopMode()) return;

    if (isFullscreen) {
      runtime.WindowUnfullscreen();
    } else {
      runtime.WindowFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  /**
   * Minimize window.
   */
  const minimize = useCallback(() => {
    if (!isDesktopMode()) return;
    runtime.WindowMinimise();
  }, []);

  /**
   * Center window on screen.
   */
  const center = useCallback(() => {
    if (!isDesktopMode()) return;
    runtime.WindowCenter();
  }, []);

  /**
   * Set window title.
   */
  const setTitle = useCallback((title: string) => {
    if (isDesktopMode()) {
      runtime.WindowSetTitle(title);
    } else {
      document.title = title;
    }
  }, []);

  /**
   * Set window size.
   */
  const setSize = useCallback((width: number, height: number) => {
    if (!isDesktopMode()) return;
    runtime.WindowSetSize(width, height);
    setWindowSize({ width, height });
    saveState();
  }, [saveState]);

  return {
    // State
    isMaximized,
    isFullscreen,
    windowSize,
    windowPosition,
    
    // Actions
    toggleMaximize,
    toggleFullscreen,
    minimize,
    center,
    setTitle,
    setSize,
    
    // Utilities
    isDesktop: isDesktopMode(),
  };
}

export default useWindowState;
