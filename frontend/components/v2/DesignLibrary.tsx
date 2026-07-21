import React, { useMemo, useRef, useState } from 'react';
import type { DesignRecord } from '../../domain/templatePackage';
import { isDesktopMode } from '../../services/remediatedPlatform';

interface DesignLibraryProps {
  designs: DesignRecord[];
  activeId?: string;
  busy: boolean;
  onSaveCurrent: (name: string) => Promise<void>;
  onLoad: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDuplicate: (record: DesignRecord) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExport: () => Promise<void>;
  onImportText: (raw: string) => Promise<void>;
  onOpenNativeImport: () => Promise<void>;
}

export function DesignLibrary({ designs, activeId, busy, onSaveCurrent, onLoad, onRename, onDuplicate, onDelete, onExport, onImportText, onOpenNativeImport }: DesignLibraryProps) {
  const [search, setSearch] = useState('');
  const [saveName, setSaveName] = useState('My Design');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => designs.filter(item => item.name.toLowerCase().includes(search.toLowerCase())), [designs, search]);

  const importBrowserFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 32 * 1024 * 1024) throw new Error('Design package exceeds 32 MB.');
    await onImportText(await file.text());
  };

  return (
    <section className="panel-section" aria-labelledby="library-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Design library</p><h2 id="library-heading">Reusable, versioned designs</h2></div>
        <span className="count-badge">{designs.length}</span>
      </div>

      <div className="inline-save">
        <input value={saveName} maxLength={120} onChange={event => setSaveName(event.target.value)} aria-label="Design name" />
        <button className="primary-button" type="button" disabled={busy || !saveName.trim()} onClick={() => onSaveCurrent(saveName.trim())}>Save design</button>
      </div>

      <div className="library-actions">
        <button className="secondary-button" type="button" disabled={busy || designs.length === 0} onClick={onExport}>Export package</button>
        {isDesktopMode() ? (
          <button className="secondary-button" type="button" disabled={busy} onClick={onOpenNativeImport}>Import package</button>
        ) : (
          <button className="secondary-button" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>Import package</button>
        )}
        <input ref={inputRef} type="file" hidden accept="application/json,.json" onChange={event => { importBrowserFile(event.target.files?.[0]).catch(console.error); event.currentTarget.value = ''; }} />
      </div>

      <label className="field"><span>Search designs</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name" /></label>

      <div className="design-list">
        {filtered.length === 0 && <div className="empty-state">No matching saved designs.</div>}
        {filtered.map(record => (
          <article key={record.id} className={record.id === activeId ? 'design-card active' : 'design-card'}>
            <button className="design-load" type="button" onClick={() => onLoad(record.id)}>
              <span className="design-swatch" style={{ background: record.settings.dotsOptions.gradient ? `linear-gradient(135deg, ${record.settings.dotsOptions.gradient.colorStops[0].color}, ${record.settings.dotsOptions.gradient.colorStops[1]?.color})` : record.settings.dotsOptions.color }} />
              <span><strong>{record.name}</strong><small>{record.settings.dataType.toUpperCase()} · {record.settings.dotsOptions.type}</small></span>
            </button>
            {renaming === record.id ? (
              <div className="rename-row"><input autoFocus value={renameValue} maxLength={120} onChange={event => setRenameValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && renameValue.trim()) { onRename(record.id, renameValue.trim()); setRenaming(null); } if (event.key === 'Escape') setRenaming(null); }} /><button type="button" className="ghost-button" onClick={() => { if (renameValue.trim()) onRename(record.id, renameValue.trim()); setRenaming(null); }}>Save</button></div>
            ) : (
              <div className="card-actions">
                <button type="button" onClick={() => { setRenaming(record.id); setRenameValue(record.name); }}>Rename</button>
                <button type="button" onClick={() => onDuplicate(record)}>Duplicate</button>
                <button type="button" className="danger-link" onClick={() => { if (window.confirm(`Delete “${record.name}”?`)) onDelete(record.id); }}>Delete</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
