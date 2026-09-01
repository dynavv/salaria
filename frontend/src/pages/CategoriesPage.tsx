import React, { useState } from 'react';
import { 
  Tags, 
  Plus, 
  Trash2, 
  Edit2, 
  Sparkles, 
  Tag, 
  X, 
  TrendingDown, 
  TrendingUp,
  Sliders,
  DollarSign
} from 'lucide-react';
import { Category } from '../types';
import { api } from '../api/client';
import { IconRenderer } from '../components/IconRenderer';

interface CategoriesPageProps {
  categories: Category[];
  onRefresh: () => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ categories, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTypeTab, setActiveTypeTab] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [groupType, setGroupType] = useState<Category['group_type']>('needs');
  const [keywords, setKeywords] = useState('');
  const [budgetMonthly, setBudgetMonthly] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      await api.createCategory({
        name: name.trim(),
        type,
        group_type: groupType,
        keywords: keywords.trim(),
        budget_monthly: parseFloat(budgetMonthly) || 0,
        icon: 'Tag',
        color: type === 'income' ? '#10b981' : groupType === 'needs' ? '#3b82f6' : '#ec4899',
      });
      setName('');
      setKeywords('');
      setBudgetMonthly('');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayedCategories = categories.filter((c) => c.type === activeTypeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-20">
      
      {/* 🌟 Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Tags className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-100">Danh Mục & Từ Khóa Nhận Diện AI</h2>
          </div>
          <p className="text-xs text-slate-400">
            Hệ thống dựa vào từ khóa để tự động nhận diện danh mục thông minh khi bạn gửi tin nhắn hoặc ngân hàng báo biến động số dư.
          </p>
        </div>

        <button
          onClick={() => {
            setType(activeTypeTab);
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition active:scale-95 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Thêm Danh Mục</span>
        </button>
      </div>

      {/* 🔍 Segmented Tab Controls */}
      <div className="flex items-center space-x-1.5 bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/50 w-fit">
        <button
          onClick={() => setActiveTypeTab('expense')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTypeTab === 'expense'
              ? 'bg-slate-700 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          <span>Danh mục Chi tiêu ({categories.filter((c) => c.type === 'expense').length})</span>
        </button>
        <button
          onClick={() => setActiveTypeTab('income')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTypeTab === 'income'
              ? 'bg-slate-700 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>Danh mục Thu nhập ({categories.filter((c) => c.type === 'income').length})</span>
        </button>
      </div>

      {/* 📋 Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedCategories.map((cat) => {
          const kwList = cat.keywords ? cat.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [];
          return (
            <div
              key={cat.id}
              className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 group hover:border-slate-700/80 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                      style={{ backgroundColor: cat.color || '#64748b' }}
                    >
                      <IconRenderer name={cat.icon || 'Tag'} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-100 truncate">{cat.name}</h4>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {cat.group_type === 'needs'
                          ? '1. Thiết yếu (Needs ≤ 50%)'
                          : cat.group_type === 'wants'
                          ? '2. Linh hoạt (Wants ≤ 30%)'
                          : cat.group_type === 'savings'
                          ? '3. Tích lũy (Savings ≥ 20%)'
                          : 'Thu nhập'}
                      </span>
                    </div>
                  </div>

                  {cat.budget_monthly > 0 && (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 font-medium">Hạn mức/tháng</span>
                      <p className="text-xs font-black text-amber-400">{cat.budget_monthly.toLocaleString('vi-VN')} ₫</p>
                    </div>
                  )}
                </div>

                {/* Keywords Cloud */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-2">
                    <span>Từ khóa kích hoạt ({kwList.length})</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Auto-detect</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {kwList.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">Chưa gắn từ khóa nhận diện</span>
                    ) : (
                      kwList.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-300 font-medium"
                        >
                          {kw}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Bot Teach Keyword Tip */}
              <div className="p-2.5 rounded-2xl bg-slate-800/30 border border-slate-700/30 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Dạy bot qua Telegram:</span>
                <code className="text-sky-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded-md">từ_khóa = {cat.name}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* ➕ Modal Thêm Danh Mục Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-slate-100">Thêm Danh Mục Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tên danh mục</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Ăn vặt, Tiền điện, Gym..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Loại danh mục</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="expense">Chi tiêu (Expense)</option>
                    <option value="income">Thu nhập (Income)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nhóm 50/30/20</label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="needs">1. Thiết yếu (Needs 50%)</option>
                    <option value="wants">2. Linh hoạt (Wants 30%)</option>
                    <option value="savings">3. Tích lũy (Savings 20%)</option>
                    <option value="income">Thu nhập</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ngân sách chi tiêu hàng tháng (₫, không bắt buộc)</label>
                <input
                  type="number"
                  value={budgetMonthly}
                  onChange={(e) => setBudgetMonthly(e.target.value)}
                  placeholder="Ví dụ: 3000000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Từ khóa tự động nhận diện (cách nhau bằng dấu phẩy)</label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Ví dụ: banh mi, tra sua, pho, bun cha..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
