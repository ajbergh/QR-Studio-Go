/*
================================================================================
QR STUDIO - QR CONTROLS COMPONENT
================================================================================

File: components/QRControls.tsx
Description: Main control panel for QR code customization. Handles content input,
             styling options, template management, and logo/background uploads.

Key Features:
  - Multi-tab interface for organized settings (Content, Design, Colors, Logo, Templates)
  - Template save/load/delete with storage abstraction (localStorage or Wails backend)
  - Import/export templates as JSON files
  - System presets for quick styling
  - Gradient and solid color support for dots, corners, and background
  - Logo and background image upload with Base64 handling

Storage Abstraction:
  - Uses IStorageService interface for platform-agnostic storage
  - Browser mode: localStorage with quota error handling
  - Desktop mode: SQLite via Wails backend with no size limits

Author: QR Studio Team
Created: 2024
Updated: 2025-12-16 - Refactored to use storage abstraction

================================================================================
*/

import React, { useEffect, useState, useRef } from 'react';
import { QRSettings, DotType, CornerSquareType, CornerDotType, ErrorCorrectionLevel, FrameStyle, QRDataType, WifiOptions, VCardOptions, GradientOptions } from '../types';
import { Input } from './ui/Input';
import { Slider } from './ui/Slider';
import { ColorPicker } from './ui/ColorPicker';
import { Button } from './ui/Button';
import { Tabs } from './ui/Tabs';
import { useStorageService, isDesktopMode } from '../services';
import { useToast } from '../contexts/ToastContext';
import { 
  Link, Image, Palette, Shapes, Settings, Upload, X, Frame, 
  Type, Wifi, Contact, Mail, Save, Trash2, CheckCircle, Sparkles, LayoutTemplate,
  Calendar, MapPin, Download, FolderInput, ImageIcon, MoreHorizontal, Pencil, Copy, Search
} from 'lucide-react';

interface QRControlsProps {
  settings: QRSettings;
  updateSettings: (newSettings: Partial<QRSettings>) => void;
  onLogoUpload: (file: File) => void;
  onRemoveLogo: () => void;
  logoHistory?: string[];
  onLogoSelect?: (dataUrl: string) => void;
}

// Helper Component for Gradient Controls
interface ColorOrGradientControlProps {
  label: string;
  color: string;
  gradient?: GradientOptions;
  onColorChange: (c: string) => void;
  onGradientChange: (g: GradientOptions | undefined) => void;
  colorHistory?: string[];
  onColorUsed?: (c: string) => void;
}

const ColorOrGradientControl: React.FC<ColorOrGradientControlProps> = ({ 
  label, 
  color, 
  gradient, 
  onColorChange, 
  onGradientChange,
  colorHistory = [],
  onColorUsed,
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
                    title={isGradient ? 'Switching to Solid will remove the current gradient' : undefined}
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
            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none">
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
                 {/* Live gradient preview swatch */}
                 <div 
                    className="h-5 w-full rounded-md border border-slate-200 dark:border-slate-700"
                    style={{
                        background: activeGradient.type === 'linear'
                            ? `linear-gradient(${activeGradient.rotation}deg, ${activeGradient.colorStops[0].color}, ${activeGradient.colorStops[1]?.color || activeGradient.colorStops[0].color})`
                            : `radial-gradient(circle, ${activeGradient.colorStops[0].color}, ${activeGradient.colorStops[1]?.color || activeGradient.colorStops[0].color})`
                    }}
                 />
            </div>
        )}
        {/* Recently used colors */}
        {colorHistory.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5">Recent</p>
            <div className="flex flex-wrap gap-1.5">
              {colorHistory.map((c, i) => (
                <button
                  key={i}
                  title={c}
                  aria-label={`Recent color ${c}`}
                  onClick={() => { onColorChange(c); onColorUsed?.(c); }}
                  className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: c }}
                />
              ))}
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
  onRemoveLogo,
  logoHistory = [],
  onLogoSelect,
}) => {
  const [activeTab, setActiveTab] = useState('content');
  const [savedTemplates, setSavedTemplates] = useState<QRSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [logoUrlLoading, setLogoUrlLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get storage service (localStorage in browser, Wails backend in desktop)
  const storage = useStorageService();
  const toast = useToast();

  /** Track a used color into the history (max 10, no duplicates) */
  const trackColor = (color: string) => {
    if (!color || color === '#00000000') return;
    setColorHistory(prev => {
      const updated = [color, ...prev.filter(c => c !== color)].slice(0, 10);
      storage.setSetting('color_history', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  /** Load color history from storage on mount */
  useEffect(() => {
    storage.getSetting('color_history').then(raw => {
      if (raw) {
        try { setColorHistory(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  /**
   * Load templates from storage on mount.
   * Uses storage abstraction to work in both browser and desktop modes.
   */
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoading(true);
        const templates = await storage.getTemplates();
        setSavedTemplates(templates);
      } catch (e) {
        console.error("Failed to load templates", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, [storage]);

  /**
   * Save the current settings as a new template.
   * Uses storage abstraction with proper error handling for quota errors in browser mode.
   */
  const saveTemplate = async () => {
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

    try {
      // Save to storage (handles both browser and desktop)
      await storage.saveTemplate(newTemplate);
      
      // Reload templates to get updated list
      const templates = await storage.getTemplates();
      setSavedTemplates(templates);
      updateSettings({ name });
      toast(`Design "${name}" saved!`, 'success');
    } catch (error) {
      console.error("Failed to save template", error);
      
      // Update in-memory state even if storage fails
      const updatedTemplates = [...savedTemplates, newTemplate];
      setSavedTemplates(updatedTemplates);
      updateSettings({ name });
      
      // Show appropriate error message
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        toast('Design saved to session only — logo too large for permanent storage.', 'warning');
      } else {
        toast('Design saved to session only due to a storage error.', 'warning');
      }
    }
  };

  /**
   * Duplicate an existing template with a new id and "(Copy)" suffix.
   */
  const duplicateTemplate = async (template: QRSettings) => {
    const copyName = `${template.name ?? 'Design'} (Copy)`;
    const duplicate: QRSettings = { ...template, id: `tpl_${Date.now()}`, name: copyName };
    try {
      await storage.saveTemplate(duplicate);
      const templates = await storage.getTemplates();
      setSavedTemplates(templates);
      toast(`Duplicated as "${copyName}"`, 'success');
    } catch (err) {
      console.error('Failed to duplicate template', err);
      toast('Failed to duplicate design.', 'error');
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

  const deleteTemplate = async (id: string) => {
      if(!confirm("Are you sure you want to delete this design?")) return;
      
      try {
        await storage.deleteTemplate(id);
        // Reload templates to get updated list
        const templates = await storage.getTemplates();
        setSavedTemplates(templates);
        toast('Design deleted.', 'info');
      } catch (error) {
        console.error("Failed to delete template", error);
        // Update in-memory state as fallback
        const updated = savedTemplates.filter(t => t.id !== id);
        setSavedTemplates(updated);
      }
  };

  const startRename = (template: QRSettings, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(template.id!);
    setRenameValue(template.name || '');
  };

  const commitRename = async (template: QRSettings) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === template.name) {
      setRenamingId(null);
      return;
    }
    try {
      await storage.saveTemplate({ ...template, name: trimmed });
      setSavedTemplates(prev => prev.map(t => t.id === template.id ? { ...t, name: trimmed } : t));
      toast(`Renamed to "${trimmed}"`, 'success');
    } catch (err) {
      console.error('Failed to rename template', err);
      toast('Failed to rename design.', 'error');
    }
    setRenamingId(null);
  };

  /**
   * Export all templates as a JSON file.
   * In desktop mode, uses native save dialog via Wails.
   * In browser mode, uses data URL download.
   */
  const handleExportTemplates = async () => {
    const jsonData = JSON.stringify(savedTemplates, null, 2);
    
    // In desktop mode, use native save dialog
    if (isDesktopMode()) {
      try {
        await storage.exportTemplates();
        alert("Templates exported successfully.");
        return;
      } catch (error) {
        console.error("Export failed, falling back to browser download", error);
      }
    }
    
    // Browser mode: use data URL download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonData);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "qr_studio_templates.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  /**
   * Import templates from a JSON file.
   * Uses storage abstraction to save imported templates.
   */
  const handleImportTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json)) {
                  // Import each template through storage service
                  for (const template of json) {
                    try {
                      await storage.saveTemplate(template);
                    } catch (err) {
                      console.warn("Failed to import template:", template.name, err);
                    }
                  }
                  
                  // Reload templates to get updated list
                  const templates = await storage.getTemplates();
                  setSavedTemplates(templates);
                  toast(`Imported ${json.length} template${json.length !== 1 ? 's' : ''}.`, 'success');
              } else {
                  toast('Invalid template file format.', 'error');
              }
          } catch (err) {
              console.error(err);
              toast('Failed to parse JSON file.', 'error');
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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 transition-colors">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
          <Tabs 
            tabs={[
                { id: 'content', label: 'Content', icon: <Type className="w-4 h-4"/> },
                { id: 'design', label: 'Design', icon: <Shapes className="w-4 h-4"/> },
                { id: 'colors', label: 'Colors', icon: <Palette className="w-4 h-4"/> },
                { id: 'logo', label: 'Logo', icon: <Image className="w-4 h-4"/> },
                { id: 'templates', label: 'Designs', icon: <LayoutTemplate className="w-4 h-4"/> },
            ]} 
            activeTab={activeTab} 
            onChange={setActiveTab}
            compact
          />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* --- CONTENT TAB --- */}
        {activeTab === 'content' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
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
                        <>
                        <Input
                            label={settings.dataType === 'email' ? 'Email Address' : settings.dataType === 'url' ? 'Website URL' : 'Content'}
                            placeholder={settings.dataType === 'url' ? 'https://example.com' : 'Enter text...'}
                            value={settings.textContent}
                            onChange={(e) => updateSettings({ textContent: e.target.value })}
                            autoFocus
                        />
                        {/* Character count + capacity indicator */}
                        {(() => {
                            const len = settings.textContent.length;
                            // QR capacity thresholds at error correction Q (alphanumeric/byte mode)
                            const maxBytes = 271; // ~271 chars at Q level, byte mode
                            const pct = Math.min(len / maxBytes, 1);
                            const barColor = pct < 0.6 ? 'bg-emerald-500' : pct < 0.85 ? 'bg-amber-500' : 'bg-red-500';
                            const label = pct < 0.6 ? 'Good' : pct < 0.85 ? 'Dense' : 'Very Dense';
                            return len > 0 ? (
                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                                        <span>{len} char{len !== 1 ? 's' : ''}</span>
                                        <span className={pct >= 0.85 ? 'text-red-500 font-semibold' : ''}>{label}</span>
                                    </div>
                                    <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct * 100}%` }} />
                                    </div>
                                </div>
                            ) : null;
                        })()}
                        {/* URL validation hint */}
                        {settings.dataType === 'url' && settings.textContent && 
                         !settings.textContent.startsWith('http://') && 
                         !settings.textContent.startsWith('https://') && (
                          <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <span>⚠</span> URLs should start with https:// or http://
                          </p>
                        )}
                        {/* Email validation hint */}
                        {settings.dataType === 'email' && settings.textContent && 
                         !settings.textContent.includes('@') && (
                          <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <span>⚠</span> Enter a valid email address (e.g. user@example.com)
                          </p>
                        )}
                        </>
                    )}

                    {settings.dataType === 'wifi' && (
                        <form className="space-y-4" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                            <Input
                                label="Network Name (SSID)"
                                autoComplete="off"
                                value={settings.wifiOptions.ssid}
                                onChange={(e) => updateSettings({ wifiOptions: { ...settings.wifiOptions, ssid: e.target.value } })}
                            />
                            <Input
                                label="Password"
                                type="password"
                                autoComplete="new-password"
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
                        </form>
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
                            <div>
                                <Input label="Email" value={settings.vcardOptions.email} onChange={(e) => updateSettings({ vcardOptions: {...settings.vcardOptions, email: e.target.value} })} />
                                {settings.vcardOptions.email && !settings.vcardOptions.email.includes('@') && (
                                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <span>⚠</span> Enter a valid email address
                                  </p>
                                )}
                            </div>
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
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
                        {([
                            {
                                id: 'none' as FrameStyle, label: 'None',
                                preview: (
                                    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
                                        <rect x="4" y="4" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" className="text-slate-300 dark:text-slate-600" />
                                        <rect x="10" y="10" width="20" height="20" rx="1" fill="currentColor" className="text-slate-200 dark:text-slate-700" />
                                        <rect x="14" y="14" width="12" height="12" rx="1" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                                    </svg>
                                )
                            },
                            {
                                id: 'simple' as FrameStyle, label: 'Box',
                                preview: (
                                    <svg viewBox="0 0 40 48" fill="none" className="w-8 h-10">
                                        <rect x="2" y="2" width="36" height="44" rx="4" fill={settings.frameOptions.color} opacity="0.9" />
                                        <rect x="6" y="6" width="28" height="28" rx="2" fill="white" />
                                        <rect x="10" y="10" width="8" height="8" rx="1" fill={settings.frameOptions.color} opacity="0.6" />
                                        <rect x="22" y="10" width="8" height="8" rx="1" fill={settings.frameOptions.color} opacity="0.6" />
                                        <rect x="10" y="22" width="8" height="8" rx="1" fill={settings.frameOptions.color} opacity="0.6" />
                                        <rect x="10" y="38" width="20" height="4" rx="2" fill="white" opacity="0.8" />
                                    </svg>
                                )
                            },
                            {
                                id: 'balloon' as FrameStyle, label: 'Balloon',
                                preview: (
                                    <svg viewBox="0 0 40 48" fill="none" className="w-8 h-10">
                                        <rect x="4" y="2" width="32" height="32" rx="2" fill="currentColor" className="text-slate-100 dark:text-slate-800" />
                                        <rect x="8" y="6" width="8" height="8" rx="1" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                                        <rect x="24" y="6" width="8" height="8" rx="1" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                                        <rect x="8" y="18" width="8" height="8" rx="1" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                                        <rect x="6" y="38" width="28" height="8" rx="4" fill={settings.frameOptions.color} />
                                    </svg>
                                )
                            },
                            {
                                id: 'badge' as FrameStyle, label: 'Badge',
                                preview: (
                                    <svg viewBox="0 0 40 50" fill="none" className="w-8 h-10">
                                        <rect x="2" y="2" width="36" height="46" rx="4" fill="white" stroke={settings.frameOptions.color} strokeWidth="2.5" />
                                        <rect x="7" y="7" width="8" height="8" rx="1" fill={settings.frameOptions.color} opacity="0.5" />
                                        <rect x="25" y="7" width="8" height="8" rx="1" fill={settings.frameOptions.color} opacity="0.5" />
                                        <rect x="7" y="19" width="8" height="8" rx="1" fill={settings.frameOptions.color} opacity="0.5" />
                                        <rect x="7" y="37" width="26" height="8" rx="3" fill={settings.frameOptions.color} />
                                    </svg>
                                )
                            },
                            {
                                id: 'corners' as FrameStyle, label: 'Corners',
                                preview: (
                                    <svg viewBox="0 0 40 48" fill="none" className="w-8 h-10">
                                        <rect x="4" y="4" width="32" height="32" rx="1" fill="currentColor" className="text-slate-100 dark:text-slate-800" />
                                        {/* Scanner corner brackets */}
                                        <path d="M4 12 L4 4 L12 4" stroke={settings.frameOptions.color} strokeWidth="3" strokeLinecap="round" fill="none" />
                                        <path d="M28 4 L36 4 L36 12" stroke={settings.frameOptions.color} strokeWidth="3" strokeLinecap="round" fill="none" />
                                        <path d="M4 24 L4 32 L12 32" stroke={settings.frameOptions.color} strokeWidth="3" strokeLinecap="round" fill="none" />
                                        <path d="M28 32 L36 32 L36 24" stroke={settings.frameOptions.color} strokeWidth="3" strokeLinecap="round" fill="none" />
                                        <rect x="8" y="38" width="24" height="7" rx="3.5" fill={settings.frameOptions.color} />
                                    </svg>
                                )
                            },
                            {
                                id: 'arrow' as FrameStyle, label: 'Arrow',
                                preview: (
                                    <svg viewBox="0 0 40 50" fill="none" className="w-8 h-10">
                                        <rect x="4" y="4" width="32" height="32" rx="2" fill="currentColor" className="text-slate-100 dark:text-slate-800" />
                                        <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                                        <rect x="24" y="8" width="8" height="8" rx="1" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                                        <rect x="8" y="20" width="8" height="8" rx="1" fill="currentColor" className="text-slate-400 dark:text-slate-500" />
                                        {/* Upward triangle connecting QR to label */}
                                        <polygon points="20,36 15,41 25,41" fill={settings.frameOptions.color} />
                                        <rect x="6" y="41" width="28" height="7" rx="3" fill={settings.frameOptions.color} />
                                    </svg>
                                )
                            },
                        ] as const).map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => updateSettings({ frameOptions: { ...settings.frameOptions!, style: opt.id } })}
                                className={`flex flex-col items-center justify-between p-2 pt-3 rounded-xl border-2 transition-all h-24 ${
                                    settings.frameOptions.style === opt.id 
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' 
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                            >
                                <div className="flex-1 flex items-center justify-center">{opt.preview}</div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${settings.frameOptions.style === opt.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                    {settings.frameOptions.style !== 'none' && (
                        <div className="space-y-3 mt-3">
                          <Input 
                              label="Frame Text" 
                              value={settings.frameOptions.text} 
                              onChange={(e) => updateSettings({ frameOptions: { ...settings.frameOptions!, text: e.target.value } })}
                              placeholder="SCAN ME"
                              maxLength={25}
                          />
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Font Family</label>
                            <select
                              value={settings.frameOptions.fontFamily || 'Inter, Arial, sans-serif'}
                              onChange={(e) => updateSettings({ frameOptions: { ...settings.frameOptions!, fontFamily: e.target.value } })}
                              className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                              aria-label="Frame font family"
                            >
                              <option value="Inter, Arial, sans-serif">Sans-serif (default)</option>
                              <option value="Georgia, 'Times New Roman', serif">Serif</option>
                              <option value="'Courier New', Courier, monospace">Monospace</option>
                              <option value="Impact, Haettenschweiler, sans-serif">Impact (bold)</option>
                              <option value="'Trebuchet MS', Helvetica, sans-serif">Trebuchet</option>
                            </select>
                          </div>
                        </div>
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-1 divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                    
                    {/* Background */}
                    {(() => {
                        const isTransparent = settings.backgroundOptions.color === '#00000000';
                        return (
                            <div>
                                <div className="flex items-center justify-between px-3 pt-3">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Background</span>
                                    <button
                                        onClick={() => updateSettings({
                                            backgroundOptions: {
                                                ...settings.backgroundOptions,
                                                color: isTransparent ? '#ffffff' : '#00000000',
                                                gradient: undefined,
                                                image: undefined,
                                            }
                                        })}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                                            isTransparent
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                        }`}
                                        title="When enabled, exports PNG/WebP with a transparent background"
                                    >
                                        <span className={`w-2 h-2 rounded-sm border ${isTransparent ? 'bg-transparent border-indigo-400' : 'bg-white border-slate-300'}`}
                                            style={isTransparent ? { backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)', backgroundSize: '4px 4px', backgroundPosition: '0 0, 2px 2px' } : {}}
                                        />
                                        Transparent
                                    </button>
                                </div>
                                {!isTransparent && (
                                    <ColorOrGradientControl
                                        label=""
                                        color={settings.backgroundOptions.color}
                                        gradient={settings.backgroundOptions.gradient}
                                        onColorChange={(c) => { updateSettings({ backgroundOptions: { ...settings.backgroundOptions, color: c, gradient: undefined, image: undefined } }); trackColor(c); }}
                                        onGradientChange={(g) => updateSettings({ backgroundOptions: { ...settings.backgroundOptions, gradient: g, image: undefined } })}
                                        colorHistory={colorHistory}
                                        onColorUsed={trackColor}
                                    />
                                )}
                                {isTransparent && (
                                    <p className="px-3 pb-3 text-xs text-indigo-600 dark:text-indigo-400">Transparent — PNG and WebP exports will have no background.</p>
                                )}
                            </div>
                        );
                    })()}

                    {/* Dots (Pattern) */}
                    <ColorOrGradientControl 
                        label="Pattern (Dots)"
                        color={settings.dotsOptions.color}
                        gradient={settings.dotsOptions.gradient}
                        onColorChange={(c) => { updateSettings({ dotsOptions: { ...settings.dotsOptions, color: c, gradient: undefined } }); trackColor(c); }}
                        onGradientChange={(g) => updateSettings({ dotsOptions: { ...settings.dotsOptions, gradient: g } })}
                        colorHistory={colorHistory}
                        onColorUsed={trackColor}
                    />

                    <div className="p-3">
                         <ColorPicker
                            label="Corner Frame Color"
                            value={settings.cornersSquareOptions.color}
                            onChange={(c) => { updateSettings({ cornersSquareOptions: { ...settings.cornersSquareOptions, color: c, gradient: undefined } }); trackColor(c); }}
                        />
                    </div>
                    <div className="p-3">
                         <ColorPicker
                            label="Corner Dot Color"
                            value={settings.cornersDotOptions.color}
                            onChange={(c) => { updateSettings({ cornersDotOptions: { ...settings.cornersDotOptions, color: c, gradient: undefined } }); trackColor(c); }}
                        />
                    </div>
                    {settings.frameOptions.style !== 'none' && (
                        <>
                        <div className="p-3">
                            <ColorPicker
                                label="Frame Color"
                                value={settings.frameOptions.color}
                                onChange={(c) => { updateSettings({ frameOptions: { ...settings.frameOptions!, color: c } }); trackColor(c); }}
                            />
                        </div>
                         <div className="p-3">
                            <ColorPicker
                                label="Frame Text Color"
                                value={settings.frameOptions.textColor}
                                onChange={(c) => { updateSettings({ frameOptions: { ...settings.frameOptions!, textColor: c } }); trackColor(c); }}
                            />
                        </div>
                        </>
                    )}
                </div>
                
                {/* Color Palette Presets */}
                <section className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Quick Color Palettes</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {([
                            { name: 'Classic', dot: '#000000', bg: '#ffffff', cs: '#000000', cd: '#000000' },
                            { name: 'Ocean', dot: '#0ea5e9', bg: '#f0f9ff', cs: '#0369a1', cd: '#0369a1' },
                            { name: 'Forest', dot: '#16a34a', bg: '#f0fdf4', cs: '#15803d', cd: '#15803d' },
                            { name: 'Violet', dot: '#7c3aed', bg: '#f5f3ff', cs: '#5b21b6', cd: '#5b21b6' },
                            { name: 'Sunset', dot: '#ea580c', bg: '#fff7ed', cs: '#c2410c', cd: '#c2410c' },
                            { name: 'Rose', dot: '#e11d48', bg: '#fff1f2', cs: '#be123c', cd: '#be123c' },
                            { name: 'Dark Mode', dot: '#e2e8f0', bg: '#0f172a', cs: '#94a3b8', cd: '#94a3b8' },
                            { name: 'Monochrome', dot: '#475569', bg: '#f8fafc', cs: '#1e293b', cd: '#64748b' },
                        ] as { name: string; dot: string; bg: string; cs: string; cd: string }[]).map((p) => (
                            <button
                                key={p.name}
                                onClick={() => updateSettings({
                                    dotsOptions: { ...settings.dotsOptions, color: p.dot, gradient: undefined },
                                    backgroundOptions: { ...settings.backgroundOptions, color: p.bg, gradient: undefined, image: undefined },
                                    cornersSquareOptions: { ...settings.cornersSquareOptions, color: p.cs, gradient: undefined },
                                    cornersDotOptions: { ...settings.cornersDotOptions, color: p.cd, gradient: undefined },
                                })}
                                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-left"
                            >
                                <div className="flex shrink-0">
                                    <div className="w-4 h-4 rounded-sm border border-slate-200 dark:border-slate-700" style={{ backgroundColor: p.bg }} />
                                    <div className="w-4 h-4 rounded-sm -ml-1.5" style={{ backgroundColor: p.dot }} />
                                </div>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

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
            </div>
        )}

        {/* --- LOGO TAB --- */}
        {activeTab === 'logo' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                 {!settings.image ? (
                    <div 
                        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors relative group cursor-pointer"
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-400', 'bg-slate-50', 'dark:bg-slate-900'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-indigo-400', 'bg-slate-50', 'dark:bg-slate-900'); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-indigo-400', 'bg-slate-50', 'dark:bg-slate-900');
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) onLogoUpload(file);
                        }}
                    >
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
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Click or drag &amp; drop to upload logo</p>
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
                            {/* Logo Size Presets */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Logo Size</label>
                                <div className="flex gap-2 mb-2">
                                    {([['S', 0.2, 3], ['M', 0.35, 5], ['L', 0.45, 8]] as [string, number, number][]).map(([label, size, margin]) => {
                                        const active = Math.abs(settings.imageOptions.imageSize - size) < 0.03;
                                        return (
                                            <button
                                                key={label}
                                                onClick={() => updateSettings({ imageOptions: { ...settings.imageOptions, imageSize: size, margin } })}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}
                                            >{label}</button>
                                        );
                                    })}
                                </div>
                                <Slider
                                    label=""
                                    value={settings.imageOptions.imageSize}
                                    min={0.1}
                                    max={0.5}
                                    step={0.05}
                                    onChange={(v) => updateSettings({ imageOptions: { ...settings.imageOptions, imageSize: v } })}
                                />
                            </div>
                            {/* Safety warning when logo is large and error correction is low */}
                            {settings.imageOptions.imageSize > 0.30 && settings.qrOptions.errorCorrectionLevel !== 'H' && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-400">
                                    <span className="shrink-0 mt-0.5">⚠️</span>
                                    <span>Large logo may reduce scannability. Set Error Correction to <strong>H (Max)</strong> in the Design tab for best results.</span>
                                </div>
                            )}
                            <Slider
                                label="Margin"
                                value={settings.imageOptions.margin}
                                min={0}
                                max={20}
                                onChange={(v) => updateSettings({ imageOptions: { ...settings.imageOptions, margin: v } })}
                            />
                            {/* Logo shape toggle */}
                            <div className="flex items-center justify-between py-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Logo Shape</label>
                                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                                    <button
                                        onClick={() => updateSettings({ imageOptions: { ...settings.imageOptions, borderRadius: 0 } })}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${!settings.imageOptions.borderRadius ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                    >Square</button>
                                    <button
                                        onClick={() => updateSettings({ imageOptions: { ...settings.imageOptions, borderRadius: 0.5 } })}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${settings.imageOptions.borderRadius === 0.5 ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                    >Circle</button>
                                </div>
                            </div>
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
                {/* Recent logos gallery */}
                {logoHistory.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Recent Logos</h4>
                        <div className="flex flex-wrap gap-2">
                            {logoHistory.map((dataUrl, i) => (
                                <button
                                    key={i}
                                    onClick={() => onLogoSelect?.(dataUrl)}
                                    title="Re-use this logo"
                                    aria-label={`Recent logo ${i + 1}`}
                                    className={`w-14 h-14 rounded-lg border-2 p-1 bg-slate-50 dark:bg-slate-900 transition-all hover:scale-105 ${
                                        settings.image === dataUrl
                                            ? 'border-indigo-500 shadow-md shadow-indigo-200 dark:shadow-indigo-900'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                                    }`}
                                >
                                    <img src={dataUrl} alt={`Recent logo ${i + 1}`} className="w-full h-full object-contain rounded" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Logo from URL */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Import from URL</h4>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={logoUrlInput}
                      onChange={e => setLogoUrlInput(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      aria-label="Logo image URL"
                      className="flex-1 text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none min-w-0"
                    />
                    <button
                      onClick={async () => {
                        const url = logoUrlInput.trim();
                        if (!url) return;
                        setLogoUrlLoading(true);
                        try {
                          const res = await fetch(url);
                          if (!res.ok) throw new Error(`HTTP ${res.status}`);
                          const blob = await res.blob();
                          if (!blob.type.startsWith('image/')) throw new Error('Not an image');
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              updateSettings({ image: reader.result });
                              setLogoUrlInput('');
                              toast('Logo loaded from URL', 'success');
                            }
                          };
                          reader.readAsDataURL(blob);
                        } catch (err) {
                          console.error('Logo URL import failed', err);
                          toast('Failed to load image — check the URL and CORS permissions.', 'error');
                        } finally {
                          setLogoUrlLoading(false);
                        }
                      }}
                      disabled={!logoUrlInput.trim() || logoUrlLoading}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                      aria-label="Load logo from URL"
                    >
                      {logoUrlLoading ? '…' : 'Load'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Image must allow cross-origin access (CORS).</p>
                </div>
            </div>
        )}

        {/* --- TEMPLATES / SAVED TAB --- */}
        {activeTab === 'templates' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">

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
                    
                    <Button fullWidth variant="outline" onClick={saveTemplate} className="border-dashed border-2 mb-3 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <Save className="w-4 h-4 mr-2"/>
                        Save Current as New Design
                    </Button>

                    {/* Search filter */}
                    {savedTemplates.length > 0 && (
                      <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search designs…"
                          value={templateSearch}
                          onChange={e => setTemplateSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-500"
                        />
                      </div>
                    )}
                    
                    {savedTemplates.length === 0 ? (
                        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Save className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No saved designs</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Customize a QR code and click "Save Current" to create your first template.</p>
                        </div>
                    ) : (() => {
                      const filtered = templateSearch.trim()
                        ? savedTemplates.filter(t => (t.name ?? '').toLowerCase().includes(templateSearch.toLowerCase()))
                        : savedTemplates;
                      if (filtered.length === 0) return (
                        <p className="text-xs text-center text-slate-400 dark:text-slate-500 py-6">No designs match "{templateSearch}"</p>
                      );
                      return (
                        <div className="grid grid-cols-2 gap-3">
                            {filtered.map((template, idx) => (
                                <div key={template.id || idx} className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all overflow-hidden shadow-sm hover:shadow-md">
                                    {/* Action buttons - Top Right */}
                                    <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => startRename(template, e)}
                                            className="p-1.5 bg-white/90 dark:bg-black/70 backdrop-blur hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all scale-90 group-hover:scale-100"
                                            title="Rename Design"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); duplicateTemplate(template); }}
                                            className="p-1.5 bg-white/90 dark:bg-black/70 backdrop-blur hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all scale-90 group-hover:scale-100"
                                            title="Duplicate Design"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id!); }}
                                            className="p-1.5 bg-white/90 dark:bg-black/70 backdrop-blur hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-400 hover:text-red-500 rounded-lg transition-all scale-90 group-hover:scale-100"
                                            title="Delete Design"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Load Action - Clickable Body */}
                                    <button 
                                        onClick={() => renamingId !== template.id && loadTemplate(template)}
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
                                        <div className="w-full" onClick={(e) => renamingId === template.id && e.stopPropagation()}>
                                            {renamingId === template.id ? (
                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        autoFocus
                                                        className="flex-1 text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-indigo-400 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                                                        value={renameValue}
                                                        onChange={(e) => setRenameValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') commitRename(template);
                                                            if (e.key === 'Escape') setRenamingId(null);
                                                        }}
                                                    />
                                                    <button onClick={() => commitRename(template)} className="p-1 text-indigo-600 hover:text-indigo-700 shrink-0" title="Save">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setRenamingId(null)} className="p-1 text-slate-400 hover:text-slate-600 shrink-0" title="Cancel">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate w-full pr-4">{template.name}</h4>
                                            )}
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
                      );
                    })()}
                </section>
            </div>
        )}

      </div>
    </div>
  );
};
