import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildQRPayload, validateQRContent } from './domain/payloads.js';
import { createDefaultQRSettings, DEFAULT_PREFERENCES, PREFERENCE_STORAGE_KEYS, type UserPreferences } from './domain/defaults';
import type { DesignRecord } from './domain/templatePackage';
import type { QRSettings, SavedQR } from './types';
import { ContentEditor } from './components/v2/ContentEditor';
import { DesignEditor } from './components/v2/DesignEditor';
import { DesignLibrary } from './components/v2/DesignLibrary';
import { PreferencesDialog } from './components/v2/PreferencesDialog';
import { StudioPreview, type StudioPreviewHandle } from './components/v2/StudioPreview';
import {
  APP_VERSION,
  clearHistory,
  deleteDesign,
  duplicateDesign,
  exportDesigns,
  getAllSettings,
  getHistory,
  getSetting,
  importDesignPackage,
  isDesktopMode,
  listDesigns,
  loadDesign,
  migrateLegacyBrowserDesigns,
  openDesignPackage,
  renameDesign,
  resetSettings,
  saveDesign,
  setSetting,
  verifyPlatform,
  type PlatformHistoryEntry,
} from './services/remediatedPlatform';

type EditorTab = 'content' | 'design' | 'library';
type NoticeKind = 'success' | 'error' | 'warning' | 'info';
interface Notice { id: number; message: string; kind: NoticeKind }

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [settings, setSettings] = useState<QRSettings>(() => createDefaultQRSettings());
  const [designs, setDesigns] = useState<DesignRecord[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string>();
  const [tab, setTab] = useState<EditorTab>('content');
  const [busy, setBusy] = useState(true);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [history, setHistory] = useState<PlatformHistoryEntry[]>([]);
  const [gallery, setGallery] = useState<SavedQR[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const previewRef = useRef<StudioPreviewHandle>(null);
  const undoStack = useRef<QRSettings[]>([]);
  const redoStack = useRef<QRSettings[]>([]);
  const settingsRef = useRef(settings);
  const undoTimer = useRef<number>();
  const pendingSnapshot = useRef<QRSettings>();

  const payload = useMemo(() => buildQRPayload(settings), [settings]);
  const contentErrors = useMemo(() => validateQRContent(settings), [settings]);

  const notify = useCallback((message: string, kind: NoticeKind = 'info') => {
    const id = Date.now() + Math.random();
    setNotices(current => [...current.slice(-3), { id, message, kind }]);
    window.setTimeout(() => setNotices(current => current.filter(notice => notice.id !== id)), 4500);
  }, []);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await verifyPlatform();
        const stored = await getAllSettings();
        const loadedPreferences = parsePreferences(stored);
        if (cancelled) return;
        setPreferences(loadedPreferences);

        const draftRaw = await getSetting('autosave_draft');
        const draft = draftRaw ? safeParse<QRSettings>(draftRaw) : null;
        setSettings(draft ? normalizeLoadedSettings(draft, loadedPreferences) : createDefaultQRSettings(loadedPreferences));

        const migration = await migrateLegacyBrowserDesigns();
        if (migration?.imported) notify(`Migrated ${migration.imported} browser design${migration.imported === 1 ? '' : 's'} to SQLite.`, 'success');
        if (migration?.failed.length) notify(`Migration kept the source data because ${migration.failed.length} record${migration.failed.length === 1 ? '' : 's'} need attention.`, 'warning');

        const [savedDesigns, savedGallery] = await Promise.all([
          listDesigns(),
          getSetting('saved_qrs').then(raw => safeParse<SavedQR[]>(raw ?? '') ?? []),
        ]);
        if (cancelled) return;
        setDesigns(savedDesigns);
        setGallery(Array.isArray(savedGallery) ? savedGallery.slice(0, 20) : []);
      } catch (error) {
        console.error(error);
        notify(error instanceof Error ? error.message : 'QR Studio could not initialize.', 'error');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [notify]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => root.dataset.theme = preferences.theme === 'system' ? (media.matches ? 'dark' : 'light') : preferences.theme;
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preferences.theme]);

  useEffect(() => {
    setSettings(current => current.data === payload ? current : { ...current, data: payload });
  }, [payload]);

  useEffect(() => {
    if (!preferences.autoSave || busy) return;
    const timer = window.setTimeout(() => setSetting('autosave_draft', JSON.stringify(settings)).catch(error => console.error('Auto-save failed', error)), 900);
    return () => window.clearTimeout(timer);
  }, [settings, preferences.autoSave, busy]);

  const updateSettings = useCallback((patch: Partial<QRSettings>) => {
    if (!pendingSnapshot.current) pendingSnapshot.current = structuredClone(settingsRef.current);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => {
      if (pendingSnapshot.current) {
        undoStack.current = [...undoStack.current.slice(-29), pendingSnapshot.current];
        redoStack.current = [];
        pendingSnapshot.current = undefined;
      }
    }, 500);
    setSettings(current => ({ ...current, ...patch }));
  }, []);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(structuredClone(settingsRef.current));
    setSettings(previous);
  }, []);
  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(structuredClone(settingsRef.current));
    setSettings(next);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if (modifier && event.key === ',') { event.preventDefault(); setPreferencesOpen(true); }
      if (modifier && event.key.toLowerCase() === 'e') { event.preventDefault(); previewRef.current?.exportCurrent(); }
      if (modifier && event.shiftKey && event.key.toLowerCase() === 's') { event.preventDefault(); previewRef.current?.saveToGallery(); }
      if (event.key === 'Escape') { setPreferencesOpen(false); setHistoryOpen(false); setGalleryOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [redo, undo]);

  const refreshDesigns = async () => setDesigns(await listDesigns());

  const saveCurrentDesign = async (name: string) => {
    setBusy(true);
    try {
      const id = activeDesignId ?? `tpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const record = await saveDesign({ id, name, settings: { ...settings, id, name } }, { logo: Boolean(activeDesignId), background: Boolean(activeDesignId) });
      setActiveDesignId(record.id);
      setSettings(record.settings);
      await refreshDesigns();
      notify(`Saved “${record.name}”.`, 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Design save failed.', 'error'); }
    finally { setBusy(false); }
  };

  const loadSavedDesign = async (id: string) => {
    setBusy(true);
    try {
      const record = await loadDesign(id);
      if (!record) throw new Error('Design not found.');
      setSettings(normalizeLoadedSettings(record.settings, preferences));
      setActiveDesignId(id);
      setTab('design');
      undoStack.current = []; redoStack.current = [];
      notify(`Loaded “${record.name}”.`, 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Design load failed.', 'error'); }
    finally { setBusy(false); }
  };

  const handleRename = async (id: string, name: string) => { try { await renameDesign(id, name); await refreshDesigns(); if (activeDesignId === id) setSettings(current => ({ ...current, name })); notify('Design renamed.', 'success'); } catch (error) { notify(error instanceof Error ? error.message : 'Rename failed.', 'error'); } };
  const handleDuplicate = async (record: DesignRecord) => { try { const full = await loadDesign(record.id) ?? record; const duplicate = await duplicateDesign(full); await refreshDesigns(); notify(`Duplicated as “${duplicate.name}”.`, 'success'); } catch (error) { notify(error instanceof Error ? error.message : 'Duplicate failed.', 'error'); } };
  const handleDelete = async (id: string) => { try { await deleteDesign(id); if (activeDesignId === id) setActiveDesignId(undefined); await refreshDesigns(); notify('Design deleted.', 'success'); } catch (error) { notify(error instanceof Error ? error.message : 'Delete failed.', 'error'); } };

  const handleExportDesigns = async () => {
    try {
      const full = (await Promise.all(designs.map(item => loadDesign(item.id)))).filter((item): item is DesignRecord => Boolean(item));
      const result = await exportDesigns(full);
      if (result.status === 'saved') notify(result.path ? `Saved ${result.path}` : 'Design package exported.', 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Design export failed.', 'error'); }
  };

  const handleImportText = async (raw: string) => {
    setBusy(true);
    try {
      const report = await importDesignPackage(raw);
      await refreshDesigns();
      if (report.imported) notify(`Imported ${report.imported} design${report.imported === 1 ? '' : 's'}${report.skipped ? `; skipped ${report.skipped} duplicate${report.skipped === 1 ? '' : 's'}` : ''}.`, 'success');
      if (report.failed.length) notify(`${report.failed.length} design record${report.failed.length === 1 ? '' : 's'} could not be imported.`, 'warning');
    } catch (error) { notify(error instanceof Error ? error.message : 'Import failed.', 'error'); }
    finally { setBusy(false); }
  };

  const handleNativeImport = async () => { const raw = await openDesignPackage(); if (raw) await handleImportText(raw); };

  const updatePreference = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(current => ({ ...current, [key]: value }));
    try { await setSetting(PREFERENCE_STORAGE_KEYS[key], String(value)); } catch (error) { notify(error instanceof Error ? error.message : 'Preference could not be saved.', 'error'); }
  };

  const resetPreferences = async () => {
    await resetSettings();
    setPreferences(DEFAULT_PREFERENCES);
    notify('Preferences reset. New designs will use the defaults.', 'success');
  };

  const resetDesign = () => {
    setSettings(createDefaultQRSettings(preferences));
    setActiveDesignId(undefined);
    undoStack.current = []; redoStack.current = [];
    notify('Started a new design using current defaults.', 'info');
  };

  const addGalleryItem = async (dataURL: string) => {
    const item: SavedQR = { id: `sqr_${Date.now()}`, label: (settings.name || settings.textContent || payload || settings.dataType).slice(0, 60), dataUrl: dataURL, dataType: settings.dataType, createdAt: new Date().toISOString() };
    const next = [item, ...gallery].slice(0, 20);
    setGallery(next);
    await setSetting('saved_qrs', JSON.stringify(next));
  };

  const openHistory = async () => { setHistoryOpen(true); try { setHistory(await getHistory(100)); } catch (error) { notify(error instanceof Error ? error.message : 'History could not be loaded.', 'error'); } };
  const clearExportHistory = async () => { await clearHistory(); setHistory([]); notify('Export history cleared.', 'success'); };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true">▦</span><div><strong>QR Studio</strong><small>v{APP_VERSION}{isDesktopMode() ? ' · Desktop' : ' · Web'}</small></div></div>
        <nav className="header-actions" aria-label="Application actions">
          <button type="button" onClick={undo} disabled={!undoStack.current.length}>Undo</button>
          <button type="button" onClick={redo} disabled={!redoStack.current.length}>Redo</button>
          <button type="button" onClick={resetDesign}>New</button>
          <button type="button" onClick={() => setGalleryOpen(true)}>Gallery</button>
          {isDesktopMode() && preferences.showHistory && <button type="button" onClick={openHistory}>History</button>}
          <button type="button" onClick={() => setPreferencesOpen(true)}>Preferences</button>
        </nav>
      </header>

      <main className="workspace">
        <aside className="editor-panel">
          <div className="editor-tabs" role="tablist">
            {(['content', 'design', 'library'] as EditorTab[]).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
          </div>
          <div className="editor-scroll">
            {tab === 'content' && <ContentEditor settings={settings} errors={contentErrors} onChange={updateSettings} />}
            {tab === 'design' && <DesignEditor settings={settings} onChange={updateSettings} />}
            {tab === 'library' && <DesignLibrary designs={designs} activeId={activeDesignId} busy={busy} onSaveCurrent={saveCurrentDesign} onLoad={loadSavedDesign} onRename={handleRename} onDuplicate={handleDuplicate} onDelete={handleDelete} onExport={handleExportDesigns} onImportText={handleImportText} onOpenNativeImport={handleNativeImport} />}
          </div>
        </aside>

        <StudioPreview ref={previewRef} settings={settings} payload={payload} errors={contentErrors} exportFormat={preferences.defaultExportFormat} filenameTemplate={preferences.filenameTemplate} onExportFormatChange={value => updatePreference('defaultExportFormat', value)} onFilenameTemplateChange={value => updatePreference('filenameTemplate', value)} onGallerySave={addGalleryItem} notify={notify} />
      </main>

      <PreferencesDialog open={preferencesOpen} preferences={preferences} onClose={() => setPreferencesOpen(false)} onChange={updatePreference} onReset={resetPreferences} />
      {galleryOpen && <GalleryDrawer items={gallery} onClose={() => setGalleryOpen(false)} onDelete={async id => { const next = gallery.filter(item => item.id !== id); setGallery(next); await setSetting('saved_qrs', JSON.stringify(next)); }} />}
      {historyOpen && <HistoryDrawer entries={history} onClose={() => setHistoryOpen(false)} onClear={clearExportHistory} />}
      <div className="toast-stack" aria-live="polite">{notices.map(notice => <div key={notice.id} className={`toast ${notice.kind}`}>{notice.message}</div>)}</div>
      {busy && <div className="busy-indicator" role="status">Working…</div>}
    </div>
  );
}

function GalleryDrawer({ items, onClose, onDelete }: { items: SavedQR[]; onClose: () => void; onDelete: (id: string) => void }) {
  return <Drawer title="Gallery" onClose={onClose}>{items.length === 0 ? <div className="empty-state">No saved QR snapshots.</div> : <div className="gallery-grid">{items.map(item => <article key={item.id} className="gallery-card"><img src={item.dataUrl} alt={`QR code for ${item.label}`} /><strong>{item.label}</strong><small>{new Date(item.createdAt).toLocaleString()}</small><button className="danger-link" type="button" onClick={() => onDelete(item.id)}>Delete</button></article>)}</div>}</Drawer>;
}
function HistoryDrawer({ entries, onClose, onClear }: { entries: PlatformHistoryEntry[]; onClose: () => void; onClear: () => void }) {
  return <Drawer title="Redacted export history" onClose={onClose} footer={<button className="ghost-button" type="button" disabled={!entries.length} onClick={onClear}>Clear history</button>}>{entries.length === 0 ? <div className="empty-state">No desktop exports recorded.</div> : <div className="history-list">{entries.map(entry => <article key={entry.id}><div><strong>{entry.label || entry.dataType}</strong><small>{entry.filename} · {entry.exportFormat.toUpperCase()}</small></div><time>{new Date(entry.createdAt).toLocaleString()}</time></article>)}</div>}</Drawer>;
}
function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) { return <div className="drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside className="drawer" role="dialog" aria-modal="true" aria-label={title}><div className="drawer-header"><h2>{title}</h2><button className="icon-button" type="button" onClick={onClose}>×</button></div><div className="drawer-body">{children}</div>{footer && <div className="drawer-footer">{footer}</div>}</aside></div>; }

function parsePreferences(values: Record<string, string>): UserPreferences {
  return {
    theme: ['light', 'dark', 'system'].includes(values.theme) ? values.theme as UserPreferences['theme'] : DEFAULT_PREFERENCES.theme,
    defaultExportFormat: ['png', 'jpeg', 'svg', 'webp'].includes(values.default_export_format) ? values.default_export_format as UserPreferences['defaultExportFormat'] : DEFAULT_PREFERENCES.defaultExportFormat,
    defaultQRSize: clampNumber(Number(values.default_qr_size), 256, 4000, DEFAULT_PREFERENCES.defaultQRSize),
    defaultErrorCorrection: ['L', 'M', 'Q', 'H'].includes(values.default_error_correction) ? values.default_error_correction as UserPreferences['defaultErrorCorrection'] : DEFAULT_PREFERENCES.defaultErrorCorrection,
    autoSave: values.auto_save_templates === 'true',
    showHistory: values.show_history !== 'false',
    filenameTemplate: values.filename_template || DEFAULT_PREFERENCES.filenameTemplate,
  };
}
function normalizeLoadedSettings(value: QRSettings, preferences: UserPreferences): QRSettings { const fallback = createDefaultQRSettings(preferences); return { ...fallback, ...value, qrOptions: { ...fallback.qrOptions, ...value.qrOptions }, imageOptions: { ...fallback.imageOptions, ...value.imageOptions }, dotsOptions: { ...fallback.dotsOptions, ...value.dotsOptions }, backgroundOptions: { ...fallback.backgroundOptions, ...value.backgroundOptions }, cornersSquareOptions: { ...fallback.cornersSquareOptions, ...value.cornersSquareOptions }, cornersDotOptions: { ...fallback.cornersDotOptions, ...value.cornersDotOptions }, frameOptions: { ...fallback.frameOptions, ...value.frameOptions } }; }
function safeParse<T>(value: string): T | null { try { return JSON.parse(value) as T; } catch { return null; } }
function clampNumber(value: number, min: number, max: number, fallback: number) { return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback; }
