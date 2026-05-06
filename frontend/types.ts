
export type DotType = 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
export type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
export type CornerDotType = 'dot' | 'square';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type GradientType = 'linear' | 'radial';
export type FrameStyle = 'none' | 'simple' | 'balloon' | 'badge' | 'corners' | 'arrow';
export type QRDataType = 'url' | 'text' | 'email' | 'wifi' | 'vcard' | 'event' | 'location';

export interface GradientOptions {
  type: GradientType;
  rotation: number;
  colorStops: { offset: number; color: string }[];
}

export interface FrameOptions {
  style: FrameStyle;
  text: string;
  color: string;
  textColor: string;
  fontFamily?: string;
}

export interface WifiOptions {
  ssid: string;
  password: string;
  encryption: 'WEP' | 'WPA' | 'nopass';
  hidden: boolean;
}

export interface EventOptions {
  title: string;
  location: string;
  description: string;
  startTime: string; // ISO-like string from input type="datetime-local"
  endTime: string;
}

export interface LocationOptions {
  latitude: string;
  longitude: string;
}

export interface VCardOptions {
  firstName: string;
  lastName: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  company: string;
  jobTitle: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

export interface QRSettings {
  id?: string; // For saved templates
  name?: string; // For saved templates
  
  // Content
  dataType: QRDataType;
  data: string; // The final string passed to the QR generator
  
  // Content State Holders (UI state)
  textContent: string; // URL, Text, Email
  wifiOptions: WifiOptions;
  vcardOptions: VCardOptions;
  eventOptions: EventOptions;
  locationOptions: LocationOptions;

  width: number;
  height: number;
  margin: number;
  image?: string;
  
  qrOptions: {
    typeNumber?: any;
    mode?: 'Byte' | 'Alphanumeric' | 'Numeric' | 'Kanji';
    errorCorrectionLevel: ErrorCorrectionLevel;
  };
  imageOptions: {
    hideBackgroundDots: boolean;
    imageSize: number;
    margin: number;
    crossOrigin?: string;
    /** 0 = square, 0.5 = circle (passed to qr-code-styling borderRadius) */
    borderRadius?: number;
  };
  dotsOptions: {
    type: DotType;
    color: string;
    gradient?: GradientOptions;
  };
  backgroundOptions: {
    color: string;
    gradient?: GradientOptions;
    image?: string; // New: Custom background image
  };
  cornersSquareOptions: {
    type: CornerSquareType;
    color: string;
    gradient?: GradientOptions;
  };
  cornersDotOptions: {
    type: CornerDotType;
    color: string;
    gradient?: GradientOptions;
  };
  frameOptions: FrameOptions;
}

/** A snapshot of a generated QR code saved by the user. */
export interface SavedQR {
  id: string;
  /** Short label derived from the QR content */
  label: string;
  /** 400×400 PNG data URL thumbnail */
  dataUrl: string;
  dataType: QRDataType;
  createdAt: string; // ISO string
}
