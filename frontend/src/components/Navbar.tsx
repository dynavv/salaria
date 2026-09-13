import React from 'react';
import { 
  Plus, 
  Calendar, 
  RefreshCw, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  availableMonths: string[];
  onOpenQuickAdd: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMonth,
  setCurrentMonth,
  availableMonths,
  onOpenQuickAdd,
  onRefresh,
  loading = false,
}) => {
  // Format month for display (e.g. 2026-08 -> Tháng 08/2026)
  const formatMonthDisplay = (mStr: string) => {
    if (!mStr) return '';
    const [y, m] = mStr.split('-');
    return `Tháng ${m}/${y}`;
  };

  return (
    <header className="h-16 bg-slate-900/70 backdrop-blur-xl border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      
      {/* Left: Period Selector & Refresh */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/50 rounded-2xl px-3 py-1.5 text-xs text-slate-200 transition shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Kỳ xem:</span>
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="bg-transparent border-none text-slate-100 font-bold focus:outline-none cursor-pointer pr-1"
          >
            {availableMonths.length > 0 ? (
              availableMonths.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-100">
                  {formatMonthDisplay(m)}
                </option>
              ))
            ) : (
              <option value={currentMonth} className="bg-slate-900 text-slate-100">
                {formatMonthDisplay(currentMonth)}
              </option>
            )}
          </select>
        </div>

        <button
          onClick={() => onRefresh()}
          disabled={loading}
          title="Tải lại dữ liệu"
          className="p-2 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 text-slate-400 hover:text-slate-100 transition active:scale-95 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center space-x-2.5">
        {/* Quick Add Button with gradient glow */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Thêm Giao Dịch</span>
        </button>

      </div>
    </header>
  );
};
