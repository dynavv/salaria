import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Trash2, 
  Plus, 
  ArrowUpDown, 
  Calendar,
  Wallet,
  Tag,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { Transaction, Account, Category } from '../types';
import { api } from '../api/client';
import { IconRenderer } from '../components/IconRenderer';

interface TransactionsPageProps {
  currentMonth: string;
  refreshTrigger?: number;
  accounts: Account[];
  categories: Category[];
  onOpenQuickAdd: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  currentMonth,
  refreshTrigger,
  accounts,
  categories,
  onOpenQuickAdd,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth);
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setFilterMonth(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    loadTransactions();
  }, [filterMonth, filterType, filterAccount, filterCategory, search, sortBy, refreshTrigger]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({
        month: filterMonth,
        type: filterType || undefined,
        account_id: filterAccount || undefined,
        category_id: filterCategory || undefined,
        search: search || undefined,
        sort_by: sortBy,
        limit: 200,
      });
      setTransactions(res.transactions);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này khỏi sổ?')) return;
    try {
      setDeletingId(id);
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete transaction', err);
    } finally {
      setDeletingId(null);
    }
  };

  const totalFilteredAmount = transactions.reduce((sum, t) => {
    if (t.type === 'expense') return sum - Number(t.amount);
    if (t.type === 'income') return sum + Number(t.amount);
    return sum;
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-20">
      
      {/* 🌟 Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-100">Sổ Chi Tiết Giao Dịch</h2>
          </div>
          <p className="text-xs text-slate-400">
            Tra cứu, lọc nhanh và quản lý toàn bộ các bản ghi thu chi phát sinh trong kỳ.
          </p>
        </div>

        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition active:scale-95 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Thêm Giao Dịch</span>
        </button>
      </div>

      {/* 🔍 Segmented Filter Bar & Controls */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        
        {/* Type Segmented Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-1.5 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
            {[
              { id: '', label: 'Tất cả', count: transactions.length },
              { id: 'expense', label: 'Chi tiêu', icon: TrendingDown, color: 'text-rose-400' },
              { id: 'income', label: 'Thu nhập', icon: TrendingUp, color: 'text-emerald-400' },
              { id: 'transfer', label: 'Chuyển khoản', icon: ArrowRightLeft, color: 'text-sky-400' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === tab.id
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Summary Pill */}
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <span>Tìm thấy: <b className="text-slate-200">{transactions.length}</b> bản ghi</span>
            <span className="text-slate-600">•</span>
            <span>Dòng tiền: <b className={totalFilteredAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{totalFilteredAmount.toLocaleString('vi-VN')} ₫</b></span>
          </div>
        </div>

        {/* Search & Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo món ăn, nơi chi, ghi chú..."
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-2xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800/60 border border-slate-700/60 rounded-2xl px-3 py-2 text-xs font-bold text-sky-400 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
          >
            <option value="date_desc">📅 Ngày: Mới nhất trước</option>
            <option value="amount_desc">🔥 Số tiền: Chi nhiều nhất trước (Top Chi ↓)</option>
            <option value="amount_asc">🌱 Số tiền: Nhỏ nhất trước (Khoản nhỏ ↑)</option>
            <option value="date_asc">📅 Ngày: Cũ nhất trước</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800/60 border border-slate-700/60 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Account Filter */}
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="bg-slate-800/60 border border-slate-700/60 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
          >
            <option value="">Tất cả ví tài khoản</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

        </div>
      </div>

      {/* 📋 Transactions Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <span>Đang tải danh sách giao dịch...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300">Không tìm thấy giao dịch nào phù hợp với bộ lọc.</p>
            <p className="text-slate-500 text-[11px]">Hãy thử tìm kiếm với từ khóa khác hoặc xóa bớt bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-32">Ngày ghi nhận</th>
                  <th className="py-3.5 px-3 w-48">Danh mục</th>
                  <th className="py-3.5 px-3">Ghi chú chi tiết</th>
                  <th className="py-3.5 px-3 w-40">Tài khoản ví</th>
                  <th className="py-3.5 px-4 w-36 text-right">Số tiền</th>
                  <th className="py-3.5 px-3 w-14 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition group">
                    
                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-300 font-medium whitespace-nowrap">
                      {tx.date}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: tx.category_color || '#64748b' }}
                        >
                          <IconRenderer name={tx.category_icon || 'Tag'} className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-200 truncate">
                          {tx.type === 'transfer' ? 'Chuyển khoản' : tx.category_name || 'Khác'}
                        </span>
                      </div>
                    </td>

                    {/* Note & Raw message */}
                    <td className="py-3.5 px-3 max-w-xs md:max-w-sm lg:max-w-md">
                      <p className="font-medium text-slate-200 break-words leading-relaxed">
                        {tx.note || 'Chi tiêu'}
                      </p>
                      {tx.raw_telegram_text && tx.raw_telegram_text !== tx.note && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 break-all line-clamp-2" title={tx.raw_telegram_text}>
                          Gốc: "{tx.raw_telegram_text}"
                        </p>
                      )}
                    </td>

                    {/* Account */}
                    <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                      {tx.type === 'transfer' ? (
                        <span>{tx.account_name} → {tx.destination_account_name}</span>
                      ) : (
                        <span>{tx.account_name}</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-black text-sm tracking-tight ${
                          tx.type === 'income'
                            ? 'text-emerald-400'
                            : tx.type === 'transfer'
                            ? 'text-sky-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {Number(tx.amount).toLocaleString('vi-VN')} ₫
                      </span>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        disabled={deletingId === tx.id}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition opacity-0 group-hover:opacity-100"
                        title="Xóa giao dịch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
