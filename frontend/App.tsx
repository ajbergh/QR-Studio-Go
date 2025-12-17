/*
================================================================================
QR STUDIO - MAIN APPLICATION COMPONENT
================================================================================

File: App.tsx
Description: Root application component that manages global state, theme,
             and layout. Integrates SettingsProvider for persistent user
             preferences across browser and desktop modes.

Structure:
  - SettingsProvider: Wraps app for user preferences
  - Header: Logo, dark mode toggle, navigation links
  - Sidebar: QRControls for configuration
  - Main: QRPreview for live preview

Theme Management:
  - Uses SettingsContext for persistent theme preference
  - Supports 'light', 'dark', and 'system' modes
  - Applies theme class to root element

Keyboard Shortcuts:
  - Ctrl+S: Save template (handled in QRControls)
  - Ctrl+,: Open settings
  - Escape: Close settings panel

Author: QR Studio Team
Created: 2024
Updated: 2025-12-16 - Added SettingsProvider, keyboard shortcuts, window state

================================================================================
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRControls } from './components/QRControls';
import { QRPreview } from './components/QRPreview';
import { SettingsPanel } from './components/SettingsPanel';
import { QRSettings } from './types';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { useKeyboardShortcuts, SHORTCUTS, useWindowState } from './hooks';
import { isDesktopMode } from './services';
import { ScanLine, Sun, Moon, Monitor, Settings, Maximize2, Minimize2 } from 'lucide-react';
import { initMigration, type MigrationResult } from './services';

// Initial state
const INITIAL_SETTINGS: QRSettings = {
  width: 1000,
  height: 1000,
  data: 'https://qr-studio.app',
  dataType: 'url',
  textContent: 'https://qr-studio.app',
  wifiOptions: {
    ssid: '',
    password: '',
    encryption: 'WPA',
    hidden: false
  },
  vcardOptions: {
    firstName: '',
    lastName: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    company: '',
    jobTitle: '',
    street: '',
    city: '',
    zip: '',
    country: ''
  },
  eventOptions: {
    title: '',
    location: '',
    description: '',
    startTime: '',
    endTime: ''
  },
  locationOptions: {
    latitude: '',
    longitude: ''
  },
  margin: 10,
  qrOptions: {
    typeNumber: 0,
    mode: 'Byte',
    errorCorrectionLevel: 'Q'
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 5,
    crossOrigin: 'anonymous',
  },
  dotsOptions: {
    type: 'classy-rounded',
    color: '#334155',
  },
  backgroundOptions: {
    color: '#ffffff',
  },
  cornersSquareOptions: {
    type: 'extra-rounded',
    color: '#334155',
  },
  cornersDotOptions: {
    type: 'dot',
    color: '#334155',
  },
  frameOptions: {
    style: 'none',
    text: "SCAN ME",
    color: "#334155",
    textColor: "#ffffff"
  }
};

const AppContent: React.FC = () => {
  const [settings, setSettings] = useState<QRSettings>(INITIAL_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const { settings: userSettings, updateSetting } = useSettings();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const { isMaximized, toggleMaximize, isDesktop } = useWindowState();
  const qrPreviewRef = useRef<{ handleCopy: () => void; handleDownload: () => void } | null>(null);

  /**
   * Run migration on first load (desktop mode only).
   * This migrates templates from localStorage to SQLite.
   */
  useEffect(() => {
    initMigration().then(result => {
      if (result) {
        setMigrationResult(result);
        if (result.success && result.templatesImported > 0) {
          console.log(`[App] Migrated ${result.templatesImported} templates from localStorage`);
        }
      }
    });
  }, []);

  /**
   * Register keyboard shortcuts.
   */
  useEffect(() => {
    // Settings shortcut (Ctrl+,)
    registerShortcut('settings', SHORTCUTS.SETTINGS, () => {
      setShowSettings(prev => !prev);
    });

    // Escape to close settings
    registerShortcut('escape', SHORTCUTS.ESCAPE, () => {
      setShowSettings(false);
    });

    // Export shortcut (Ctrl+E) - will be handled by QRPreview
    // Save shortcut (Ctrl+S) - will be handled by QRControls

    return () => {
      unregisterShortcut('settings');
      unregisterShortcut('escape');
    };
  }, [registerShortcut, unregisterShortcut]);

  /**
   * Determine if dark mode is active based on user settings.
   * Supports 'light', 'dark', and 'system' modes.
   */
  const isDarkMode = React.useMemo(() => {
    if (userSettings.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return userSettings.theme === 'dark';
  }, [userSettings.theme]);

  /**
   * Cycle through theme options: system -> light -> dark -> system
   */
  const cycleTheme = () => {
    const themes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
    const currentIndex = themes.indexOf(userSettings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    updateSetting('theme', themes[nextIndex]);
  };

  /**
   * Get the appropriate theme icon based on current setting.
   */
  const ThemeIcon = () => {
    switch (userSettings.theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const updateSettings = (newSettings: Partial<QRSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            updateSettings({ image: reader.result });
        }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-full`}>
      <div className="h-screen flex flex-col font-sans overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300">
        {/* Header - Minimal Enterprise Style */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-6 justify-between shrink-0 z-20 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-indigo-200 dark:shadow-none shadow-lg">
                  <ScanLine className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">QR Studio <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium ml-2 border border-slate-200 dark:border-slate-700">PRO</span></span>
            </div>
            <div className="flex items-center gap-4">
               <button 
                onClick={cycleTheme}
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                title={`Theme: ${userSettings.theme}`}
               >
                 <ThemeIcon />
                 <span className="text-xs uppercase font-medium hidden sm:inline">{userSettings.theme}</span>
               </button>
               <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Settings (Ctrl+,)"
               >
                 <Settings className="w-5 h-5" />
               </button>
               {/* Desktop-only maximize button */}
               {isDesktop && (
                 <button 
                  onClick={toggleMaximize}
                  className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={isMaximized ? "Restore" : "Maximize"}
                 >
                   {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                 </button>
               )}
               <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
               <a href="#" className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 text-sm font-medium transition-colors">Docs</a>
               <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors">GitHub</a>
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar - Configuration */}
          <aside className="w-[420px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-colors">
               <QRControls 
                  settings={settings} 
                  updateSettings={updateSettings} 
                  onLogoUpload={handleLogoUpload}
                  onRemoveLogo={() => updateSettings({ image: undefined })}
               />
          </aside>

          {/* Right Area - Canvas / Preview */}
          <main className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden flex flex-col transition-colors">
              {/* Background Pattern for Professional Feel */}
              <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1]" 
                  style={{ 
                      backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                      backgroundSize: '24px 24px' 
                  }}>
              </div>

              <div className="flex-1 flex items-center justify-center p-8 overflow-auto z-10">
                  <QRPreview settings={settings} />
              </div>

              <div className="h-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 shrink-0 transition-colors">
                   Generated securely in your browser. No data is sent to servers.
              </div>
          </main>
        </div>
      </div>
      
      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

/**
 * App - Root component with SettingsProvider wrapper.
 * Provides settings context to all child components.
 */
const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;