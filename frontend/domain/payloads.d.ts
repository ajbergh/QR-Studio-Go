import type { QRSettings } from '../types';

export function escapeWifi(value?: string): string;
export function escapeVCard(value?: string): string;
export function escapeICalendar(value?: string): string;
export function normalizeURL(value?: string): string;
export function formatLocalDateTime(value?: string): string;
export function validateQRContent(settings: QRSettings): string[];
export function buildQRPayload(settings: QRSettings): string;
