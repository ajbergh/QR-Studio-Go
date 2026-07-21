import type { QRSettings } from '../types';
import {
  createDesignPackage,
  normalizeDesignInput,
  parseDesignPackage,
  type DesignRecord,
  type NormalizeResult,
} from '../domain/templatePackage';

const TEMPLATE_KEY = 'qr_studio_templates';
const SETTINGS_PREFIX = 'qr_studio_settings_';
const MIGRATION_KEY = 'qr_studio_migration_v2_status';
export const APP_VERSION = '1.1.0';

interface TemplateSummary {
  id: string;
  name: string;
  settingsJson: string;
  hasLogo: boolean;
  hasBackground: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateDocument {
  id: string;
  name: string;
  settingsJson: string;
  logoBase64?: string;
  backgroundBase64?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendTemplateMetadata {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendImportTemplate {
  id: string;
  name: string;
  settingsJson: string;
  logoData: number[];
  backgroundData: number[];
}

interface DesktopAPI {
  GetReleaseInfo(): Promise<{ version: string; schemaVersion: number; desktop: boolean }>;
  ListTemplates(): Promise<TemplateSummary[]>;
  GetTemplateDocument(id: string): Promise<TemplateDocument>;
  SaveTemplate(request: {
    id: string;
    name: string;
    settingsJson: string;
    logoData: number[];
    backgroundData: number[];
    preserveLogo: boolean;
    preserveBackground: boolean;
  }): Promise<BackendTemplateMetadata>;
  RenameTemplate(id: string, name: string): Promise<void>;
  DuplicateTemplate(sourceId: string, newId: string, newName: string): Promise<BackendTemplateMetadata>;
  DeleteTemplate(id: string): Promise<void>;
  GetTemplateCount(): Promise<number>;
  ImportTemplates(packageJson: string): Promise<{
    total: number;
    imported: number;
    skipped: number;
    failed: Array<{ index: number; name?: string; reason: string }>;
  }>;
  SaveTemplatePackage(defaultFilename: string, packageJson: string): Promise<{ status: string; path?: string }>;
  OpenTemplatePackage(): Promise<string>;
  SaveArtifact(defaultFilename: string, format: string, dataType: string, label: string, data: number[]): Promise<{ status: string; path?: string }>;
  GetHistory(limit: number): Promise<Array<{ id: number; label: string; dataType: string; exportFormat: string; filename: string; createdAt: string }>>;
  ClearHistory(): Promise<number>;
  GetSetting(key: string): Promise<string>;
  SetSetting(key: string, value: string): Promise<void>;
  GetAllSettings(): Promise<Record<string, string>>;
  ResetSettings(): Promise<void>;
}

declare global {
  interface Window {
    go?: { backend?: { DesktopAPI?: DesktopAPI } };
  }
}

export interface PlatformHistoryEntry {
  id: number;
  label: string;
  dataType: string;
  exportFormat: string;
  filename: string;
  createdAt: string;
}

export interface ImportReport {
  total: number;
  imported: number;
  skipped: number;
  failed: Array<{ index: number; name?: string; reason: string }>;
}

export function isDesktopMode(): boolean {
  return Boolean(window.go?.backend?.DesktopAPI);
}

function desktopAPI(): DesktopAPI {
  const api = window.go?.backend?.DesktopAPI;
  if (!api) throw new Error('QR Studio desktop API is unavailable.');
  return api;
}

export async function verifyPlatform(): Promise<void> {
  if (isDesktopMode()) await desktopAPI().GetReleaseInfo();
}

export async function getSetting(key: string): Promise<string | null> {
  if (isDesktopMode()) {
    try {
      const value = await desktopAPI().GetSetting(key);
      return value || null;
    } catch {
      return null;
    }
  }
  return localStorage.getItem(`${SETTINGS_PREFIX}${key}`);
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (isDesktopMode()) await desktopAPI().SetSetting(key, value);
  else localStorage.setItem(`${SETTINGS_PREFIX}${key}`, value);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  if (isDesktopMode()) return desktopAPI().GetAllSettings();
  const result: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(SETTINGS_PREFIX)) result[key.slice(SETTINGS_PREFIX.length)] = localStorage.getItem(key) ?? '';
  }
  return result;
}

export async function resetSettings(): Promise<void> {
  if (isDesktopMode()) {
    await desktopAPI().ResetSettings();
    return;
  }
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(SETTINGS_PREFIX)) keys.push(key);
  }
  keys.forEach(key => localStorage.removeItem(key));
}

export async function listDesigns(): Promise<DesignRecord[]> {
  if (!isDesktopMode()) return readBrowserDesigns();
  const summaries = await desktopAPI().ListTemplates();
  return summaries.map(summary => ({
    id: summary.id,
    name: summary.name,
    settings: withIdentity(JSON.parse(summary.settingsJson) as QRSettings, summary.id, summary.name),
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  }));
}

export async function loadDesign(id: string): Promise<DesignRecord | null> {
  if (!isDesktopMode()) return readBrowserDesigns().find(item => item.id === id) ?? null;
  const template = await desktopAPI().GetTemplateDocument(id);
  if (!template) return null;
  const settings = withIdentity(JSON.parse(template.settingsJson) as QRSettings, template.id, template.name);
  if (template.logoBase64) settings.image = base64ToDataURL(template.logoBase64);
  if (template.backgroundBase64) {
    settings.backgroundOptions = { ...settings.backgroundOptions, image: base64ToDataURL(template.backgroundBase64) };
  }
  return {
    id: template.id,
    name: template.name,
    settings,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function saveDesign(
  record: DesignRecord,
  preserve = { logo: false, background: false },
): Promise<DesignRecord> {
  const normalized = { ...record, id: cleanID(record.id), name: cleanName(record.name) };
  normalized.settings = withIdentity(normalized.settings, normalized.id, normalized.name);

  if (!isDesktopMode()) {
    const current = readBrowserDesigns();
    const index = current.findIndex(item => item.id === normalized.id);
    if (index >= 0) current[index] = normalized;
    else current.unshift(normalized);
    persistBrowserDesigns(current);
    return normalized;
  }

  const logoData = normalized.settings.image ? dataURLToBytes(normalized.settings.image) : [];
  const backgroundData = normalized.settings.backgroundOptions.image ? dataURLToBytes(normalized.settings.backgroundOptions.image) : [];
  const settingsForStorage = structuredClone(normalized.settings);
  delete settingsForStorage.image;
  settingsForStorage.backgroundOptions = { ...settingsForStorage.backgroundOptions, image: undefined };

  const saved = await desktopAPI().SaveTemplate({
    id: normalized.id,
    name: normalized.name,
    settingsJson: JSON.stringify(settingsForStorage),
    logoData,
    backgroundData,
    preserveLogo: preserve.logo && logoData.length === 0,
    preserveBackground: preserve.background && backgroundData.length === 0,
  });
  return {
    id: saved.id,
    name: saved.name,
    settings: withIdentity(normalized.settings, saved.id, saved.name),
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  };
}

export async function renameDesign(id: string, name: string): Promise<void> {
  name = cleanName(name);
  if (isDesktopMode()) {
    await desktopAPI().RenameTemplate(id, name);
    return;
  }
  const designs = readBrowserDesigns().map(item => item.id === id
    ? { ...item, name, settings: withIdentity(item.settings, id, name) }
    : item);
  persistBrowserDesigns(designs);
}

export async function duplicateDesign(source: DesignRecord): Promise<DesignRecord> {
  const id = `tpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const name = cleanName(`${source.name} (Copy)`);
  if (isDesktopMode()) {
    await desktopAPI().DuplicateTemplate(source.id, id, name);
    const duplicate = await loadDesign(id);
    if (!duplicate) throw new Error('The duplicated design could not be loaded.');
    return duplicate;
  }
  return saveDesign({ id, name, settings: withIdentity(structuredClone(source.settings), id, name) });
}

export async function deleteDesign(id: string): Promise<void> {
  if (isDesktopMode()) await desktopAPI().DeleteTemplate(id);
  else persistBrowserDesigns(readBrowserDesigns().filter(item => item.id !== id));
}

export async function exportDesigns(records: DesignRecord[]): Promise<{ status: string; path?: string }> {
  const packageJson = JSON.stringify(createDesignPackage(records, APP_VERSION), null, 2);
  if (isDesktopMode()) return desktopAPI().SaveTemplatePackage(`qr-studio-designs-${dateStamp()}.json`, packageJson);
  browserDownload(`qr-studio-designs-${dateStamp()}.json`, new Blob([packageJson], { type: 'application/json' }));
  return { status: 'saved' };
}

export async function openDesignPackage(): Promise<string | null> {
  if (!isDesktopMode()) return null;
  const value = await desktopAPI().OpenTemplatePackage();
  return value || null;
}

export async function importDesignPackage(raw: string): Promise<ImportReport> {
  const parsed = parseDesignPackage(raw);
  if (!parsed.records.length && parsed.errors.length) {
    return { total: 0, imported: 0, skipped: 0, failed: parsed.errors.map(error => ({ ...error })) };
  }
  if (!isDesktopMode()) return importBrowserDesigns(parsed);

  const templates = parsed.records.map(record => toBackendTemplate(record));
  const packageJson = JSON.stringify({ formatVersion: '1', exportedAt: new Date().toISOString(), templates });
  const result = await desktopAPI().ImportTemplates(packageJson);
  return {
    ...result,
    total: parsed.records.length + parsed.errors.length,
    failed: [...parsed.errors, ...result.failed],
  };
}

export async function migrateLegacyBrowserDesigns(): Promise<ImportReport | null> {
  if (!isDesktopMode() || localStorage.getItem(MIGRATION_KEY)) return null;
  const raw = localStorage.getItem(TEMPLATE_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATION_KEY, JSON.stringify({ completed: true, count: 0, at: new Date().toISOString() }));
    return null;
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return { total: 0, imported: 0, skipped: 0, failed: [{ index: -1, reason: 'Legacy design storage is invalid JSON.' }] };
  }
  const normalized = normalizeDesignInput(input);
  if (!normalized.records.length) {
    return { total: 0, imported: 0, skipped: 0, failed: normalized.errors };
  }

  const before = await desktopAPI().GetTemplateCount();
  const report = await importDesignPackage(JSON.stringify(normalized.records));
  const after = await desktopAPI().GetTemplateCount();
  const verified = after >= before + report.imported;
  if (verified && report.failed.length === 0) {
    localStorage.setItem(MIGRATION_KEY, JSON.stringify({ completed: true, count: report.imported, at: new Date().toISOString() }));
  }
  return report;
}

export async function saveArtifact(
  filename: string,
  format: string,
  dataType: string,
  label: string,
  blob: Blob,
): Promise<{ status: string; path?: string }> {
  if (!isDesktopMode()) {
    browserDownload(filename, blob);
    return { status: 'saved' };
  }
  return desktopAPI().SaveArtifact(
    filename,
    format,
    dataType,
    label,
    Array.from(new Uint8Array(await blob.arrayBuffer())),
  );
}

export async function getHistory(limit = 100): Promise<PlatformHistoryEntry[]> {
  return isDesktopMode() ? desktopAPI().GetHistory(limit) : [];
}

export async function clearHistory(): Promise<number> {
  return isDesktopMode() ? desktopAPI().ClearHistory() : 0;
}

function readBrowserDesigns(): DesignRecord[] {
  const raw = localStorage.getItem(TEMPLATE_KEY);
  if (!raw) return [];
  try {
    return normalizeDesignInput(JSON.parse(raw)).records;
  } catch {
    return [];
  }
}

function persistBrowserDesigns(records: DesignRecord[]): void {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(records));
}

function importBrowserDesigns(parsed: NormalizeResult): ImportReport {
  const current = readBrowserDesigns();
  const ids = new Set(current.map(item => item.id));
  const additions = parsed.records.filter(item => !ids.has(item.id));
  persistBrowserDesigns([...additions, ...current]);
  return {
    total: parsed.records.length + parsed.errors.length,
    imported: additions.length,
    skipped: parsed.records.length - additions.length,
    failed: parsed.errors,
  };
}

function toBackendTemplate(record: DesignRecord): BackendImportTemplate {
  const settings = structuredClone(record.settings);
  const logoData = settings.image ? dataURLToBytes(settings.image) : [];
  const backgroundData = settings.backgroundOptions.image ? dataURLToBytes(settings.backgroundOptions.image) : [];
  delete settings.image;
  settings.backgroundOptions = { ...settings.backgroundOptions, image: undefined };
  return { id: record.id, name: record.name, settingsJson: JSON.stringify(settings), logoData, backgroundData };
}

function withIdentity(settings: QRSettings, id: string, name: string): QRSettings {
  return { ...settings, id, name };
}

function dataURLToBytes(dataURL: string): number[] {
  const match = dataURL.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return [];
  const binary = atob(match[2]);
  return Array.from(binary, character => character.charCodeAt(0));
}

function base64ToDataURL(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return `data:${detectMime(bytes)};base64,${base64}`;
}

function detectMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  const text = new TextDecoder().decode(bytes.slice(0, 256)).trimStart();
  if (text.startsWith('<svg') || text.startsWith('<?xml')) return 'image/svg+xml';
  return 'image/png';
}

function browserDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cleanID(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 160) || `tpl_${Date.now()}`;
}

function cleanName(value: string): string {
  return value.trim().replace(/[\u0000-\u001f]/g, '').slice(0, 120) || 'Untitled Design';
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
