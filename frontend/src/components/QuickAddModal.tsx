import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Account, Category } from '../types';
import { api } from '../api/client';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onSuccess: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onSuccess,
}) => {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || 'acc_cash');
  const [destAccountId, setDestAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount.replace(/[,.]/g, ''));
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }

    if (!accountId) {
      setError('Vui lòng chọn ví thanh toán');
      return;
    }

    if (type === 'transfer' && !destAccountId) {
      setError('Vui lòng chọn ví đích nhận tiền chuyển');
      return;
    }

    try {
      setSubmitting(true);
      await api.createTransaction({
        date,
        amount: numAmount,
        type,
        account_id: accountId,
        destination_account_id: type === 'transfer' ? destAccountId : null,
        category_id: type === 'transfer' ? null : categoryId || filteredCategories[0]?.id || null,
        note,
        source: 'manual',
      });

      // Reset & notify
      setAmount('');
      setNote('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm giao dịch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Ghi nhận Giao dịch Nhanh</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Transaction Type Segment */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chi tiêu (Expense)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Thu nhập (Income)
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'transfer'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chuyển khoản (Transfer)
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Số tiền (₫) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ví dụ: 50000 hoặc 1500000"
                autoFocus
                required
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <span className="absolute right-4 top-3.5 text-xs font-semibold text-slate-400">VND</span>
            </div>
          </div>

          {/* Date & Account row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ngày ghi nhận</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ví / Tài khoản</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.current_balance !== undefined ? acc.current_balance.toLocaleString('vi-VN') + '₫' : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category or Destination Account */}
          {type === 'transfer' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Chuyển đến Ví</label>
              <select
                value={destAccountId}
                onChange={(e) => setDestAccountId(e.target.value)}
                required
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Chọn ví nhận --</option>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Danh mục</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.group_type === 'needs' ? 'Thiết yếu' : cat.group_type === 'wants' ? 'Sở thích' : 'Khác'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ghi chú (Tùy chọn)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ăn trưa, cafe Highland, xăng xe..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Đang lưu...' : 'Lưu Giao Dịch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
