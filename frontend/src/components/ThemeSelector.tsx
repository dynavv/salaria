import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeThemeObj = themes.find((t) => t.id === currentTheme) || themes[0];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Sidebar Footer Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all active:scale-95 shadow-sm"
        title="Đổi chủ đề giao diện"
      >
        <div className="flex items-center space-x-2">
          <span className="text-base">{activeThemeObj.icon}</span>
          <span className="text-xs text-slate-200 font-semibold">{activeThemeObj.name}</span>
        </div>
        <Palette className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Upward Dropdown Panel */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Chủ Đề Giao Diện</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{themes.length} Themes</span>
          </div>

          <div className="space-y-1">
            {themes.map((t) => {
              const isSelected = t.id === currentTheme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-slate-800 border border-slate-600 shadow-md'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{t.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                        {t.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{t.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Color Dots */}
                    <div className="flex items-center -space-x-1">
                      {t.previewColors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-2.5 h-2.5 rounded-full border border-slate-900 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
