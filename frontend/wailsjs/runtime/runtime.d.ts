/*
================================================================================
QR STUDIO - WAILS RUNTIME STUB
================================================================================

File: wailsjs/runtime/runtime.d.ts
Description: TypeScript type declarations for Wails runtime functions.
             The Wails runtime provides window management, events, clipboard,
             and other native capabilities.

Note: This is a stub file. The actual runtime is injected by Wails at build time.

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log a debug message to the console
 */
export function LogDebug(message: string): void;

/**
 * Log an info message to the console
 */
export function LogInfo(message: string): void;

/**
 * Log a warning message to the console
 */
export function LogWarning(message: string): void;

/**
 * Log an error message to the console
 */
export function LogError(message: string): void;

/**
 * Log a fatal message to the console
 */
export function LogFatal(message: string): void;

/**
 * Log a message at the specified level
 */
export function LogPrint(message: string): void;

/**
 * Log a trace message to the console
 */
export function LogTrace(message: string): void;

// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

/**
 * Center the window on the screen
 */
export function WindowCenter(): void;

/**
 * Set the window title
 */
export function WindowSetTitle(title: string): void;

/**
 * Make the window fullscreen
 */
export function WindowFullscreen(): void;

/**
 * Exit fullscreen mode
 */
export function WindowUnfullscreen(): void;

/**
 * Check if window is fullscreen
 */
export function WindowIsFullscreen(): Promise<boolean>;

/**
 * Maximize the window
 */
export function WindowMaximise(): void;

/**
 * Toggle window maximized state
 */
export function WindowToggleMaximise(): void;

/**
 * Unmaximize the window
 */
export function WindowUnmaximise(): void;

/**
 * Check if window is maximized
 */
export function WindowIsMaximised(): Promise<boolean>;

/**
 * Minimize the window
 */
export function WindowMinimise(): void;

/**
 * Unminimize the window
 */
export function WindowUnminimise(): void;

/**
 * Check if window is minimized
 */
export function WindowIsMinimised(): Promise<boolean>;

/**
 * Set window size
 */
export function WindowSetSize(width: number, height: number): void;

/**
 * Get window size
 */
export function WindowGetSize(): Promise<{ w: number; h: number }>;

/**
 * Set minimum window size
 */
export function WindowSetMinSize(width: number, height: number): void;

/**
 * Set maximum window size
 */
export function WindowSetMaxSize(width: number, height: number): void;

/**
 * Set window position
 */
export function WindowSetPosition(x: number, y: number): void;

/**
 * Get window position
 */
export function WindowGetPosition(): Promise<{ x: number; y: number }>;

/**
 * Hide the window
 */
export function WindowHide(): void;

/**
 * Show the window
 */
export function WindowShow(): void;

/**
 * Reload the frontend
 */
export function WindowReload(): void;

/**
 * Reload the app (restart)
 */
export function WindowReloadApp(): void;

/**
 * Set the window background color
 */
export function WindowSetBackgroundColour(r: number, g: number, b: number, a: number): void;

/**
 * Set the window always on top
 */
export function WindowSetAlwaysOnTop(onTop: boolean): void;

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Subscribe to an event
 */
export function EventsOn(eventName: string, callback: (...args: any[]) => void): () => void;

/**
 * Subscribe to an event once
 */
export function EventsOnce(eventName: string, callback: (...args: any[]) => void): () => void;

/**
 * Subscribe to multiple events
 */
export function EventsOnMultiple(eventName: string, callback: (...args: any[]) => void, counter: number): () => void;

/**
 * Unsubscribe from an event
 */
export function EventsOff(eventName: string, ...additionalEventNames: string[]): void;

/**
 * Emit an event
 */
export function EventsEmit(eventName: string, ...data: any[]): void;

// ============================================================================
// APPLICATION
// ============================================================================

/**
 * Quit the application
 */
export function Quit(): void;

/**
 * Hide the application (macOS only)
 */
export function Hide(): void;

/**
 * Show the application (macOS only)
 */
export function Show(): void;

// ============================================================================
// ENVIRONMENT
// ============================================================================

/**
 * Get the environment info
 */
export function Environment(): Promise<{
  buildType: string;
  platform: string;
  arch: string;
}>;

// ============================================================================
// BROWSER
// ============================================================================

/**
 * Open a URL in the default browser
 */
export function BrowserOpenURL(url: string): void;

// ============================================================================
// CLIPBOARD
// ============================================================================

/**
 * Get text from the clipboard
 */
export function ClipboardGetText(): Promise<string>;

/**
 * Set text to the clipboard
 */
export function ClipboardSetText(text: string): Promise<boolean>;

// ============================================================================
// SCREEN
// ============================================================================

/**
 * Get screen info
 */
export function ScreenGetAll(): Promise<any[]>;

// ============================================================================
// DRAG AND DROP
// ============================================================================

/**
 * Start window drag
 */
export function WindowStartDragging(): void;
