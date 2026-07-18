import React, { useRef } from 'react';
import type { CornerDotType, CornerSquareType, DotType, ErrorCorrectionLevel, FrameStyle, GradientOptions, QRSettings } from '../../types';

interface DesignEditorProps {
  settings: QRSettings;
  onChange: (patch: Partial<QRSettings>) => void;
}

const PRESETS: Array<{ name: string; description: string; patch: Partial<QRSettings> }> = [
  {
    name: 'Classic', description: 'Maximum compatibility',
    patch: { dotsOptions: { type: 'square', color: '#000000' }, backgroundOptions: { color: '#ffffff' }, cornersSquareOptions: { type: 'square', color: '#000000' }, cornersDotOptions: { type: 'square', color: '#000000' }, frameOptions: { style: 'none', text: 'SCAN ME', color: '#000000', textColor: '#ffffff' } },
  },
  {
    name: 'Modern Blue', description: 'Clean and professional',
    patch: { dotsOptions: { type: 'rounded', color: '#155eef' }, backgroundOptions: { color: '#ffffff' }, cornersSquareOptions: { type: 'extra-rounded', color: '#0b4dd8' }, cornersDotOptions: { type: 'dot', color: '#155eef' }, frameOptions: { style: 'simple', text: 'SCAN ME', color: '#155eef', textColor: '#ffffff' } },
  },
  {
    name: 'Sunset', description: 'High-contrast gradient',
    patch: { dotsOptions: { type: 'classy-rounded', color: '#c2410c', gradient: linearGradient('#f97316', '#be123c') }, backgroundOptions: { color: '#fffaf5' }, cornersSquareOptions: { type: 'extra-rounded', color: '#be123c' }, cornersDotOptions: { type: 'dot', color: '#f97316' }, frameOptions: { style: 'badge', text: 'OPEN', color: '#be123c', textColor: '#ffffff' } },
  },
  {
    name: 'Forest', description: 'Natural and restrained',
    patch: { dotsOptions: { type: 'rounded', color: '#14532d', gradient: linearGradient('#16a34a', '#14532d') }, backgroundOptions: { color: '#f7fee7' }, cornersSquareOptions: { type: 'extra-rounded', color: '#14532d' }, cornersDotOptions: { type: 'dot', color: '#16a34a' }, frameOptions: { style: 'corners', text: 'SCAN', color: '#14532d', textColor: '#ffffff' } },
  },
];

export function DesignEditor({ settings, onChange }: DesignEditorProps) {
  const logoInput = useRef<HTMLInputElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);
  const warnings = getScannabilityWarnings(settings);

  const updateGradient = (enabled: boolean) => {
    onChange({ dotsOptions: { ...settings.dotsOptions, gradient: enabled ? linearGradient(settings.dotsOptions.color, shade(settings.dotsOptions.color, -38)) : undefined } });
  };

  const handleImage = (file: File | undefined, target: 'logo' | 'background') => {
    if (!file) return;
    const limit = target === 'logo' ? 12 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > limit || !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      window.alert(`${target === 'logo' ? 'Logo' : 'Background'} must be PNG, JPEG, WebP, or SVG and under ${limit / 1024 / 1024} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      if (target === 'logo') onChange({ image: reader.result });
      else onChange({ backgroundOptions: { ...settings.backgroundOptions, image: reader.result } });
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="panel-section" aria-labelledby="design-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Design</p><h2 id="design-heading">Style and scan reliability</h2></div>
      </div>

      <div className="preset-grid">
        {PRESETS.map(preset => <button className="preset-card" type="button" key={preset.name} onClick={() => onChange(preset.patch)}><strong>{preset.name}</strong><span>{preset.description}</span></button>)}
      </div>

      <div className="form-grid">
        <Range label={`Size · ${settings.width}px`} min={256} max={4000} step={64} value={settings.width} onChange={value => onChange({ width: value, height: value })} />
        <Range label={`Quiet zone · ${settings.margin}px`} min={0} max={80} step={2} value={settings.margin} onChange={margin => onChange({ margin })} />
        <Field label="Error correction">
          <select value={settings.qrOptions.errorCorrectionLevel} onChange={event => onChange({ qrOptions: { ...settings.qrOptions, errorCorrectionLevel: event.target.value as ErrorCorrectionLevel } })}>
            <option value="L">L · 7%</option><option value="M">M · 15%</option><option value="Q">Q · 25%</option><option value="H">H · 30%</option>
          </select>
        </Field>
        <Field label="Dot style">
          <select value={settings.dotsOptions.type} onChange={event => onChange({ dotsOptions: { ...settings.dotsOptions, type: event.target.value as DotType } })}>
            {['square', 'dots', 'rounded', 'classy', 'classy-rounded', 'extra-rounded'].map(value => <option key={value} value={value}>{title(value)}</option>)}
          </select>
        </Field>
        <ColorField label="Dot color" value={settings.dotsOptions.color} onChange={color => onChange({ dotsOptions: { ...settings.dotsOptions, color, gradient: settings.dotsOptions.gradient ? linearGradient(color, shade(color, -38)) : undefined } })} />
        <ColorField label="Background" value={settings.backgroundOptions.color.slice(0, 7)} onChange={color => onChange({ backgroundOptions: { ...settings.backgroundOptions, color } })} />
        <label className="check-field wide"><input type="checkbox" checked={Boolean(settings.dotsOptions.gradient)} onChange={event => updateGradient(event.target.checked)} /> Use a two-color dot gradient</label>
        {settings.dotsOptions.gradient && <ColorField label="Gradient end" value={settings.dotsOptions.gradient.colorStops[1]?.color ?? settings.dotsOptions.color} onChange={color => onChange({ dotsOptions: { ...settings.dotsOptions, gradient: linearGradient(settings.dotsOptions.gradient!.colorStops[0].color, color) } })} />}
        <Field label="Finder square">
          <select value={settings.cornersSquareOptions.type} onChange={event => onChange({ cornersSquareOptions: { ...settings.cornersSquareOptions, type: event.target.value as CornerSquareType } })}>
            <option value="square">Square</option><option value="dot">Dot</option><option value="extra-rounded">Extra rounded</option>
          </select>
        </Field>
        <ColorField label="Finder color" value={settings.cornersSquareOptions.color} onChange={color => onChange({ cornersSquareOptions: { ...settings.cornersSquareOptions, color } })} />
        <Field label="Finder center">
          <select value={settings.cornersDotOptions.type} onChange={event => onChange({ cornersDotOptions: { ...settings.cornersDotOptions, type: event.target.value as CornerDotType } })}>
            <option value="square">Square</option><option value="dot">Dot</option>
          </select>
        </Field>
        <ColorField label="Finder center color" value={settings.cornersDotOptions.color} onChange={color => onChange({ cornersDotOptions: { ...settings.cornersDotOptions, color } })} />
      </div>

      <div className="subsection">
        <h3>Logo and background</h3>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => logoInput.current?.click()}>{settings.image ? 'Replace logo' : 'Add logo'}</button>
          {settings.image && <button className="ghost-button" type="button" onClick={() => onChange({ image: undefined })}>Remove logo</button>}
          <button className="secondary-button" type="button" onClick={() => backgroundInput.current?.click()}>{settings.backgroundOptions.image ? 'Replace background' : 'Add background'}</button>
          {settings.backgroundOptions.image && <button className="ghost-button" type="button" onClick={() => onChange({ backgroundOptions: { ...settings.backgroundOptions, image: undefined } })}>Remove background</button>}
        </div>
        <input ref={logoInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={event => handleImage(event.target.files?.[0], 'logo')} />
        <input ref={backgroundInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={event => handleImage(event.target.files?.[0], 'background')} />
        {settings.image && <Range label={`Logo size · ${Math.round(settings.imageOptions.imageSize * 100)}%`} min={10} max={50} step={1} value={settings.imageOptions.imageSize * 100} onChange={value => onChange({ imageOptions: { ...settings.imageOptions, imageSize: value / 100 } })} />}
      </div>

      <div className="subsection">
        <h3>Frame</h3>
        <div className="form-grid">
          <Field label="Frame style">
            <select value={settings.frameOptions.style} onChange={event => onChange({ frameOptions: { ...settings.frameOptions, style: event.target.value as FrameStyle } })}>
              {['none', 'simple', 'balloon', 'badge', 'corners', 'arrow'].map(value => <option key={value} value={value}>{title(value)}</option>)}
            </select>
          </Field>
          <Field label="Call to action"><input value={settings.frameOptions.text} maxLength={48} onChange={event => onChange({ frameOptions: { ...settings.frameOptions, text: event.target.value } })} disabled={settings.frameOptions.style === 'none'} /></Field>
          <ColorField label="Frame color" value={settings.frameOptions.color} onChange={color => onChange({ frameOptions: { ...settings.frameOptions, color } })} />
          <ColorField label="Frame text" value={settings.frameOptions.textColor} onChange={textColor => onChange({ frameOptions: { ...settings.frameOptions, textColor } })} />
        </div>
      </div>

      {warnings.length > 0 && <div className="warning-box" role="status"><strong>Scannability checks</strong><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Range({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) { return <label className="field"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field color-field"><span>{label}</span><span><input type="color" value={validHex(value)} onChange={event => onChange(event.target.value)} /><input value={value} onChange={event => onChange(event.target.value)} maxLength={9} /></span></label>; }
function linearGradient(start: string, end: string): GradientOptions { return { type: 'linear', rotation: 45, colorStops: [{ offset: 0, color: start }, { offset: 1, color: end }] }; }
function title(value: string) { return value.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' '); }
function validHex(value: string) { return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'; }

function getScannabilityWarnings(settings: QRSettings): string[] {
  const warnings: string[] = [];
  const contrast = contrastRatio(settings.dotsOptions.color, settings.backgroundOptions.color);
  if (contrast < 4.5) warnings.push(`Dot/background contrast is ${contrast.toFixed(1)}:1; use at least 4.5:1.`);
  if (settings.margin < 12) warnings.push('Increase the quiet zone to at least 12 pixels for more reliable scanning.');
  if (settings.image && settings.imageOptions.imageSize > 0.4) warnings.push('The logo covers more than 40% of the code; reduce it or use H error correction.');
  if (settings.image && settings.qrOptions.errorCorrectionLevel !== 'H') warnings.push('Use H error correction when placing a logo over the code.');
  if (settings.backgroundOptions.image) warnings.push('Background images can reduce contrast; test the exported code on multiple devices.');
  return warnings;
}

function contrastRatio(foreground: string, background: string): number {
  const first = luminance(foreground); const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
function luminance(hex: string): number {
  const normalized = validHex(hex).slice(1);
  const channels = [0, 2, 4].map(offset => parseInt(normalized.slice(offset, offset + 2), 16) / 255).map(value => value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function shade(hex: string, percent: number): string {
  const normalized = validHex(hex).slice(1);
  const amount = Math.round(2.55 * percent);
  const channel = (offset: number) => Math.max(0, Math.min(255, parseInt(normalized.slice(offset, offset + 2), 16) + amount)).toString(16).padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}
