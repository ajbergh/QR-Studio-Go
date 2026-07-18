import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import type { QRSettings } from '../../types';
import { saveArtifact } from '../../services/remediatedPlatform';

export interface StudioPreviewHandle {
  exportCurrent(): Promise<void>;
  copyCurrent(): Promise<void>;
  saveToGallery(): Promise<void>;
}

interface StudioPreviewProps {
  settings: QRSettings;
  payload: string;
  errors: string[];
  exportFormat: 'png' | 'jpeg' | 'svg' | 'webp';
  filenameTemplate: string;
  onExportFormatChange: (value: 'png' | 'jpeg' | 'svg' | 'webp') => void;
  onFilenameTemplateChange: (value: string) => void;
  onGallerySave: (dataURL: string) => void;
  notify: (message: string, kind?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const StudioPreview = forwardRef<StudioPreviewHandle, StudioPreviewProps>(function StudioPreview({
  settings, payload, errors, exportFormat, filenameTemplate, onExportFormatChange, onFilenameTemplateChange, onGallerySave, notify,
}, ref) {
  const mountRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [zoom, setZoom] = useState(72);
  const [busy, setBusy] = useState(false);

  const renderSettings = useMemo(() => ({ ...settings, data: payload || ' ', width: settings.width, height: settings.height }), [settings, payload]);

  useEffect(() => {
    const qr = new QRCodeStyling(renderSettings as never);
    qrRef.current = qr;
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      qr.append(mountRef.current);
    }
    return () => { if (mountRef.current) mountRef.current.innerHTML = ''; };
  }, []);

  useEffect(() => { qrRef.current?.update(renderSettings as never); }, [renderSettings]);

  const exportCurrent = async () => {
    if (errors.length) { notify(errors[0], 'warning'); return; }
    setBusy(true);
    try {
      const blob = await renderArtifact(settings, payload, exportFormat, settings.width);
      const name = resolveFilename(filenameTemplate, payload, settings.width, exportFormat);
      const extension = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
      const result = await saveArtifact(`${name}.${extension}`, exportFormat, settings.dataType, contentLabel(settings, payload), blob);
      if (result.status === 'saved') notify(result.path ? `Saved ${result.path}` : 'QR code exported.', 'success');
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : 'Export failed.', 'error');
    } finally { setBusy(false); }
  };

  const copyCurrent = async () => {
    if (errors.length) { notify(errors[0], 'warning'); return; }
    try {
      const blob = await renderArtifact(settings, payload, 'png', Math.min(settings.width, 1600));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      notify('QR image copied to the clipboard.', 'success');
    } catch (error) {
      console.error(error);
      notify('Clipboard image copy is unavailable in this context.', 'error');
    }
  };

  const saveToGallery = async () => {
    if (errors.length) { notify(errors[0], 'warning'); return; }
    try {
      const blob = await renderArtifact(settings, payload, 'png', 480);
      onGallerySave(await blobToDataURL(blob));
      notify('Saved to the local gallery.', 'success');
    } catch (error) {
      console.error(error);
      notify('Could not save the gallery thumbnail.', 'error');
    }
  };

  useImperativeHandle(ref, () => ({ exportCurrent, copyCurrent, saveToGallery }));

  const exportAllSizes = async () => {
    if (errors.length) { notify(errors[0], 'warning'); return; }
    setBusy(true);
    try {
      for (const size of [256, 512, 1024, 2048]) {
        const blob = await renderArtifact(settings, payload, 'png', size);
        const name = resolveFilename(filenameTemplate, payload, size, 'png');
        await saveArtifact(`${name}.png`, 'png', settings.dataType, contentLabel(settings, payload), blob);
      }
      notify('Exported four PNG sizes.', 'success');
    } catch (error) {
      console.error(error);
      notify('Multi-size export did not complete.', 'error');
    } finally { setBusy(false); }
  };

  const printCurrent = async () => {
    if (errors.length) { notify(errors[0], 'warning'); return; }
    const blob = await renderArtifact(settings, payload, 'png', 1200);
    const dataURL = await blobToDataURL(blob);
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) { notify('Allow pop-ups to print the QR code.', 'warning'); return; }
    popup.document.write(`<!doctype html><html><head><title>QR Studio Print</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui;background:#fff}main{text-align:center;padding:24px}img{max-width:82vmin;max-height:82vmin}.label{max-width:82vmin;overflow-wrap:anywhere;color:#374151}@media print{main{padding:0}}</style></head><body><main><img alt="QR code" src="${dataURL}"><p class="label">${escapeHTML(contentLabel(settings, payload))}</p></main><script>addEventListener('load',()=>print())<\/script></body></html>`);
    popup.document.close();
  };

  return (
    <section className="preview-panel" aria-labelledby="preview-heading">
      <div className="preview-toolbar">
        <div><p className="eyebrow">Live preview</p><h2 id="preview-heading">Scan-ready output</h2></div>
        <div className="zoom-control"><button type="button" onClick={() => setZoom(value => Math.max(35, value - 10))} aria-label="Zoom out">−</button><span>{zoom}%</span><button type="button" onClick={() => setZoom(value => Math.min(110, value + 10))} aria-label="Zoom in">+</button></div>
      </div>

      <div className="preview-stage">
        <div className={`frame-preview frame-${settings.frameOptions.style}`} style={{ '--frame-color': settings.frameOptions.color, '--frame-text': settings.frameOptions.textColor, transform: `scale(${zoom / 100})` } as React.CSSProperties}>
          <div ref={mountRef} className="qr-mount" data-testid="qr-preview" />
          {settings.frameOptions.style !== 'none' && <div className="frame-caption">{settings.frameOptions.text}</div>}
        </div>
      </div>

      <div className="export-controls">
        <label className="field"><span>Format</span><select value={exportFormat} onChange={event => onExportFormatChange(event.target.value as typeof exportFormat)}><option value="png">PNG</option><option value="svg">SVG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></label>
        <label className="field grow"><span>Filename pattern</span><input value={filenameTemplate} onChange={event => onFilenameTemplateChange(event.target.value)} placeholder="{label}_{date}_{size}" /></label>
      </div>
      <p className="token-help">Tokens: {'{label}'} · {'{date}'} · {'{size}'} · {'{format}'}</p>

      <div className="primary-actions">
        <button className="primary-button" type="button" disabled={busy || errors.length > 0} onClick={exportCurrent}>{busy ? 'Working…' : 'Export QR'}</button>
        <button className="secondary-button" type="button" disabled={busy || errors.length > 0} onClick={copyCurrent}>Copy</button>
        <button className="secondary-button" type="button" disabled={busy || errors.length > 0} onClick={saveToGallery}>Gallery</button>
        <button className="secondary-button" type="button" disabled={busy || errors.length > 0} onClick={printCurrent}>Print</button>
        <button className="ghost-button" type="button" disabled={busy || errors.length > 0} onClick={exportAllSizes}>4 sizes</button>
      </div>
      <details className="payload-details"><summary>Encoded payload</summary><pre>{payload}</pre></details>
    </section>
  );
});

async function renderArtifact(settings: QRSettings, payload: string, format: 'png' | 'jpeg' | 'svg' | 'webp', size: number): Promise<Blob> {
  const scaled = { ...settings, data: payload, width: size, height: size };
  const qr = new QRCodeStyling(scaled as never);
  if (settings.frameOptions.style === 'none') {
    const raw = await qr.getRawData(format);
    if (!raw) throw new Error('The QR renderer returned no data.');
    return raw as Blob;
  }
  if (format === 'svg') return renderFramedSVG(qr, settings, size);
  return renderFramedRaster(qr, settings, size, format);
}

async function renderFramedRaster(qr: QRCodeStyling, settings: QRSettings, size: number, format: 'png' | 'jpeg' | 'webp'): Promise<Blob> {
  const raw = await qr.getRawData('png');
  if (!raw) throw new Error('Could not render the QR image.');
  const image = await createImageBitmap(raw as Blob);
  const padding = Math.round(size * 0.055);
  const captionHeight = Math.round(size * 0.18);
  const canvas = document.createElement('canvas');
  canvas.width = size + padding * 2;
  canvas.height = size + padding * 2 + captionHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');

  context.fillStyle = settings.frameOptions.color;
  roundedRect(context, 0, 0, canvas.width, canvas.height, Math.max(12, padding));
  context.fill();
  context.fillStyle = '#ffffff';
  context.fillRect(padding, padding, size, size);
  context.drawImage(image, padding, padding, size, size);
  context.fillStyle = settings.frameOptions.textColor;
  context.font = `700 ${Math.max(18, Math.round(size * 0.065))}px ${settings.frameOptions.fontFamily || 'Arial, sans-serif'}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(settings.frameOptions.text.slice(0, 48), canvas.width / 2, padding * 2 + size + captionHeight / 2, canvas.width - padding * 2);
  image.close();

  const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed.')), mime, 0.94));
}

async function renderFramedSVG(qr: QRCodeStyling, settings: QRSettings, size: number): Promise<Blob> {
  const raw = await qr.getRawData('svg');
  if (!raw) throw new Error('Could not render SVG data.');
  const text = await (raw as Blob).text();
  const inner = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)?.[1] ?? text;
  const padding = Math.round(size * 0.055);
  const captionHeight = Math.round(size * 0.18);
  const width = size + padding * 2;
  const height = size + padding * 2 + captionHeight;
  const caption = escapeXML(settings.frameOptions.text.slice(0, 48));
  const family = escapeXML(settings.frameOptions.fontFamily || 'Arial, sans-serif');
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="${padding}" fill="${escapeXML(settings.frameOptions.color)}"/><rect x="${padding}" y="${padding}" width="${size}" height="${size}" fill="#fff"/><svg x="${padding}" y="${padding}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${inner}</svg><text x="${width / 2}" y="${padding * 2 + size + captionHeight / 2}" text-anchor="middle" dominant-baseline="middle" font-family="${family}" font-size="${Math.max(18, Math.round(size * 0.065))}" font-weight="700" fill="${escapeXML(settings.frameOptions.textColor)}">${caption}</text></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  if ('roundRect' in context) { context.beginPath(); context.roundRect(x, y, width, height, radius); return; }
  context.beginPath(); context.moveTo(x + radius, y); context.arcTo(x + width, y, x + width, y + height, radius); context.arcTo(x + width, y + height, x, y + height, radius); context.arcTo(x, y + height, x, y, radius); context.arcTo(x, y, x + width, y, radius); context.closePath();
}

function resolveFilename(template: string, payload: string, size: number, format: string): string {
  const label = payload.slice(0, 48).replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'qr-code';
  const date = new Date().toISOString().slice(0, 10);
  return template.replace(/\{label\}/gi, label).replace(/\{date\}/gi, date).replace(/\{size\}/gi, String(size)).replace(/\{format\}/gi, format).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, '_').slice(0, 180) || 'qr-code';
}
function contentLabel(settings: QRSettings, payload: string) { return (settings.name || settings.textContent || payload || settings.dataType).slice(0, 120); }
function escapeXML(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function escapeHTML(value: string) { return escapeXML(value); }
function blobToDataURL(blob: Blob): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
