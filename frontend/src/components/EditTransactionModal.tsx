import React, { useState, useEffect } from 'react';
import { X, Check, Pencil, Sparkles } from 'lucide-react';
import { Transaction, Account, Category } from '../types';
import { api } from '../api/client';
import { matchCategoryFromText } from '../utils/categoryMatcher';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  accounts,
  categories,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [destAccountId, setDestAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [autoMatchedName, setAutoMatchedName] = useState<string>('');

  useEffect(() => {
    if (transaction) {
      setType(transaction.type || 'expense');
      setAmount(String(transaction.amount || ''));
      setDate(transaction.date || new Date().toISOString().split('T')[0]);
      setAccountId(transaction.account_id || accounts[0]?.id || 'acc_cash');
      setDestAccountId(transaction.destination_account_id || '');
      setCategoryId(transaction.category_id || '');
      setNote(transaction.note || '');
      setError('');
      setAutoMatchedName('');
    }
  }, [transaction, accounts]);

  if (!isOpen || !transaction) return null;

  const filteredCategories = categories.filter(
    (c) => c.type === (type === 'income' ? 'income' : 'expense')
  );

  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    if (type !== 'transfer' && newNote.trim()) {
      const matched = matchCategoryFromText(newNote, type, categories);
      if (matched) {
        setCategoryId(matched.id);
        setAutoMatchedName(matched.name);
      }
    }
  };

  const handleTypeChange = (newType: 'expense' | 'income' | 'transfer') => {
    setType(newType);
    if (newType !== 'transfer') {
      const matched = matchCategoryFromText(note, newType, categories);
      const validCats = categories.filter(c => c.type === (newType === 'income' ? 'income' : 'expense'));
      if (matched) {
        setCategoryId(matched.id);
        setAutoMatchedName(matched.name);
      } else if (!validCats.some(c => c.id === categoryId)) {
        setCategoryId(validCats[0]?.id || '');
        setAutoMatchedName('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount.replace(/[,.]/g, ''));
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }

    if (!accountId) {
      setError('Vui lòng chọn ví/tài khoản thanh toán');
      return;
    }

    if (type === 'transfer' && !destAccountId) {
      setError('Vui lòng chọn ví đích nhận tiền chuyển');
      return;
    }

    try {
      setSubmitting(true);
      await api.updateTransaction(transaction.id, {
        date,
        amount: numAmount,
        type,
        account_id: accountId,
        destination_account_id: type === 'transfer' ? destAccountId : null,
        category_id: type === 'transfer' ? null : categoryId || null,
        note,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật giao dịch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Pencil className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-100">Chỉnh sửa Giao dịch</h2>
          </div>
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

          {/* Raw Text hint if available */}
          {transaction.raw_telegram_text && (
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-[11px] text-slate-400 font-mono break-all">
              <span className="text-slate-500 font-sans font-semibold">Nội dung gốc: </span>
              {transaction.raw_telegram_text}
            </div>
          )}

          {/* Transaction Type Segment */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Thu nhập
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                type === 'transfer'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chuyển khoản
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
                required
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-4 pr-14 py-3 text-lg font-bold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-3.5 text-xs font-semibold text-slate-400 select-none pointer-events-none">VND</span>
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
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ví / Tài khoản</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
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
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500"
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Danh mục</label>
                {autoMatchedName && (
                  <span className="text-[10px] text-sky-400 font-semibold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Tự động nhận diện: {autoMatchedName}</span>
                  </span>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setAutoMatchedName('');
                }}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Chọn danh mục --</option>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ghi chú</label>
            <input
              type="text"
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Ăn trưa, cafe Highland, xăng xe..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
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
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
