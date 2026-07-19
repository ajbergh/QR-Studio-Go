import React from 'react';
import type { EventOptions, LocationOptions, QRDataType, QRSettings, VCardOptions, WifiOptions } from '../../types';

interface ContentEditorProps {
  settings: QRSettings;
  errors: string[];
  onChange: (patch: Partial<QRSettings>) => void;
}

const CONTENT_TYPES: Array<{ id: QRDataType; label: string }> = [
  { id: 'url', label: 'URL' },
  { id: 'text', label: 'Text' },
  { id: 'email', label: 'Email' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'vcard', label: 'vCard' },
  { id: 'event', label: 'Event' },
  { id: 'location', label: 'Location' },
];

export function ContentEditor({ settings, errors, onChange }: ContentEditorProps) {
  const updateWifi = (patch: Partial<WifiOptions>) => onChange({ wifiOptions: { ...settings.wifiOptions, ...patch } });
  const updateVCard = (patch: Partial<VCardOptions>) => onChange({ vcardOptions: { ...settings.vcardOptions, ...patch } });
  const updateEvent = (patch: Partial<EventOptions>) => onChange({ eventOptions: { ...settings.eventOptions, ...patch } });
  const updateLocation = (patch: Partial<LocationOptions>) => onChange({ locationOptions: { ...settings.locationOptions, ...patch } });

  return (
    <section className="panel-section" aria-labelledby="content-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Content</p>
          <h2 id="content-heading">What should the code contain?</h2>
        </div>
      </div>

      <div className="segmented-grid" role="tablist" aria-label="QR content type">
        {CONTENT_TYPES.map(type => (
          <button
            key={type.id}
            type="button"
            role="tab"
            aria-selected={settings.dataType === type.id}
            className={settings.dataType === type.id ? 'segment active' : 'segment'}
            onClick={() => onChange({ dataType: type.id })}
          >
            {type.label}
          </button>
        ))}
      </div>

      {(settings.dataType === 'url' || settings.dataType === 'text' || settings.dataType === 'email') && (
        <Field label={settings.dataType === 'url' ? 'Website URL' : settings.dataType === 'email' ? 'Email address' : 'Text'}>
          {settings.dataType === 'text' ? (
            <textarea value={settings.textContent} rows={5} onChange={event => onChange({ textContent: event.target.value })} placeholder="Enter the text to encode" />
          ) : (
            <input
              type={settings.dataType === 'email' ? 'email' : 'text'}
              value={settings.textContent}
              onChange={event => onChange({ textContent: event.target.value })}
              placeholder={settings.dataType === 'url' ? 'Enter URL, e.g. example.com' : 'name@example.com'}
            />
          )}
        </Field>
      )}

      {settings.dataType === 'wifi' && (
        <div className="form-grid">
          <Field label="Network name (SSID)" wide><input value={settings.wifiOptions.ssid} onChange={event => updateWifi({ ssid: event.target.value })} /></Field>
          <Field label="Password" wide><input type="password" value={settings.wifiOptions.password} onChange={event => updateWifi({ password: event.target.value })} disabled={settings.wifiOptions.encryption === 'nopass'} /></Field>
          <Field label="Security">
            <select value={settings.wifiOptions.encryption} onChange={event => updateWifi({ encryption: event.target.value as WifiOptions['encryption'] })}>
              <option value="WPA">WPA/WPA2/WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">Open network</option>
            </select>
          </Field>
          <label className="check-field"><input type="checkbox" checked={settings.wifiOptions.hidden} onChange={event => updateWifi({ hidden: event.target.checked })} /> Hidden network</label>
        </div>
      )}

      {settings.dataType === 'vcard' && (
        <div className="form-grid">
          <Field label="First name"><input value={settings.vcardOptions.firstName} onChange={event => updateVCard({ firstName: event.target.value })} /></Field>
          <Field label="Last name"><input value={settings.vcardOptions.lastName} onChange={event => updateVCard({ lastName: event.target.value })} /></Field>
          <Field label="Mobile"><input type="tel" value={settings.vcardOptions.mobile} onChange={event => updateVCard({ mobile: event.target.value })} /></Field>
          <Field label="Phone"><input type="tel" value={settings.vcardOptions.phone} onChange={event => updateVCard({ phone: event.target.value })} /></Field>
          <Field label="Email"><input type="email" value={settings.vcardOptions.email} onChange={event => updateVCard({ email: event.target.value })} /></Field>
          <Field label="Website"><input value={settings.vcardOptions.website} onChange={event => updateVCard({ website: event.target.value })} /></Field>
          <Field label="Company"><input value={settings.vcardOptions.company} onChange={event => updateVCard({ company: event.target.value })} /></Field>
          <Field label="Job title"><input value={settings.vcardOptions.jobTitle} onChange={event => updateVCard({ jobTitle: event.target.value })} /></Field>
          <Field label="Street" wide><input value={settings.vcardOptions.street} onChange={event => updateVCard({ street: event.target.value })} /></Field>
          <Field label="City"><input value={settings.vcardOptions.city} onChange={event => updateVCard({ city: event.target.value })} /></Field>
          <Field label="Postal code"><input value={settings.vcardOptions.zip} onChange={event => updateVCard({ zip: event.target.value })} /></Field>
          <Field label="Country" wide><input value={settings.vcardOptions.country} onChange={event => updateVCard({ country: event.target.value })} /></Field>
        </div>
      )}

      {settings.dataType === 'event' && (
        <div className="form-grid">
          <Field label="Event title" wide><input value={settings.eventOptions.title} onChange={event => updateEvent({ title: event.target.value })} /></Field>
          <Field label="Start"><input type="datetime-local" value={settings.eventOptions.startTime} onChange={event => updateEvent({ startTime: event.target.value })} /></Field>
          <Field label="End"><input type="datetime-local" value={settings.eventOptions.endTime} onChange={event => updateEvent({ endTime: event.target.value })} /></Field>
          <Field label="Location" wide><input value={settings.eventOptions.location} onChange={event => updateEvent({ location: event.target.value })} /></Field>
          <Field label="Description" wide><textarea rows={4} value={settings.eventOptions.description} onChange={event => updateEvent({ description: event.target.value })} /></Field>
        </div>
      )}

      {settings.dataType === 'location' && (
        <div className="form-grid">
          <Field label="Latitude"><input inputMode="decimal" value={settings.locationOptions.latitude} onChange={event => updateLocation({ latitude: event.target.value })} placeholder="43.0731" /></Field>
          <Field label="Longitude"><input inputMode="decimal" value={settings.locationOptions.longitude} onChange={event => updateLocation({ longitude: event.target.value })} placeholder="-89.4012" /></Field>
        </div>
      )}

      {errors.length > 0 && (
        <div className="validation-box" role="alert">
          <strong>Complete the content before exporting:</strong>
          <ul>{errors.map(error => <li key={error}>{error}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? 'field wide' : 'field'}><span>{label}</span>{children}</label>;
}
