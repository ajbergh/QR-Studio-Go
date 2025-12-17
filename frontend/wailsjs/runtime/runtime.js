/*
================================================================================
QR STUDIO - WAILS RUNTIME STUB
================================================================================

File: wailsjs/runtime/runtime.js
Description: Runtime JavaScript stubs for Wails runtime functions.
             These stubs allow the project to compile in browser mode.
             When running via Wails, these are replaced with actual bindings.

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

// ============================================================================
// HELPER
// ============================================================================

function notAvailable(name) {
  console.warn(`Wails runtime not available: ${name}`);
}

// ============================================================================
// LOGGING (noop in browser)
// ============================================================================

export function LogDebug(message) { console.debug(message); }
export function LogInfo(message) { console.info(message); }
export function LogWarning(message) { console.warn(message); }
export function LogError(message) { console.error(message); }
export function LogFatal(message) { console.error('FATAL:', message); }
export function LogPrint(message) { console.log(message); }
export function LogTrace(message) { console.trace(message); }

// ============================================================================
// WINDOW MANAGEMENT (stubs)
// ============================================================================

export function WindowCenter() { notAvailable('WindowCenter'); }
export function WindowSetTitle(title) { document.title = title; }
export function WindowFullscreen() { notAvailable('WindowFullscreen'); }
export function WindowUnfullscreen() { notAvailable('WindowUnfullscreen'); }
export function WindowIsFullscreen() { return Promise.resolve(false); }
export function WindowMaximise() { notAvailable('WindowMaximise'); }
export function WindowToggleMaximise() { notAvailable('WindowToggleMaximise'); }
export function WindowUnmaximise() { notAvailable('WindowUnmaximise'); }
export function WindowIsMaximised() { return Promise.resolve(false); }
export function WindowMinimise() { notAvailable('WindowMinimise'); }
export function WindowUnminimise() { notAvailable('WindowUnminimise'); }
export function WindowIsMinimised() { return Promise.resolve(false); }
export function WindowSetSize(width, height) { notAvailable('WindowSetSize'); }
export function WindowGetSize() { return Promise.resolve({ w: window.innerWidth, h: window.innerHeight }); }
export function WindowSetMinSize(width, height) { notAvailable('WindowSetMinSize'); }
export function WindowSetMaxSize(width, height) { notAvailable('WindowSetMaxSize'); }
export function WindowSetPosition(x, y) { notAvailable('WindowSetPosition'); }
export function WindowGetPosition() { return Promise.resolve({ x: 0, y: 0 }); }
export function WindowHide() { notAvailable('WindowHide'); }
export function WindowShow() { notAvailable('WindowShow'); }
export function WindowReload() { window.location.reload(); }
export function WindowReloadApp() { window.location.reload(); }
export function WindowSetBackgroundColour(r, g, b, a) { notAvailable('WindowSetBackgroundColour'); }
export function WindowSetAlwaysOnTop(onTop) { notAvailable('WindowSetAlwaysOnTop'); }

// ============================================================================
// EVENTS (browser-compatible EventEmitter)
// ============================================================================

const eventListeners = new Map();

export function EventsOn(eventName, callback) {
  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, []);
  }
  eventListeners.get(eventName).push(callback);
  return () => EventsOff(eventName);
}

export function EventsOnce(eventName, callback) {
  const wrapper = (...args) => {
    callback(...args);
    EventsOff(eventName);
  };
  return EventsOn(eventName, wrapper);
}

export function EventsOnMultiple(eventName, callback, counter) {
  let count = 0;
  const wrapper = (...args) => {
    callback(...args);
    count++;
    if (count >= counter) {
      EventsOff(eventName);
    }
  };
  return EventsOn(eventName, wrapper);
}

export function EventsOff(eventName, ...additionalEventNames) {
  eventListeners.delete(eventName);
  additionalEventNames.forEach(name => eventListeners.delete(name));
}

export function EventsEmit(eventName, ...data) {
  const listeners = eventListeners.get(eventName);
  if (listeners) {
    listeners.forEach(callback => callback(...data));
  }
}

// ============================================================================
// APPLICATION
// ============================================================================

export function Quit() { notAvailable('Quit'); }
export function Hide() { notAvailable('Hide'); }
export function Show() { notAvailable('Show'); }

// ============================================================================
// ENVIRONMENT
// ============================================================================

export function Environment() {
  return Promise.resolve({
    buildType: 'browser',
    platform: navigator.platform,
    arch: 'unknown'
  });
}

// ============================================================================
// BROWSER
// ============================================================================

export function BrowserOpenURL(url) {
  window.open(url, '_blank');
}

// ============================================================================
// CLIPBOARD
// ============================================================================

export async function ClipboardGetText() {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}

export async function ClipboardSetText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// SCREEN
// ============================================================================

export function ScreenGetAll() {
  return Promise.resolve([{
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight
  }]);
}

// ============================================================================
// DRAG AND DROP
// ============================================================================

export function WindowStartDragging() { notAvailable('WindowStartDragging'); }
