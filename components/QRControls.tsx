
import React, { useEffect, useState, useRef } from 'react';
import { QRSettings, DotType, CornerSquareType, CornerDotType, ErrorCorrectionLevel, FrameStyle, QRDataType, WifiOptions, VCardOptions, GradientOptions } from '../types';
import { Input } from './ui/Input';
import { Slider } from './ui/Slider';
import { ColorPicker } from './ui/ColorPicker';
import { Button } from './ui/Button';
import { Tabs } from './ui/Tabs';
import { 
  Link, Image, Palette, Shapes, Settings, Upload, X, Frame, 
  Type, Wifi, Contact, Mail, Save, Trash2, CheckCircle, Sparkles, LayoutTemplate,
  Calendar, MapPin, Download, FolderInput, ImageIcon, MoreHorizontal
} from 'lucide-react';

interface QRControlsProps {
  settings: QRSettings;
  updateSettings: (newSettings: Partial<QRSettings>) => void;
  onLogoUpload: (file: File) => void;
  onRemoveLogo: () => void;
}

// Helper Component for Gradient Controls
interface ColorOrGradientControlProps {
  label: string;
  color: string;
  gradient?: GradientOptions;
  onColorChange: (c: string) => void;
  onGradientChange: (g: GradientOptions | undefined) => void;
}

const ColorOrGradientControl: React.FC<ColorOrGradientControlProps> = ({ 
  label, 
  color, 
  gradient, 
  onColorChange, 
  onGradientChange 
}) => {
  const isGradient = !!gradient;
  
  // Default gradient state to use when switching from Solid -> Gradient
  const defaultGradient: GradientOptions = {
      type: 'linear',
      rotation: 45,
      colorStops: [{ offset: 0, color: color }, { offset: 1, color: color }]
  };

  const activeGradient = gradient || defaultGradient;

  return (
    <div className="p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
        <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button 
                    onClick={() => onGradientChange(undefined)}
                    className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${!isGradient ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Solid
                </button>
                <button 
                    onClick={() => onGradientChange(defaultGradient)}
                     className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${isGradient ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Gradient
                </button>
            </div>
        </div>

        {!isGradient ? (
             <ColorPicker label="Color" value={color} onChange={onColorChange} />
        ) : (
            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1">
                 <div className="flex gap-2">
                     <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Type</label>
                        <select 
                            value={activeGradient.type}
                            onChange={(e) => onGradientChange({ ...activeGradient, type: e.target.value as any })}
                            className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-md p-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                        </select>
                     </div>
                     {activeGradient.type === 'linear' && (
                         <div className="flex-1 space-y-1">
                             <label className="text-[10px] text-slate-500 uppercase font-bold">Rotation ({activeGradient.rotation}°)</label>
                             <input 
                                type="range" 
                                value={activeGradient.rotation}
                                onChange={(e) => onGradientChange({ ...activeGradient, rotation: Number(e.target.value) })}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                                min={0} max={360}
                             />
                         </div>
                     )}
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                     <ColorPicker 
                        label="Start" 
                        value={activeGradient.colorStops[0].color} 
                        onChange={(c) => {
                            const newStops = [...activeGradient.colorStops];
                            newStops[0] = { ...newStops[0], color: c };
                            onGradientChange({ ...activeGradient, colorStops: newStops });
                        }}
                     />
                     <ColorPicker 
                        label="End" 
                        value={activeGradient.colorStops[1]?.color || activeGradient.colorStops[0].color} 
                        onChange={(c) => {
                             const newStops = [...activeGradient.colorStops];
                             if (newStops.length < 2) newStops.push({ offset: 1, color: c });
                             else newStops[1] = { ...newStops[1], color: c };
                             onGradientChange({ ...activeGradient, colorStops: newStops });
                        }}
                     />
                 </div>
            </div>
        )}
    </div>
  );
};

// --- SYSTEM PRESETS DEFINITION ---
const SYSTEM_PRESETS: Array<{ name: string; description: string; settings: Partial<QRSettings>; previewColor: string }> = [
    {
        name: 'Classic Black',
        description: 'Standard, high-contrast',
        previewColor: '#000000',
        settings: {
            dotsOptions: { type: 'square', color: '#000000' },
            backgroundOptions: { color: '#ffffff' },
            cornersSquareOptions: { type: 'square', color: '#000000' },
            cornersDotOptions: { type: 'square', color: '#000000' },
            frameOptions: { style: 'none', text: 'SCAN ME', color: '#000000', textColor: '#ffffff' }
        }
    },
    {
        name: 'Modern Blue',
        description: 'Clean corporate look',
        previewColor: '#2563eb',
        settings: {
            dotsOptions: { type: 'rounded', color: '#2563eb' },
            backgroundOptions: { color: '#ffffff' },
            cornersSquareOptions: { type: 'extra-rounded', color: '#2563eb' },
            cornersDotOptions: { type: 'dot', color: '#2563eb' },
            frameOptions: { style: 'none', text: 'SCAN ME', color: '#2563eb', textColor: '#ffffff' }
        }
    },
    {
        name: 'Sunset Gradient',
        description: 'Warm, vibrant gradient',
        previewColor: 'linear-gradient(45deg, #f97316, #db2777)',
        settings: {
            dotsOptions: { 
                type: 'classy', 
                color: '#db2777',
                gradient: {
                    type: 'linear',
                    rotation: 45,
                    colorStops: [{ offset: 0, color: '#f97316' }, { offset: 1, color: '#db2777' }]
                }
            },
            backgroundOptions: { color: '#ffffff' },
            cornersSquareOptions: { type: 'extra-rounded', color: '#db2777' },
            cornersDotOptions: { type: 'dot', color: '#f97316' },
            frameOptions: { style: 'none', text: 'SCAN ME', color: '#db2777', textColor: '#ffffff' }
        }
    },
    {
        name: 'Ocean Depth',
        description: 'Deep blue-green radial',
        previewColor: 'radial-gradient(circle, #06b6d4, #1e3a8a)',
        settings: {
            dotsOptions: { 
                type: 'dots', 
                color: '#1e3a8a',
                gradient: {
                    type: 'radial',
                    rotation: 0,
                    colorStops: [{ offset: 0, color: '#06b6d4' }, { offset: 1, color: '#1e3a8a' }]
                }
            },
            backgroundOptions: { color: '#f0f9ff' },
            cornersSquareOptions: { type: 'extra-rounded', color: '#1e3a8a' },
            cornersDotOptions: { type: 'dot', color: '#06b6d4' },
            frameOptions: { style: 'none', text: 'SCAN ME', color: '#1e3a8a', textColor: '#ffffff' }
        }
    },
    {
        name: 'Luxury Gold',
        description: 'Premium elegant style',
        previewColor: 'linear-gradient(135deg, #ca8a04, #854d0e)',
        settings: {
            dotsOptions: { 
                type: 'classy-rounded', 
                color: '#854d0e',
                gradient: {
                    type: 'linear',
                    rotation: 135,
                    colorStops: [{ offset: 0, color: '#ca8a04' }, { offset: 1, color: '#854d0e' }]
                }
            },
            backgroundOptions: { color: '#fafaf9' },
            cornersSquareOptions: { type: 'extra-rounded', color: '#854d0e' },
            cornersDotOptions: { type: 'dot', color: '#ca8a04' },
            frameOptions: { style: 'simple', text: 'VIP ACCESS', color: '#854d0e', textColor: '#ffffff' }
        }
    },
    {
        name: 'Neon Cyber',
        description: 'High contrast tech',
        previewColor: '#000000',
        settings: {
            dotsOptions: { type: 'square', color: '#00ff9d' },
            backgroundOptions: { color: '#0f172a' },
            cornersSquareOptions: { type: 'square', color: '#00ff9d' },
            cornersDotOptions: { type: 'square', color: '#00ff9d' },
            frameOptions: { style: 'none', text: 'SCAN ME', color: '#00ff9d', textColor: '#000000' }
        }
    }
];

export const QRControls: React.FC<QRControlsProps> = ({ 
  settings, 
  updateSettings,
  onLogoUpload,
  onRemoveLogo
}) => {
  const [activeTab, setActiveTab] = useState('content');
  const [savedTemplates, setSavedTemplates] = useState<QRSettings[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('qr_studio_templates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    }
  }, []);

  const saveTemplate = () => {
    const name = prompt("Enter a name for this design:", settings.name || "My Custom Design");
    if (!name) return;

    // Create a new template object, ensuring we include the current image if present
    const newTemplate: QRSettings = { 
        ...settings, 
        id: `tpl_${Date.now()}`, 
        name,
        // Explicitly ensure image is included if it exists in current settings
        image: settings.image 
    };

    const updatedTemplates = [...savedTemplates, newTemplate];
    
    // Update state immediately so the user sees it
    setSavedTemplates(updatedTemplates);
    updateSettings({ name });

    // Try to persist to localStorage, handle quota errors
    try {
        localStorage.setItem('qr_studio_templates', JSON.stringify(updatedTemplates));
    } catch (error) {
        console.error("Failed to save template to localStorage", error);
        // If it's a quota error, warn the user but keep the in-memory state
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            alert("Design saved to session only.\n\nThe logo image is too large to be saved permanently in your browser's storage. It will be available until you reload the page.");
        } else {
            alert("Design saved to session only due to a storage error.");
        }
    }
  };

  const loadTemplate = (template: Partial<QRSettings>) => {
    // Keep current content (data, wifi, vcard, event, location), apply style
    updateSettings({
        ...template,
        data: settings.data,
        textContent: settings.textContent,
        wifiOptions: settings.wifiOptions,
        vcardOptions: settings.vcardOptions,
        eventOptions: settings.eventOptions,
        locationOptions: settings.locationOptions,
        dataType: settings.dataType,
        id: undefined, // Reset ID so we don't overwrite the original unless intended
        name: template.name
    });
  };

  const deleteTemplate = (id: string) => {
      if(!confirm("Are you sure you want to delete this design?")) return;
      const updated = savedTemplates.filter(t => t.id !== id);
      setSavedTemplates(updated);
      localStorage.setItem('qr_studio_templates', JSON.stringify(updated));
  };

  const handleExportTemplates = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedTemplates));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "qr_studio_templates.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json)) {
                  const merged = [...savedTemplates, ...json];
                  setSavedTemplates(merged);
                  localStorage.setItem('qr_studio_templates', JSON.stringify(merged));
                  alert(`Successfully imported ${json.length} templates.`);
              } else {
                  alert("Invalid template file format.");
              }
          } catch (err) {
              console.error(err);
              alert("Failed to parse JSON file.");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset
  };

  const getGradientString = (gradient?: GradientOptions) => {
    if (!gradient) return undefined;
    const { type, rotation, colorStops } = gradient;
    const stops = colorStops.map(s => `${s.color} ${s.offset * 100}%`).join(', ');
    return type === 'linear' 
        ? `linear-gradient(${rotation}deg, ${stops})` 
        : `radial-gradient(circle, ${stops})`;
  };

  const getBackgroundStyle = (opts: any) => {
    if (opts.image) return { backgroundImage: `url(${opts.image})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (opts.gradient) return { background: getGradientString(opts.gradient) };
    return { background: opts.color };
  };

  const getDotsStyle = (opts: any) => {
      if (opts.gradient) return { background: getGradientString(opts.gradient) };
      return { background: opts.color };
  };

  // --- Content Generators ---
  
  // Re-generate the `data` string whenever sub-options change
  useEffect(() => {
    let newData = '';
    const formatDate = (d: string) => d ? d.replace(/[-:]/g, '') : '';
    
    switch (settings.dataType) {
        case 'url':
        case 'text':
        case 'email':
            newData = settings.textContent;
            break;
        case 'wifi':
            const { ssid, password, encryption, hidden } = settings.wifiOptions;
            newData = `WIFI:S:${ssid};T:${encryption};P:${password};H:${hidden};;`;
            break;
        case 'vcard':
            const v = settings.vcardOptions;
            newData = `BEGIN:VCARD\nVERSION:3.0\nN:${v.lastName};${v.firstName}\nFN:${v.firstName} ${v.lastName}\nORG:${v.company}\nTITLE:${v.jobTitle}\nTEL:${v.phone}\nTEL;TYPE=CELL:${v.mobile}\nEMAIL:${v.email}\nURL:${v.website}\nADR:;;${v.street};${v.city};;${v.zip};${v.country}\nEND:VCARD`;
            break;
        case 'event':
            const e = settings.eventOptions;
            // Basic VEVENT format
            const start = formatDate(e.startTime);
            const end = formatDate(e.endTime);
            newData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${e.title}\nDTSTART:${start}\nDTEND:${end}\nLOCATION:${e.location}\nDESCRIPTION:${e.description}\nEND:VEVENT\nEND:VCALENDAR`;
            break;
        case 'location':
            const l = settings.locationOptions;
            newData = `geo:${l.latitude},${l.longitude}`;
            break;
    }
    if (newData !== settings.data) {
        updateSettings({ data: newData });
    }
  }, [
      settings.dataType, 
      settings.textContent, 
      settings.wifiOptions, 
      settings.vcardOptions,
      settings.eventOptions,
      settings.locationOptions
  ]);

  const handleBackgroundImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            updateSettings({ 
                backgroundOptions: { 
                    ...settings.backgroundOptions, 
                    image: reader.result,
                    color: '#ffffff00' // Make background transparent so image shows
                } 
            });
        }
    };
    reader.readAsDataURL(file);
  };


  const frameOptionsList: {id: FrameStyle, label: string}[] = [
    { id: 'none', label: 'None' },
    { id: 'simple', label: 'Box' },
    { id: 'balloon', label: 'Balloon' },
    { id: 'badge', label: 'Badge' },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 transition-colors">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
          <Tabs 
            tabs={[
                { id: 'content', label: 'Content', icon: <Type className="w-4 h-4"/> },
                { id: 'design', label: 'Design', icon: <Shapes className="w-4 h-4"/> },
                { id: 'colors', label: 'Colors', icon: <Palette className="w-4 h-4"/> },
                { id: 'logo', label: 'Logo', icon: <Image className="w-4 h-4"/> },
                { id: 'templates', label: 'Templates', icon: <LayoutTemplate className="w-4 h-4"/> },
            ]} 
            activeTab={activeTab} 
            onChange={setActiveTab} 
          />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* --- CONTENT TAB --- */}
        {activeTab === 'content' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[
                        { id: 'url', label: 'URL', icon: Link },
                        { id: 'text', label: 'Text', icon: Type },
                        { id: 'email', label: 'Email', icon: Mail },
                        { id: 'wifi', label: 'WiFi', icon: Wifi },
                        { id: 'vcard', label: 'VCard', icon: Contact },
                        { id: 'event', label: 'Event', icon: Calendar },
                        { id: 'location', label: 'Map', icon: MapPin },
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => updateSettings({ dataType: type.id as QRDataType })}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all h-20 ${
                                settings.dataType === type.id
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                            title={type.label}
                        >
                            <type.icon className="w-5 h-5 mb-1.5" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">{type.label}</span>
                        </button>
                    ))}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                    {(settings.dataType === 'url' || settings.dataType === 'text' || settings.dataType === 'email') && (
                        <Input
                            label={settings.dataType === 'email' ? 'Email Address' : settings.dataType === 'url' ? 'Website URL' : 'Content'}
                            placeholder={settings.dataType === 'url' ? 'https://example.com' : 'Enter text...'}
                            value={settings.textContent}
                            onChange={(e) => updateSettings({ textContent: e.target.value })}
                            autoFocus
                        />
                    )}

                    {settings.dataType === 'wifi' && (
                        <div className="space-y-4">
                            <Input
                                label="Network Name (SSID)"
                                value={settings.wifiOptions.ssid}
                                onChange={(e) => updateSettings({ wifiOptions: { ...settings.wifiOptions, ssid: e.target.value } })}
                            />
                            <Input
                                label="Password"
                                type="password"
                                value={settings.wifiOptions.password}
                                onChange={(e) => updateSettings({ wifiOptions: { ...settings.wifiOptions, password: e.target.value } })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Encryption</label>
                                    <select
                                        className="w-full text-sm border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                                        value={settings.wifiOptions.encryption}
                                        onChange={(e) => updateSettings({ wifiOptions: { ...settings.wifiOptions, encryption: e.target.value as any } })}
                                    >
                                        <option value="WPA">WPA/WPA2</option>
                                        <option value="WEP">WEP</option>
                                        <option value="nopass">None</option>
                                    </select>
                                </div>
                                <div className="flex items-center pt-6">
                                    <input
                                        type="checkbox"
                                        id="hidden-net"
                                        checked={settings.wifiOptions.hidden}
                                        onChange={(e) => updateSettings({ wifiOptions: { ...settings.wifiOptions, hidden: e.target.checked } })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <label htmlFor="hidden-net" className="ml-2 text-sm text-slate-700 dark:text-slate-300">Hidden Network</label>
                                </div>
                            </div>
                        </div>
                    )}

                    {settings.dataType === 'event' && (
                        <div className="space-y-4">
                            <Input label="Event Title" value={settings.eventOptions.title} onChange={(e) => updateSettings({ eventOptions: {...settings.eventOptions, title: e.target.value} })} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input type="datetime-local" label="Start Time" value={settings.eventOptions.startTime} onChange={(e) => updateSettings({ eventOptions: {...settings.eventOptions, startTime: e.target.value} })} />
                                <Input type="datetime-local" label="End Time" value={settings.eventOptions.endTime} onChange={(e) => updateSettings({ eventOptions: {...settings.eventOptions, endTime: e.target.value} })} />
                            </div>
                            <Input label="Location" value={settings.eventOptions.location} onChange={(e) => updateSettings({ eventOptions: {...settings.eventOptions, location: e.target.value} })} />
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                <textarea 
                                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm shadow-sm"
                                    rows={3}
                                    value={settings.eventOptions.description}
                                    onChange={(e) => updateSettings({ eventOptions: {...settings.eventOptions, description: e.target.value} })}
                                />
                            </div>
                        </div>
                    )}

                    {settings.dataType === 'location' && (
                         <div className="space-y-4">
                             <p className="text-xs text-slate-500 dark:text-slate-400">Enter coordinates to create a map link.</p>
                             <div className="grid grid-cols-2 gap-3">
                                <Input label="Latitude" placeholder="e.g. 40.7128" value={settings.locationOptions.latitude} onChange={(e) => updateSettings({ locationOptions: {...settings.locationOptions, latitude: e.target.value} })} />
                                <Input label="Longitude" placeholder="e.g. -74.0060" value={settings.locationOptions.longitude} onChange={(e) => updateSettings({ locationOptions: {...settings.locationOptions, longitude: e.target.value} })} />
                             </div>
                         </div>
                    )}

                    {settings.dataType === 'vcard' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="First Name" value={settings.vcardOptions.firstName} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, firstName: e.target.value} })} />
                                <Input label="Last Name" value={settings.vcardOptions.lastName} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, lastName: e.target.value} })} />
                            </div>
                            <Input label="Email" value={settings.vcardOptions.email} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, email: e.target.value} })} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Phone (Work)" value={settings.vcardOptions.phone} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, phone: e.target.value} })} />
                                <Input label="Mobile" value={settings.vcardOptions.mobile} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, mobile: e.target.value} })} />
                            </div>
                            <Input label="Website" value={settings.vcardOptions.website} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, website: e.target.value} })} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Company" value={settings.vcardOptions.company} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, company: e.target.value} })} />
                                <Input label="Job Title" value={settings.vcardOptions.jobTitle} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, jobTitle: e.target.value} })} />
                            </div>
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Address</p>
                                <Input label="Street" className="mb-3" value={settings.vcardOptions.street} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, street: e.target.value} })} />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="City" value={settings.vcardOptions.city} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, city: e.target.value} })} />
                                    <Input label="Country" value={settings.vcardOptions.country} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, country: e.target.value} })} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- DESIGN TAB --- */}
        {activeTab === 'design' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Pattern Style</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {['square', 'dots', 'rounded', 'classy', 'classy-rounded', 'extra-rounded'].map((type) => (
                            <button
                                key={type}
                                onClick={() => updateSettings({ dotsOptions: { ...settings.dotsOptions, type: type as DotType } })}
                                className={`px-2 py-3 text-xs border rounded-lg capitalize transition-all ${
                                    settings.dotsOptions.type === type 
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium ring-1 ring-indigo-200 dark:ring-indigo-800' 
                                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                            >
                                {type.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Corners</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Outer Frame</label>
                            <select 
                                className="w-full text-sm border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                                value={settings.cornersSquareOptions.type || 'square'}
                                onChange={(e) => updateSettings({ cornersSquareOptions: { ...settings.cornersSquareOptions, type: e.target.value as CornerSquareType } })}
                            >
                                <option value="square">Square</option>
                                <option value="dot">Dot</option>
                                <option value="extra-rounded">Rounded</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Inner Dot</label>
                            <select 
                                className="w-full text-sm border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                                value={settings.cornersDotOptions.type || 'square'}
                                onChange={(e) => updateSettings({ cornersDotOptions: { ...settings.cornersDotOptions, type: e.target.value as CornerDotType } })}
                            >
                                <option value="square">Square</option>
                                <option value="dot">Dot</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section>
                     <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                         <Frame className="w-4 h-4" /> Frame
                     </h3>
                     <div className="grid grid-cols-4 gap-2 mb-4">
                        {frameOptionsList.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => updateSettings({ frameOptions: { ...settings.frameOptions!, style: opt.id } })}
                                className={`py-2 px-1 text-xs rounded-lg border transition-all ${
                                    settings.frameOptions.style === opt.id 
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium' 
                                    : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {settings.frameOptions.style !== 'none' && (
                        <Input 
                            label="Frame Text" 
                            value={settings.frameOptions.text} 
                            onChange={(e) => updateSettings({ frameOptions: { ...settings.frameOptions!, text: e.target.value } })}
                            placeholder="SCAN ME"
                            maxLength={25}
                        />
                    )}
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Advanced
                    </h3>
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                        <Slider 
                            label="Resolution (px)" 
                            value={settings.width} 
                            min={256} 
                            max={2048} 
                            step={64}
                            unit="px"
                            onChange={(v) => updateSettings({ width: v, height: v })}
                        />
                        <Slider
                            label="Quiet Zone"
                            value={settings.margin}
                            min={0}
                            max={50}
                            onChange={(v) => updateSettings({ margin: v })}
                        />
                        <div className="space-y-1">
                             <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">Error Correction <span className="text-slate-400" title="Higher levels allow more damage to the QR code but increase complexity.">?</span></label>
                             <select 
                                className="w-full text-sm border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                                value={settings.qrOptions.errorCorrectionLevel}
                                onChange={(e) => updateSettings({ qrOptions: { ...settings.qrOptions, errorCorrectionLevel: e.target.value as ErrorCorrectionLevel } })}
                            >
                                <option value="L">Low (7%)</option>
                                <option value="M">Medium (15%)</option>
                                <option value="Q">Quartile (25%)</option>
                                <option value="H">High (30%)</option>
                            </select>
                        </div>
                    </div>
                </section>
            </div>
        )}

        {/* --- COLORS TAB --- */}
        {activeTab === 'colors' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-1 divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                    
                    {/* Background */}
                    <ColorOrGradientControl 
                        label="Background"
                        color={settings.backgroundOptions.color}
                        gradient={settings.backgroundOptions.gradient}
                        onColorChange={(c) => updateSettings({ backgroundOptions: { ...settings.backgroundOptions, color: c, gradient: undefined, image: undefined } })}
                        onGradientChange={(g) => updateSettings({ backgroundOptions: { ...settings.backgroundOptions, gradient: g, image: undefined } })}
                    />

                    {/* Dots (Pattern) */}
                    <ColorOrGradientControl 
                        label="Pattern (Dots)"
                        color={settings.dotsOptions.color}
                        gradient={settings.dotsOptions.gradient}
                        onColorChange={(c) => updateSettings({ dotsOptions: { ...settings.dotsOptions, color: c, gradient: undefined } })}
                        onGradientChange={(g) => updateSettings({ dotsOptions: { ...settings.dotsOptions, gradient: g } })}
                    />

                    <div className="p-3">
                         <ColorPicker
                            label="Corner Frame Color"
                            value={settings.cornersSquareOptions.color}
                            onChange={(c) => updateSettings({ cornersSquareOptions: { ...settings.cornersSquareOptions, color: c, gradient: undefined } })}
                        />
                    </div>
                    <div className="p-3">
                         <ColorPicker
                            label="Corner Dot Color"
                            value={settings.cornersDotOptions.color}
                            onChange={(c) => updateSettings({ cornersDotOptions: { ...settings.cornersDotOptions, color: c, gradient: undefined } })}
                        />
                    </div>
                    {settings.frameOptions.style !== 'none' && (
                        <>
                        <div className="p-3">
                            <ColorPicker
                                label="Frame Color"
                                value={settings.frameOptions.color}
                                onChange={(c) => updateSettings({ frameOptions: { ...settings.frameOptions!, color: c } })}
                            />
                        </div>
                         <div className="p-3">
                            <ColorPicker
                                label="Frame Text Color"
                                value={settings.frameOptions.textColor}
                                onChange={(c) => updateSettings({ frameOptions: { ...settings.frameOptions!, textColor: c } })}
                            />
                        </div>
                        </>
                    )}
                </div>
                
                 {/* Background Image Upload */}
                 <section className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Custom Background Image
                    </h3>
                    <div className="flex items-center gap-4">
                        {settings.backgroundOptions.image ? (
                             <div className="flex-1 flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded-lg border dark:border-slate-700">
                                <span className="text-xs truncate max-w-[150px] text-slate-600 dark:text-slate-300">Custom Image Active</span>
                                <button 
                                    onClick={() => updateSettings({ backgroundOptions: { ...settings.backgroundOptions, image: undefined, color: '#ffffff' } })}
                                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                                >
                                    Remove
                                </button>
                             </div>
                        ) : (
                            <label className="flex-1 cursor-pointer">
                                <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-slate-600 dark:text-slate-400">
                                    <Upload className="w-4 h-4" />
                                    <span>Upload Image</span>
                                </div>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleBackgroundImageUpload(e.target.files[0]);
                                    }}
                                />
                            </label>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                        Image will be placed behind the QR code. Ensure your QR colors contrast well with the image.
                    </p>
                </section>

                <div className="text-xs text-slate-500 dark:text-slate-400 p-2">
                    <p>Note: Selecting a solid color will override any active gradients or images. Use <strong>Templates</strong> for complex gradient styles.</p>
                </div>
            </div>
        )}

        {/* --- LOGO TAB --- */}
        {activeTab === 'logo' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 {!settings.image ? (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors relative group cursor-pointer">
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/svg+xml"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => {
                                if (e.target.files?.[0]) onLogoUpload(e.target.files[0]);
                            }}
                        />
                        <div className="bg-indigo-50 dark:bg-slate-800 p-4 rounded-full inline-block mb-3 group-hover:scale-110 transition-transform">
                             <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Click to upload logo</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Supports PNG, JPG, SVG</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700 flex items-center justify-center p-2">
                                     <img src={settings.image} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Active Logo</p>
                                    <button onClick={onRemoveLogo} className="text-xs text-red-500 hover:text-red-600 font-medium mt-1">Remove Logo</button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Slider
                                label="Logo Size"
                                value={settings.imageOptions.imageSize}
                                min={0.1}
                                max={0.5}
                                step={0.05}
                                onChange={(v) => updateSettings({ imageOptions: { ...settings.imageOptions, imageSize: v } })}
                            />
                            <Slider
                                label="Margin"
                                value={settings.imageOptions.margin}
                                min={0}
                                max={20}
                                onChange={(v) => updateSettings({ imageOptions: { ...settings.imageOptions, margin: v } })}
                            />
                            <div className="flex items-center justify-between py-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hide Pattern Behind Logo</label>
                                <input
                                    type="checkbox"
                                    checked={settings.imageOptions.hideBackgroundDots}
                                    onChange={(e) => updateSettings({ imageOptions: { ...settings.imageOptions, hideBackgroundDots: e.target.checked } })}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-slate-600 dark:bg-slate-800"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TEMPLATES / SAVED TAB --- */}
        {activeTab === 'templates' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* System Presets */}
                <section>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                         <Sparkles className="w-4 h-4 text-amber-500" /> Professional Presets
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {SYSTEM_PRESETS.map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={() => loadTemplate(preset.settings)}
                                className="group relative flex flex-col gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-left"
                            >
                                <div 
                                    className="h-24 w-full rounded-lg shadow-inner flex items-center justify-center relative overflow-hidden"
                                    style={{ 
                                        background: preset.settings.backgroundOptions?.color || '#fff',
                                    }}
                                >
                                    <div 
                                        className="w-12 h-12 rounded shadow-sm"
                                        style={{ 
                                            background: preset.previewColor
                                        }}
                                    />
                                    {preset.settings.frameOptions?.style !== 'none' && (
                                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-[9px] text-white rounded font-medium">Frame</div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{preset.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{preset.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
                
                {/* User Saved */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                         <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                             <Save className="w-4 h-4" /> My Designs
                        </h3>
                        <div className="flex items-center gap-2">
                             <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs px-2"
                                title="Export Templates to JSON"
                                onClick={handleExportTemplates}
                             >
                                <Download className="w-3 h-3 mr-1" /> Export
                             </Button>
                             <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs px-2 relative"
                                title="Import Templates from JSON"
                             >
                                <FolderInput className="w-3 h-3 mr-1" /> Import
                                <input 
                                    type="file" 
                                    accept=".json"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleImportTemplates}
                                />
                             </Button>
                        </div>
                    </div>
                    
                    <Button fullWidth variant="outline" onClick={saveTemplate} className="border-dashed border-2 mb-4 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <Save className="w-4 h-4 mr-2"/>
                        Save Current as New Design
                    </Button>
                    
                    {savedTemplates.length === 0 ? (
                        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Save className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No saved designs</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Customize a QR code and click "Save Current" to create your first template.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {savedTemplates.map((template, idx) => (
                                <div key={template.id || idx} className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all overflow-hidden shadow-sm hover:shadow-md">
                                    {/* Delete Button - Top Right */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id!); }}
                                        className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 dark:bg-black/70 backdrop-blur hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-400 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                        title="Delete Design"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Load Action - Clickable Body */}
                                    <button 
                                        onClick={() => loadTemplate(template)}
                                        className="w-full text-left p-3 flex flex-col gap-3 h-full"
                                    >
                                        {/* Preview Box */}
                                        <div 
                                            className="w-full h-24 rounded-lg shadow-inner relative overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"
                                            style={getBackgroundStyle(template.backgroundOptions)}
                                        >
                                            {/* Dots Preview */}
                                            <div 
                                                className="w-12 h-12 rounded shadow-sm"
                                                style={getDotsStyle(template.dotsOptions)}
                                            />
                                            
                                            {/* Feature Indicators */}
                                            <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                                                {template.image && (
                                                    <div className="p-1 bg-black/60 backdrop-blur-sm rounded text-white" title="Contains Logo">
                                                        <Image className="w-3 h-3" />
                                                    </div>
                                                )}
                                                {template.frameOptions.style !== 'none' && (
                                                    <div className="p-1 bg-black/60 backdrop-blur-sm rounded text-white" title="Framed">
                                                        <Frame className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="w-full">
                                            <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate w-full pr-4">{template.name}</h4>
                                            <div className="flex items-center justify-between mt-1">
                                                 <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {template.dataType}
                                                 </span>
                                                 <span className="text-[10px] text-slate-400">
                                                     {template.id ? new Date(parseInt(template.id.split('_')[1] || '0')).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                                 </span>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        )}

      </div>
    </div>
  );
};
