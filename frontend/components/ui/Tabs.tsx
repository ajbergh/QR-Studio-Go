import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  /** When true, shows only icons on small screens */
  compact?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '', compact = false }) => {
  return (
    <div role="tablist" aria-label="Controls" className={`flex gap-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          title={tab.label}
          aria-label={tab.label}
          className={`
            flex-1 min-w-0 rounded-lg py-1.5 px-1 text-[11px] font-medium leading-5
            ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400
            focus:outline-none focus:ring-2
            flex items-center justify-center gap-1 transition-all duration-200
            ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/[0.12] hover:text-slate-800 dark:hover:text-slate-200'
            }
          `}
        >
          <span className="shrink-0">{tab.icon}</span>
          <span className={`truncate ${compact ? 'hidden sm:inline' : ''}`}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};