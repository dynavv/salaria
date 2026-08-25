import React from 'react';
import { 
  LayoutDashboard, 
  FileCode2, 
  GitCompare, 
  Sparkles, 
  Receipt, 
  Wallet, 
  Tags,
  Download,
  Upload,
  Coins
} from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';

export type TabType = 'dashboard' | 'compare' | 'advisor' | 'transactions' | 'accounts' | 'categories' | 'backup';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  totalBalance: number;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, totalBalance }) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Tổng quan (Dashboard)', icon: LayoutDashboard },
    { id: 'compare', label: 'So sánh các tháng', icon: GitCompare },
    { id: 'advisor', label: 'Cố vấn & Lời khuyên', icon: Sparkles, badge: 'AI' },
    { id: 'transactions', label: 'Sổ giao dịch', icon: Receipt },
    { id: 'accounts', label: 'Quản lý Ví / Tài khoản', icon: Wallet },
    { id: 'categories', label: 'Danh mục thu chi', icon: Tags },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-300 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-xl tracking-tighter">
            S
          </div>
          <div>
            <h1 className="font-black text-base text-slate-100 tracking-tight">Salaria</h1>
            <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Wealth Flow AI</p>
          </div>
        </div>

        {/* Total Net Worth Pill Card */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 shadow-inner">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-medium">
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tổng tài sản khả dụng</span>
          </div>
          <p className={`text-lg font-black mt-1 tracking-tight ${totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalBalance.toLocaleString('vi-VN')} ₫
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Menu Chính
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 relative ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 transition ${isActive ? 'text-emerald-400 scale-110' : 'text-slate-400'}`} />
                <span className="tracking-tight">{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Theme Selector */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
        <ThemeSelector />
      </div>
    </aside>
  );
};
