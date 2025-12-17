import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center justify-between py-1">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-mono">{value}</span>
        <div className="relative h-8 w-8 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
          />
        </div>
      </div>
    </div>
  );
};