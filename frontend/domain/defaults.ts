import type { ErrorCorrectionLevel, QRSettings } from '../types';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultExportFormat: 'png' | 'jpeg' | 'svg' | 'webp';
  defaultQRSize: number;
  defaultErrorCorrection: ErrorCorrectionLevel;
  autoSave: boolean;
  showHistory: boolean;
  filenameTemplate: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  defaultExportFormat: 'png',
  defaultQRSize: 1000,
  defaultErrorCorrection: 'Q',
  autoSave: false,
  showHistory: true,
  filenameTemplate: '{label}_{date}',
};

export function createDefaultQRSettings(preferences: UserPreferences = DEFAULT_PREFERENCES): QRSettings {
  return {
    width: preferences.defaultQRSize,
    height: preferences.defaultQRSize,
    data: 'https://example.com',
    dataType: 'url',
    textContent: 'https://example.com',
    wifiOptions: { ssid: '', password: '', encryption: 'WPA', hidden: false },
    vcardOptions: {
      firstName: '', lastName: '', phone: '', mobile: '', email: '', website: '',
      company: '', jobTitle: '', street: '', city: '', zip: '', country: '',
    },
    eventOptions: { title: '', location: '', description: '', startTime: '', endTime: '' },
    locationOptions: { latitude: '', longitude: '' },
    margin: 20,
    qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: preferences.defaultErrorCorrection },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.35, margin: 6, crossOrigin: 'anonymous', borderRadius: 0 },
    dotsOptions: { type: 'rounded', color: '#172033' },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: { type: 'extra-rounded', color: '#172033' },
    cornersDotOptions: { type: 'dot', color: '#172033' },
    frameOptions: { style: 'none', text: 'SCAN ME', color: '#172033', textColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' },
  };
}

export const PREFERENCE_STORAGE_KEYS: Record<keyof UserPreferences, string> = {
  theme: 'theme',
  defaultExportFormat: 'default_export_format',
  defaultQRSize: 'default_qr_size',
  defaultErrorCorrection: 'default_error_correction',
  autoSave: 'auto_save_templates',
  showHistory: 'show_history',
  filenameTemplate: 'filename_template',
};
