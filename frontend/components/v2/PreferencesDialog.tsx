import React, { useEffect, useRef } from 'react';
import type { UserPreferences } from '../../domain/defaults';

interface PreferencesDialogProps {
  open: boolean;
  preferences: UserPreferences;
  onClose: () => void;
  onChange: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  onReset: () => void;
}

export function PreferencesDialog({ open, preferences, onClose, onChange, onReset }: PreferencesDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('button,select,input')?.focus();
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); previous?.focus(); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="preferences-title" ref={dialogRef}>
        <div className="dialog-header"><div><p className="eyebrow">Application</p><h2 id="preferences-title">Preferences</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close preferences">×</button></div>
        <div className="dialog-body form-grid">
          <Field label="Theme"><select value={preferences.theme} onChange={event => onChange('theme', event.target.value as UserPreferences['theme'])}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></Field>
          <Field label="Default format"><select value={preferences.defaultExportFormat} onChange={event => onChange('defaultExportFormat', event.target.value as UserPreferences['defaultExportFormat'])}><option value="png">PNG</option><option value="svg">SVG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></Field>
          <Field label="Default QR size"><input type="number" min={256} max={4000} step={64} value={preferences.defaultQRSize} onChange={event => onChange('defaultQRSize', clamp(Number(event.target.value), 256, 4000))} /></Field>
          <Field label="Default error correction"><select value={preferences.defaultErrorCorrection} onChange={event => onChange('defaultErrorCorrection', event.target.value as UserPreferences['defaultErrorCorrection'])}><option value="L">L · 7%</option><option value="M">M · 15%</option><option value="Q">Q · 25%</option><option value="H">H · 30%</option></select></Field>
          <label className="check-field wide"><input type="checkbox" checked={preferences.autoSave} onChange={event => onChange('autoSave', event.target.checked)} /> Auto-save the active draft</label>
          <label className="check-field wide"><input type="checkbox" checked={preferences.showHistory} onChange={event => onChange('showHistory', event.target.checked)} /> Record redacted desktop export history</label>
          <Field label="Filename template" wide><input value={preferences.filenameTemplate} onChange={event => onChange('filenameTemplate', event.target.value)} /></Field>
          <p className="wide helper-text">Defaults apply when creating or resetting a design. Existing designs are not silently changed.</p>
        </div>
        <div className="dialog-footer"><button className="ghost-button" type="button" onClick={onReset}>Reset defaults</button><button className="primary-button" type="button" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? 'field wide' : 'field'}><span>{label}</span>{children}</label>; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)); }
