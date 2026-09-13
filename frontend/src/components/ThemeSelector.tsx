import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { currentTheme, toggleTheme } = useTheme();
  const isLight = currentTheme === 'github_light';

  return (
    <button
      onClick={toggleTheme}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all active:scale-95 shadow-sm text-xs font-semibold ${
        isLight
          ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 hover:text-slate-900'
          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-200 hover:text-white'
      }`}
      title={isLight ? 'Chuyển sang Chế độ Tối' : 'Chuyển sang Chế độ Sáng'}
    >
      <div className="flex items-center space-x-2.5">
        <span className="text-base">{isLight ? '☀️' : '🌙'}</span>
        <span>{isLight ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
      </div>
      <div className="p-1 rounded-lg bg-slate-500/10 text-slate-400">
        {isLight ? <Moon className="w-3.5 h-3.5 text-slate-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
      </div>
    </button>
  );
};
