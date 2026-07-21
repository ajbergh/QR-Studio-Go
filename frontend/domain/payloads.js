const CRLF = '\r\n';

export function escapeWifi(value = '') {
  return String(value).replace(/([\\;,:"])/g, '\\$1');
}

export function escapeVCard(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function escapeICalendar(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function normalizeURL(value = '') {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function formatLocalDateTime(value = '') {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '';
  return `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}${match[6] || '00'}`;
}

export function validateQRContent(settings) {
  const errors = [];
  const type = settings?.dataType;
  if (type === 'url' && !String(settings.textContent || '').trim()) errors.push('Enter a URL.');
  if (type === 'text' && !String(settings.textContent || '').trim()) errors.push('Enter text.');
  if (type === 'email') {
    const email = String(settings.textContent || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Enter a valid email address.');
  }
  if (type === 'wifi' && !String(settings.wifiOptions?.ssid || '').trim()) errors.push('Wi-Fi SSID is required.');
  if (type === 'vcard' && !String(settings.vcardOptions?.firstName || settings.vcardOptions?.lastName || '').trim()) errors.push('A contact name is required.');
  if (type === 'event') {
    const event = settings.eventOptions || {};
    if (!String(event.title || '').trim()) errors.push('Event title is required.');
    const start = formatLocalDateTime(event.startTime);
    const end = formatLocalDateTime(event.endTime);
    if (!start || !end) errors.push('Event start and end times are required.');
    if (start && end && end <= start) errors.push('Event end time must be after the start time.');
  }
  if (type === 'location') {
    const lat = Number(settings.locationOptions?.latitude);
    const lon = Number(settings.locationOptions?.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push('Latitude must be between -90 and 90.');
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.push('Longitude must be between -180 and 180.');
  }
  return errors;
}

export function buildQRPayload(settings) {
  switch (settings.dataType) {
    case 'url': return normalizeURL(settings.textContent);
    case 'text': return String(settings.textContent || '');
    case 'email': return `mailto:${String(settings.textContent || '').trim()}`;
    case 'wifi': {
      const wifi = settings.wifiOptions || {};
      const encryption = wifi.encryption || 'WPA';
      const password = encryption === 'nopass' ? '' : `P:${escapeWifi(wifi.password || '')};`;
      return `WIFI:T:${encryption};S:${escapeWifi(wifi.ssid || '')};${password}H:${wifi.hidden ? 'true' : 'false'};;`;
    }
    case 'vcard': {
      const v = settings.vcardOptions || {};
      const fullName = `${v.firstName || ''} ${v.lastName || ''}`.trim();
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeVCard(v.lastName)};${escapeVCard(v.firstName)};;;`, `FN:${escapeVCard(fullName)}`];
      if (v.company) lines.push(`ORG:${escapeVCard(v.company)}`);
      if (v.jobTitle) lines.push(`TITLE:${escapeVCard(v.jobTitle)}`);
      if (v.phone) lines.push(`TEL;TYPE=VOICE:${escapeVCard(v.phone)}`);
      if (v.mobile) lines.push(`TEL;TYPE=CELL:${escapeVCard(v.mobile)}`);
      if (v.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(v.email)}`);
      if (v.website) lines.push(`URL:${escapeVCard(normalizeURL(v.website))}`);
      if (v.street || v.city || v.zip || v.country) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(v.street)};${escapeVCard(v.city)};;${escapeVCard(v.zip)};${escapeVCard(v.country)}`);
      lines.push('END:VCARD');
      return lines.join(CRLF);
    }
    case 'event': {
      const e = settings.eventOptions || {};
      const stableDateTime = formatLocalDateTime(e.startTime) || '19700101T000000';
      const uidSource = [e.title, e.startTime, e.endTime, e.location, e.description].join('|');
      return [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QR Studio//QR Studio 1.1//EN', 'BEGIN:VEVENT',
        `UID:event-${stableHash(uidSource)}@qr-studio.local`, `DTSTAMP:${stableDateTime}`,
        `DTSTART:${formatLocalDateTime(e.startTime)}`, `DTEND:${formatLocalDateTime(e.endTime)}`,
        `SUMMARY:${escapeICalendar(e.title)}`,
        e.location ? `LOCATION:${escapeICalendar(e.location)}` : '',
        e.description ? `DESCRIPTION:${escapeICalendar(e.description)}` : '',
        'END:VEVENT', 'END:VCALENDAR',
      ].filter(Boolean).join(CRLF);
    }
    case 'location': return `geo:${Number(settings.locationOptions?.latitude)},${Number(settings.locationOptions?.longitude)}`;
    default: return String(settings.textContent || '');
  }
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
