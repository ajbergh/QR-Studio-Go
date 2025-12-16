import React, { useState, useEffect } from 'react';
import { QRControls } from './components/QRControls';
import { QRPreview } from './components/QRPreview';
import { QRSettings } from './types';
import { ScanLine, Sun, Moon } from 'lucide-react';

// Initial state
const INITIAL_SETTINGS: QRSettings = {
  width: 1000,
  height: 1000,
  data: 'https://qr-studio.app',
  dataType: 'url',
  textContent: 'https://qr-studio.app',
  wifiOptions: {
    ssid: '',
    password: '',
    encryption: 'WPA',
    hidden: false
  },
  vcardOptions: {
    firstName: '',
    lastName: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    company: '',
    jobTitle: '',
    street: '',
    city: '',
    zip: '',
    country: ''
  },
  eventOptions: {
    title: '',
    location: '',
    description: '',
    startTime: '',
    endTime: ''
  },
  locationOptions: {
    latitude: '',
    longitude: ''
  },
  margin: 10,
  qrOptions: {
    typeNumber: 0,
    mode: 'Byte',
    errorCorrectionLevel: 'Q'
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 5,
    crossOrigin: 'anonymous',
  },
  dotsOptions: {
    type: 'classy-rounded',
    color: '#334155',
  },
  backgroundOptions: {
    color: '#ffffff',
  },
  cornersSquareOptions: {
    type: 'extra-rounded',
    color: '#334155',
  },
  cornersDotOptions: {
    type: 'dot',
    color: '#334155',
  },
  frameOptions: {
    style: 'none',
    text: "SCAN ME",
    color: "#334155",
    textColor: "#ffffff"
  }
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<QRSettings>(INITIAL_SETTINGS);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check system preference on load
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  const updateSettings = (newSettings: Partial<QRSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            updateSettings({ image: reader.result });
        }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} h-full`}>
      <div className="h-screen flex flex-col font-sans overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300">
        {/* Header - Minimal Enterprise Style */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-6 justify-between shrink-0 z-20 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-indigo-200 dark:shadow-none shadow-lg">
                  <ScanLine className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">QR Studio <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium ml-2 border border-slate-200 dark:border-slate-700">PRO</span></span>
            </div>
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
               >
                 {darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
               </button>
               <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
               <a href="#" className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 text-sm font-medium transition-colors">Docs</a>
               <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors">GitHub</a>
            </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar - Configuration */}
          <aside className="w-[420px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-colors">
               <QRControls 
                  settings={settings} 
                  updateSettings={updateSettings} 
                  onLogoUpload={handleLogoUpload}
                  onRemoveLogo={() => updateSettings({ image: undefined })}
               />
          </aside>

          {/* Right Area - Canvas / Preview */}
          <main className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden flex flex-col transition-colors">
              {/* Background Pattern for Professional Feel */}
              <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1]" 
                  style={{ 
                      backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                      backgroundSize: '24px 24px' 
                  }}>
              </div>

              <div className="flex-1 flex items-center justify-center p-8 overflow-auto z-10">
                  <QRPreview settings={settings} />
              </div>

              <div className="h-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 shrink-0 transition-colors">
                   Generated securely in your browser. No data is sent to servers.
              </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;