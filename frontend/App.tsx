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
import { QRPreview, type QRPreviewHandle } from './components/QRPreview';
import { SettingsPanel } from './components/SettingsPanel';
import { QRSettings, SavedQR } from './types';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import { useKeyboardShortcuts, SHORTCUTS, useWindowState } from './hooks';
import { isDesktopMode, getStorageService } from './services';
import { ScanLine, Sun, Moon, Monitor, Settings, Maximize2, Minimize2, Clock as HistoryIcon, Download, Trash2, X, Undo2, Redo2, Search, Pencil, CheckCircle } from 'lucide-react';
import { initMigration, type MigrationResult } from './services';

// Initial state
const INITIAL_SETTINGS: QRSettings = {
  width: 1000,
  height: 1000,
  data: 'https://example.com',
  dataType: 'url',
  textContent: 'https://example.com',
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
  const [showHistory, setShowHistory] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [logoHistory, setLogoHistory] = useState<string[]>([]);
  const [savedQRs, setSavedQRs] = useState<SavedQR[]>([]);
  const [savedQRSearch, setSavedQRSearch] = useState('');
  const [renamingQRId, setRenamingQRId] = useState<string | null>(null);
  const [renameQRValue, setRenameQRValue] = useState('');
  const { settings: userSettings, updateSetting } = useSettings();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const { isMaximized, toggleMaximize, isDesktop } = useWindowState();
  const qrPreviewRef = useRef<QRPreviewHandle | null>(null);
  const toast = useToast();

  // ── Undo / Redo ──────────────────────────────────────────────────────────────
  const undoStackRef = useRef<QRSettings[]>([]);
  const redoStackRef = useRef<QRSettings[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const settingsRef = useRef<QRSettings>(INITIAL_SETTINGS);
  const pendingUndoSnapshot = useRef<QRSettings | null>(null);
  const undoDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep settingsRef in sync with latest settings (one render behind — intentional)
  useEffect(() => { settingsRef.current = settings; }, [settings]);

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
    // Load logo history from storage
    const storage = getStorageService();
    storage.getSetting('logo_history').then((raw) => {
      try {
        const parsed = JSON.parse(raw ?? '[]');
        if (Array.isArray(parsed)) setLogoHistory(parsed);
      } catch { /* ignore malformed */ }
    });
    // Load saved QRs from storage
    storage.getSetting('saved_qrs').then((raw) => {
      try {
        const parsed = JSON.parse(raw ?? '[]');
        if (Array.isArray(parsed)) setSavedQRs(parsed);
      } catch { /* ignore malformed */ }
    });
    // Restore last used data type
    storage.getSetting('last_data_type').then((dt) => {
      const valid = ['url', 'text', 'email', 'wifi', 'vcard', 'event', 'location'];
      if (dt && valid.includes(dt)) {
        setSettings(prev => ({ ...prev, dataType: dt as QRSettings['dataType'] }));
      }
    });
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    if (undoDebounceTimer.current) clearTimeout(undoDebounceTimer.current);
    pendingUndoSnapshot.current = null;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    redoStackRef.current = [settingsRef.current, ...redoStackRef.current.slice(0, 19)];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    setSettings(prev);
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    if (undoDebounceTimer.current) clearTimeout(undoDebounceTimer.current);
    pendingUndoSnapshot.current = null;
    const next = redoStackRef.current[0];
    undoStackRef.current = [...undoStackRef.current.slice(-19), settingsRef.current];
    redoStackRef.current = redoStackRef.current.slice(1);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    setSettings(next);
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

    // Undo (Ctrl+Z)
    registerShortcut('undo', SHORTCUTS.UNDO, undo);

    // Redo (Ctrl+Shift+Z)
    registerShortcut('redo', SHORTCUTS.REDO, redo);

    // Save QR to gallery (Ctrl+Shift+S)
    registerShortcut('save-qr', { key: 's', ctrl: true, shift: true, preventDefault: true, description: 'Save QR to gallery' }, () => {
      qrPreviewRef.current?.handleSave();
    });

    // Export shortcut (Ctrl+E) - will be handled by QRPreview
    // Save shortcut (Ctrl+S) - will be handled by QRControls

    return () => {
      unregisterShortcut('settings');
      unregisterShortcut('escape');
      unregisterShortcut('undo');
      unregisterShortcut('redo');
      unregisterShortcut('save-qr');
    };
  }, [registerShortcut, unregisterShortcut, undo, redo]);

  /**
   * Update document title to reflect the current QR content.
   */
  useEffect(() => {
    const content = settings.textContent?.trim();
    if (content) {
      document.title = `${content.length > 40 ? content.slice(0, 40) + '…' : content} — QR Studio`;
    } else {
      document.title = 'QR Studio — Professional QR Generator';
    }
  }, [settings.textContent]);

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
    // Capture pre-change snapshot for undo (only the first in a debounce window)
    if (!pendingUndoSnapshot.current) {
      pendingUndoSnapshot.current = settingsRef.current;
    }
    if (undoDebounceTimer.current) clearTimeout(undoDebounceTimer.current);
    undoDebounceTimer.current = setTimeout(() => {
      const snapshot = pendingUndoSnapshot.current;
      if (snapshot) {
        undoStackRef.current = [...undoStackRef.current.slice(-19), snapshot];
        redoStackRef.current = [];
        setCanUndo(true);
        setCanRedo(false);
        pendingUndoSnapshot.current = null;
      }
    }, 800);
    setSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
  };

  const handleLogoUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        updateSettings({ image: dataUrl });
        // Compute new history (deduplicated, max 6) using current state
        const next = [dataUrl, ...logoHistory.filter(u => u !== dataUrl)].slice(0, 6);
        setLogoHistory(next);
        // Persist asynchronously — ignore quota errors (history stays in memory)
        getStorageService()
          .setSetting('logo_history', JSON.stringify(next))
          .catch(() => { /* quota exceeded or unavailable — in-memory only */ });
      }
    };
    reader.readAsDataURL(file);
  }, [logoHistory]);

  const handleSaveQR = useCallback((dataUrl: string) => {
    const label = settings.textContent?.trim().slice(0, 60) || settings.dataType.toUpperCase();
    const entry: SavedQR = {
      id: `sqr_${Date.now()}`,
      label,
      dataUrl,
      dataType: settings.dataType,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...savedQRs].slice(0, 20); // max 20 saved QRs
    setSavedQRs(next);
    toast('QR Code saved to gallery!', 'success');
    getStorageService()
      .setSetting('saved_qrs', JSON.stringify(next))
      .catch(() => {});
  }, [settings, savedQRs, toast]);

  const handleDeleteSavedQR = useCallback((id: string) => {
    const next = savedQRs.filter(q => q.id !== id);
    setSavedQRs(next);
    getStorageService()
      .setSetting('saved_qrs', JSON.stringify(next))
      .catch(() => {});
  }, [savedQRs]);

  const handleStartRenameQR = (qr: SavedQR) => {
    setRenamingQRId(qr.id);
    setRenameQRValue(qr.label);
  };

  const handleCommitRenameQR = useCallback((id: string) => {
    const trimmed = renameQRValue.trim();
    if (!trimmed) { setRenamingQRId(null); return; }
    const next = savedQRs.map(q => q.id === id ? { ...q, label: trimmed } : q);
    setSavedQRs(next);
    setRenamingQRId(null);
    getStorageService()
      .setSetting('saved_qrs', JSON.stringify(next))
      .catch(() => {});
  }, [savedQRs, renameQRValue]);

  // Persist last used data type
  useEffect(() => {
    getStorageService().setSetting('last_data_type', settings.dataType).catch(() => {});
  }, [settings.dataType]);

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-full`}>
      {/* Skip to main content — keyboard accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium">
        Skip to main content
      </a>
      <div className="h-screen flex flex-col font-sans overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300">
        {/* Header - Minimal Enterprise Style */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-6 justify-between shrink-0 z-20 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-indigo-200 dark:shadow-none shadow-lg">
                  <ScanLine className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">QR Studio <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium ml-2 border border-slate-200 dark:border-slate-700">PRO</span></span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               {/* Undo / Redo buttons */}
               <div className="hidden sm:flex items-center gap-1">
                 <button
                   onClick={undo}
                   disabled={!canUndo}
                   className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                   title="Undo (Ctrl+Z)"
                   aria-label="Undo"
                 >
                   <Undo2 className="w-4 h-4" />
                 </button>
                 <button
                   onClick={redo}
                   disabled={!canRedo}
                   className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                   title="Redo (Ctrl+Shift+Z)"
                   aria-label="Redo"
                 >
                   <Redo2 className="w-4 h-4" />
                 </button>
               </div>
               <button 
                onClick={cycleTheme}
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                title={`Theme: ${userSettings.theme}`}
                aria-label={`Switch theme (current: ${userSettings.theme})`}
               >
                 <ThemeIcon />
                 <span className="text-xs uppercase font-medium hidden sm:inline">{userSettings.theme}</span>
               </button>
               <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Settings (Ctrl+,)"
                aria-label="Open settings"
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
               {/* History drawer toggle */}
               <button
                 onClick={() => setShowHistory(prev => !prev)}
                 className={`relative p-2 rounded-lg transition-colors ${showHistory ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                 title="Saved QR Codes"
                 aria-label={showHistory ? 'Close saved QR codes drawer' : 'Open saved QR codes drawer'}
                 aria-expanded={showHistory}
               >
                 <HistoryIcon className="w-5 h-5" />
                 {savedQRs.length > 0 && (
                   <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
                 )}
               </button>
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* QR Preview — shown at top on mobile (order-1), right side on desktop (order-2) */}
          <main id="main-content" className="order-1 md:order-2 flex-none md:flex-1 bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden flex flex-col transition-colors min-h-0 md:min-h-full h-[65vh] md:h-auto shrink-0 md:shrink">
              {/* Background Pattern for Professional Feel */}
              <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1]" 
                  style={{ 
                      backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                      backgroundSize: '24px 24px' 
                  }}>
              </div>

              <div className="flex-1 flex items-start justify-start md:items-center md:justify-center p-4 md:p-8 overflow-auto z-10">
                  <QRPreview ref={qrPreviewRef} settings={settings} onSaveQR={handleSaveQR} />
              </div>

              <div className="h-8 md:h-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 shrink-0 transition-colors">
                   Generated securely in your browser. No data is sent to servers.
              </div>
          </main>

          {/* History Drawer — right side, slides in over preview on desktop */}
          {showHistory && (
            <aside className="order-1 md:order-3 w-full md:w-[300px] lg:w-[320px] border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-20 transition-all shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.12)] md:animate-in md:slide-in-from-right-4 duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <HistoryIcon className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Saved QR Codes</span>
                  {savedQRs.length > 0 && (
                    <span className="text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full px-1.5 py-0.5">{savedQRs.length}/20</span>
                  )}
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-3">
                {/* Search */}
                {savedQRs.length > 0 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search saved QRs…"
                      value={savedQRSearch}
                      onChange={e => setSavedQRSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-500"
                    />
                  </div>
                )}
                {savedQRs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <HistoryIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No saved QR codes yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Click the Save button in the preview to save a QR code here.</p>
                  </div>
                ) : (() => {
                  const filtered = savedQRSearch.trim()
                    ? savedQRs.filter(q => q.label.toLowerCase().includes(savedQRSearch.toLowerCase()))
                    : savedQRs;
                  if (filtered.length === 0) return (
                    <p className="text-xs text-center text-slate-400 dark:text-slate-500 py-8">No results for "{savedQRSearch}"</p>
                  );
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {filtered.map((qr) => (
                        <div
                          key={qr.id}
                          className="group relative flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-all bg-white dark:bg-slate-950 shadow-sm"
                        >
                          {/* Thumbnail */}
                          <div className="aspect-square bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-1.5">
                            <img src={qr.dataUrl} alt={qr.label} className="w-full h-full object-contain rounded" />
                          </div>
                          {/* Label + date */}
                          <div className="px-2 pt-1.5 pb-1.5">
                            {renamingQRId === qr.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  className="flex-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-indigo-400 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                                  value={renameQRValue}
                                  onChange={e => setRenameQRValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleCommitRenameQR(qr.id);
                                    if (e.key === 'Escape') setRenamingQRId(null);
                                  }}
                                />
                                <button onClick={() => handleCommitRenameQR(qr.id)} className="shrink-0 text-indigo-600" title="Save name"><CheckCircle className="w-3 h-3" /></button>
                                <button onClick={() => setRenamingQRId(null)} className="shrink-0 text-slate-400" title="Cancel"><X className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate" title={qr.label}>{qr.label}</p>
                            )}
                            <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-0.5">
                              {new Date(qr.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          {/* Actions overlay on hover */}
                          <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartRenameQR(qr)}
                              title="Rename"
                              className="w-6 h-6 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-md shadow"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = qr.dataUrl;
                                a.download = `qr-${qr.label.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}.png`;
                                a.click();
                              }}
                              title="Download"
                              className="w-6 h-6 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-md shadow"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteSavedQR(qr.id)}
                              title="Delete"
                              className="w-6 h-6 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:text-red-500 rounded-md shadow"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </aside>
          )}

          {/* Controls Sidebar — shown at bottom on mobile (order-2), left side on desktop (order-1) */}
          <aside className="order-2 md:order-1 w-full md:w-[360px] lg:w-[420px] border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-10 md:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-colors flex-1 md:flex-none min-h-0">
               <QRControls 
                  settings={settings} 
                  updateSettings={updateSettings} 
                  onLogoUpload={handleLogoUpload}
                  onRemoveLogo={() => updateSettings({ image: undefined })}
                  logoHistory={logoHistory}
                  onLogoSelect={(dataUrl) => updateSettings({ image: dataUrl })}
               />
          </aside>
        </div>
      </div>
      
      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

/**
 * App - Root component with SettingsProvider + ToastProvider wrapper.
 */
const App: React.FC = () => {
  return (
    <SettingsProvider>
      <ToastProvider>
        <AppContent />
        <ToastContainer />
      </ToastProvider>
    </SettingsProvider>
  );
};

export default App;
