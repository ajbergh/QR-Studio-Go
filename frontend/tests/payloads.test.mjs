import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQRPayload,
  escapeICalendar,
  escapeVCard,
  escapeWifi,
  formatLocalDateTime,
  normalizeURL,
  validateQRContent,
} from '../domain/payloads.js';

function settings(overrides = {}) {
  return {
    dataType: 'url',
    textContent: 'example.com',
    wifiOptions: { ssid: '', password: '', encryption: 'WPA', hidden: false },
    vcardOptions: { firstName: '', lastName: '', phone: '', mobile: '', email: '', website: '', company: '', jobTitle: '', street: '', city: '', zip: '', country: '' },
    eventOptions: { title: '', location: '', description: '', startTime: '', endTime: '' },
    locationOptions: { latitude: '', longitude: '' },
    ...overrides,
  };
}

test('normalizes URLs without changing explicit schemes', () => {
  assert.equal(normalizeURL('example.com/path'), 'https://example.com/path');
  assert.equal(normalizeURL('https://example.com'), 'https://example.com');
});

test('email payload uses the mailto scheme', () => {
  assert.equal(buildQRPayload(settings({ dataType: 'email', textContent: 'person@example.com' })), 'mailto:person@example.com');
});

test('Wi-Fi payload escapes reserved delimiters', () => {
  assert.equal(escapeWifi('Office;Guest:5G'), 'Office\\;Guest\\:5G');
  const payload = buildQRPayload(settings({ dataType: 'wifi', wifiOptions: { ssid: 'Office;Guest', password: 'p,a:ss\\word', encryption: 'WPA', hidden: true } }));
  assert.equal(payload, 'WIFI:T:WPA;S:Office\\;Guest;P:p\\,a\\:ss\\\\word;H:true;;');
});

test('vCard serializer uses CRLF and escapes punctuation', () => {
  assert.equal(escapeVCard('Doe, Jr.;Team'), 'Doe\\, Jr.\\;Team');
  const payload = buildQRPayload(settings({ dataType: 'vcard', vcardOptions: { firstName: 'Jane', lastName: 'Doe, Jr.', phone: '', mobile: '', email: 'jane@example.com', website: '', company: 'R&D; Labs', jobTitle: '', street: '', city: '', zip: '', country: '' } }));
  assert.match(payload, /BEGIN:VCARD\r\nVERSION:3\.0/);
  assert.match(payload, /N:Doe\\, Jr\.;Jane;;;/);
  assert.match(payload, /ORG:R&D\\; Labs/);
});

test('calendar serializer escapes values and formats local date-times', () => {
  assert.equal(formatLocalDateTime('2026-07-18T14:30'), '20260718T143000');
  assert.equal(escapeICalendar('Room 1, North; Wing'), 'Room 1\\, North\\; Wing');
  const payload = buildQRPayload(settings({ dataType: 'event', eventOptions: { title: 'Planning, Review', location: 'Room 1; North', description: 'Line 1\nLine 2', startTime: '2026-07-18T14:30', endTime: '2026-07-18T15:30' } }));
  assert.match(payload, /DTSTART:20260718T143000/);
  assert.match(payload, /SUMMARY:Planning\\, Review/);
  assert.match(payload, /DESCRIPTION:Line 1\\nLine 2/);
});

test('location validation enforces latitude and longitude ranges', () => {
  const invalid = validateQRContent(settings({ dataType: 'location', locationOptions: { latitude: '91', longitude: '-181' } }));
  assert.equal(invalid.length, 2);
  const valid = validateQRContent(settings({ dataType: 'location', locationOptions: { latitude: '43.0731', longitude: '-89.4012' } }));
  assert.deepEqual(valid, []);
  assert.equal(buildQRPayload(settings({ dataType: 'location', locationOptions: { latitude: '43.0731', longitude: '-89.4012' } })), 'geo:43.0731,-89.4012');
});
