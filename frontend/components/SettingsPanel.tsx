/*
================================================================================
QR STUDIO - SETTINGS PANEL COMPONENT
================================================================================

File: components/SettingsPanel.tsx
Description: User preferences panel for QR Studio. Allows users to customize
             application behavior, default values, and appearance settings.

Features:
  - Theme selection (light/dark/system)
  - Default export format (PNG/JPEG/SVG/WEBP)
  - Default QR size
  - Error correction level
  - Auto-save toggle
  - History visibility toggle

Usage:
  <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

Author: QR Studio Team
Created: 2025-12-16
Updated: 2025-12-16

================================================================================
*/

import React, { useRef, useEffect } from 'react';
import { X, Sun, Moon, Monitor, Download, History, Save, Shield } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { Button } from './ui/Button';

// ============================================================================
// TYPES
// ============================================================================

interface SettingsPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SettingsPanel - Modal panel for user preferences.
 * Displays a slide-over panel with all configurable settings.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSetting, resetToDefaults, isLoading } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap: keep Tab/Shift+Tab inside the panel while open; Escape closes it
  useEffect(() => {
    if (!isOpen) return;

    // Save the element that triggered the panel so we can restore focus on close
    previousFocusRef.current = document.activeElement as HTMLElement;

    const panel = panelRef.current;
    if (!panel) return;

    const FOCUSABLE = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const getFocusable = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));

    // Auto-focus the first focusable element (close button) when the panel opens
    const first = getFocusable()[0];
    if (first) first.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (!focusable.length) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that opened the panel
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /**
   * Handle theme change.
   */
  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSetting('theme', theme);
  };

  /**
   * Handle export format change.
   */
  const handleFormatChange = (format: 'png' | 'jpeg' | 'svg' | 'webp') => {
    updateSetting('defaultExportFormat', format);
  };

  /**
   * Handle error correction level change.
   */
  const handleErrorCorrectionChange = (level: 'L' | 'M' | 'Q' | 'H') => {
    updateSetting('defaultErrorCorrection', level);
  };

  /**
   * Handle QR size change.
   */
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    if (size >= 100 && size <= 4000) {
      updateSetting('defaultQRSize', size);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Settings" className="fixed right-0 top-0 h-full w-96 max-w-full bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto transition-transform">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading settings...</div>
          ) : (
            <>
              {/* Appearance Section */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Appearance
                </h3>
                <div className="space-y-3">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        settings.theme === 'light'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Sun className={`w-5 h-5 ${settings.theme === 'light' ? 'text-indigo-600' : 'text-slate-500'}`} />
                      <span className={`text-xs font-medium ${settings.theme === 'light' ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>Light</span>
                    </button>
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        settings.theme === 'dark'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Moon className={`w-5 h-5 ${settings.theme === 'dark' ? 'text-indigo-600' : 'text-slate-500'}`} />
                      <span className={`text-xs font-medium ${settings.theme === 'dark' ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>Dark</span>
                    </button>
                    <button
                      onClick={() => handleThemeChange('system')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        settings.theme === 'system'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Monitor className={`w-5 h-5 ${settings.theme === 'system' ? 'text-indigo-600' : 'text-slate-500'}`} />
                      <span className={`text-xs font-medium ${settings.theme === 'system' ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>System</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Export Defaults Section */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Defaults
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-2">Default Format</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['png', 'jpeg', 'svg', 'webp'] as const).map((format) => (
                        <button
                          key={format}
                          onClick={() => handleFormatChange(format)}
                          className={`py-2 px-3 rounded-lg border-2 text-xs font-semibold uppercase transition-all ${
                            settings.defaultExportFormat === format
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-2">
                      Default QR Size: {settings.defaultQRSize}px
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="4000"
                      step="100"
                      value={settings.defaultQRSize}
                      onChange={handleSizeChange}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>100px</span>
                      <span>4000px</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Error Correction Section */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Error Correction
                </h3>
                <div className="space-y-2">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Default Level</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { level: 'L' as const, label: 'Low', desc: '7%' },
                      { level: 'M' as const, label: 'Med', desc: '15%' },
                      { level: 'Q' as const, label: 'High', desc: '25%' },
                      { level: 'H' as const, label: 'Max', desc: '30%' },
                    ].map(({ level, label, desc }) => (
                      <button
                        key={level}
                        onClick={() => handleErrorCorrectionChange(level)}
                        className={`py-2 px-2 rounded-lg border-2 text-center transition-all ${
                          settings.defaultErrorCorrection === level
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className={`text-sm font-semibold ${settings.defaultErrorCorrection === level ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>{level}</div>
                        <div className="text-[10px] text-slate-500">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Toggles Section */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Behavior
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-3">
                      <Save className="w-5 h-5 text-slate-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-save</div>
                        <div className="text-xs text-slate-500">Save templates automatically</div>
                      </div>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => updateSetting('autoSave', e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-3">
                      <History className="w-5 h-5 text-slate-500" />
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Show History</div>
                        <div className="text-xs text-slate-500">Track generation history</div>
                      </div>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.showHistory}
                      onChange={(e) => updateSetting('showHistory', e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </section>

              {/* Reset Section */}
              <section className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  onClick={() => {
                    if (confirm('Reset all settings to defaults?')) {
                      resetToDefaults();
                    }
                  }}
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Reset to Defaults
                </Button>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
