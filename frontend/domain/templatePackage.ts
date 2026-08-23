import type { QRSettings } from '../types';

export const DESIGN_PACKAGE_VERSION = '1';
export const MAX_DESIGNS_PER_PACKAGE = 1000;

export interface DesignRecord {
  id: string;
  name: string;
  settings: QRSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface DesignPackage {
  format: 'qr-studio-design-package';
  formatVersion: typeof DESIGN_PACKAGE_VERSION;
  exportedAt: string;
  appVersion: string;
  templates: DesignRecord[];
}

export interface NormalizeResult {
  records: DesignRecord[];
  errors: Array<{ index: number; reason: string }>;
}

const DATA_TYPES = new Set(['url', 'text', 'email', 'wifi', 'vcard', 'event', 'location']);

export function createDesignPackage(records: DesignRecord[], appVersion: string): DesignPackage {
  return {
    format: 'qr-studio-design-package',
    formatVersion: DESIGN_PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    templates: records,
  };
}

export function parseDesignPackage(raw: string): NormalizeResult {
  if (!raw || raw.length > 32 * 1024 * 1024) {
    return { records: [], errors: [{ index: -1, reason: 'Design package is empty or exceeds 32 MB.' }] };
  }
  try {
    return normalizeDesignInput(JSON.parse(raw));
  } catch (error) {
    return { records: [], errors: [{ index: -1, reason: error instanceof Error ? error.message : 'Invalid JSON.' }] };
  }
}

export function normalizeDesignInput(input: unknown): NormalizeResult {
  let source: unknown[];
  if (Array.isArray(input)) {
    source = input;
  } else if (isRecord(input) && Array.isArray(input.templates)) {
    if (input.formatVersion && String(input.formatVersion) !== DESIGN_PACKAGE_VERSION) {
      return { records: [], errors: [{ index: -1, reason: `Unsupported package version: ${String(input.formatVersion)}` }] };
    }
    source = input.templates;
  } else {
    return { records: [], errors: [{ index: -1, reason: 'Expected a design array or QR Studio design package.' }] };
  }

  if (source.length > MAX_DESIGNS_PER_PACKAGE) {
    return { records: [], errors: [{ index: -1, reason: `Package exceeds ${MAX_DESIGNS_PER_PACKAGE} designs.` }] };
  }

  const records: DesignRecord[] = [];
  const errors: Array<{ index: number; reason: string }> = [];
  const ids = new Set<string>();

  source.forEach((candidate, index) => {
    const normalized = normalizeDesign(candidate);
    if (!normalized) {
      errors.push({ index, reason: 'Design is missing required QR settings.' });
      return;
    }
    if (ids.has(normalized.id)) {
      errors.push({ index, reason: `Duplicate design id: ${normalized.id}` });
      return;
    }
    ids.add(normalized.id);
    records.push(normalized);
  });

  return { records, errors };
}

function normalizeDesign(candidate: unknown): DesignRecord | null {
  if (!isRecord(candidate)) return null;

  // Current package: { id, name, settings }
  const nested = isRecord(candidate.settings) ? candidate.settings : null;
  // Existing web storage: raw QRSettings with id/name at the root.
  const settingsCandidate = nested ?? candidate;
  if (!isQRSettings(settingsCandidate)) return null;

  const id = cleanID(String(candidate.id ?? settingsCandidate.id ?? `tpl_${Date.now()}_${Math.random().toString(16).slice(2)}`));
  const name = cleanName(String(candidate.name ?? settingsCandidate.name ?? 'Imported Design'));
  const settings = structuredCloneSafe(settingsCandidate) as QRSettings;
  settings.id = id;
  settings.name = name;

  return {
    id,
    name,
    settings,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : undefined,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
  };
}

function isQRSettings(value: Record<string, unknown>): boolean {
  return DATA_TYPES.has(String(value.dataType))
    && typeof value.dotsOptions === 'object'
    && typeof value.backgroundOptions === 'object'
    && typeof value.qrOptions === 'object';
}

function cleanID(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 160);
  return cleaned || `tpl_${Date.now()}`;
}

function cleanName(value: string): string {
  const cleaned = value.trim().replace(/[\u0000-\u001f]/g, '').slice(0, 120);
  return cleaned || 'Imported Design';
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
