import React, { useState } from 'react';
import { Tags, Plus, Trash2, Edit2, Sparkles } from 'lucide-react';
import { Category } from '../types';
import { api } from '../api/client';
import { IconRenderer } from '../components/IconRenderer';

interface CategoriesPageProps {
  categories: Category[];
  onRefresh: () => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ categories, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [groupType, setGroupType] = useState<Category['group_type']>('needs');
  const [keywords, setKeywords] = useState('');
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
        icon: 'Tag',
        color: '#64748b',
      });
      setName('');
      setKeywords('');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Tags className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-100">Danh Mục & Từ Khóa Nhận Diện Tự Động</h2>
          </div>
          <p className="text-xs text-slate-400">
            Hệ thống sử dụng các từ khóa tiếng Việt này để tự động gán nhãn chính xác khi bạn import file Telegram.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Danh Mục Mới</span>
        </button>
      </div>

      {/* Expense Categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
          <span>Danh mục Chi tiêu ({expenseCategories.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {expenseCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    <IconRenderer name={cat.icon} className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-100">{cat.name}</h4>
                    <span className="text-[10px] text-slate-400">
                      {cat.group_type === 'needs' ? 'Thiết yếu (Needs)' : 'Sở thích (Wants)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <p className="text-[11px] text-slate-400 font-medium">Từ khóa tự nhận diện:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cat.keywords
                    .split(',')
                    .slice(0, 6)
                    .map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {kw.trim()}
                      </span>
                    ))}
                  {cat.keywords.split(',').length > 6 && (
                    <span className="text-[10px] text-slate-500 self-center">
                      +{cat.keywords.split(',').length - 6} từ khác
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Income Categories */}
      <div className="space-y-3 pt-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span>Danh mục Thu nhập ({incomeCategories.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {incomeCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md space-y-2"
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  <IconRenderer name={cat.icon} className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-100">{cat.name}</h4>
                  <span className="text-[10px] text-emerald-400 font-semibold">Thu nhập</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <p className="text-[11px] text-slate-400 font-medium">Từ khóa tự nhận diện:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cat.keywords.split(',').map((kw, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      {kw.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">Thêm Danh Mục Mới</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tên danh mục</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ví dụ: Đồ gia dụng, Thú cưng..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loại</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="expense">Chi tiêu (Expense)</option>
                    <option value="income">Thu nhập (Income)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nhóm 50/30/20</label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="needs">Thiết yếu (Needs)</option>
                    <option value="wants">Sở thích (Wants)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Từ khóa nhận diện tự động (cách nhau dấu phẩy)
                </label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={3}
                  placeholder="thu cung,cho meo,thuc an cho,pate,cat ve sinh..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
