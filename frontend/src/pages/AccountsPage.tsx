import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Building2, 
  Smartphone, 
  CreditCard, 
  Banknote, 
  ShieldCheck,
  ArrowRightLeft,
  Coins,
  TrendingUp,
  X,
  CreditCard as CardIcon
} from 'lucide-react';
import { Account } from '../types';
import { api } from '../api/client';
import { IconRenderer } from '../components/IconRenderer';

interface AccountsPageProps {
  accounts: Account[];
  onRefresh: () => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({ accounts, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      await api.createAccount({
        name: name.trim(),
        type,
        initial_balance: parseFloat(initialBalance) || 0,
        icon: type === 'bank' ? 'Building2' : type === 'credit' ? 'CreditCard' : type === 'e-wallet' ? 'Smartphone' : 'Banknote',
        color: type === 'bank' ? '#3b82f6' : type === 'credit' ? '#8b5cf6' : type === 'e-wallet' ? '#ec4899' : '#10b981',
      });
      setName('');
      setInitialBalance('');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này? Tất cả giao dịch liên quan sẽ bị xóa!')) return;
    try {
      await api.deleteAccount(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!fromAccount || !toAccount || fromAccount === toAccount || !amt || amt <= 0) return;

    try {
      setSubmitting(true);
      await api.createTransaction({
        date: new Date().toISOString().substring(0, 10),
        amount: amt,
        type: 'transfer',
        category_id: null,
        account_id: fromAccount,
        destination_account_id: toAccount,
        note: transferNote.trim() || 'Chuyển tiền nội bộ',
      });
      setShowTransferModal(false);
      setTransferAmount('');
      setTransferNote('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance ?? a.balance ?? 0), 0);

  // Card gradient backgrounds based on type
  const getCardGradient = (type: string, color: string) => {
    if (type === 'bank') return 'from-blue-950/80 via-slate-900/90 to-slate-950';
    if (type === 'credit') return 'from-purple-950/80 via-slate-900/90 to-slate-950';
    if (type === 'e-wallet') return 'from-pink-950/80 via-slate-900/90 to-slate-950';
    return 'from-emerald-950/80 via-slate-900/90 to-slate-950';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-20">
      
      {/* 🌟 Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-100">Quản Lý Ví & Tài Khoản</h2>
          </div>
          <p className="text-xs text-slate-400">
            Theo dõi số dư thực tế giữa tiền mặt, tài khoản ngân hàng, ví điện tử và thẻ tín dụng.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (accounts.length >= 2) {
                setFromAccount(accounts[0].id);
                setToAccount(accounts[1].id);
              }
              setShowTransferModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-bold transition active:scale-95 shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-sky-400" />
            <span>Chuyển Tiền Nội Bộ</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tài Khoản</span>
          </button>
        </div>
      </div>

      {/* 💳 Digital Smart Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const bal = acc.current_balance ?? acc.balance ?? 0;
          return (
            <div
              key={acc.id}
              className={`p-6 rounded-3xl bg-gradient-to-br ${getCardGradient(acc.type, acc.color)} border border-slate-700/50 shadow-xl flex flex-col justify-between h-52 relative overflow-hidden group hover:border-slate-600/80 transition-all`}
            >
              {/* Card Watermark & Chip */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
              
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                      style={{ backgroundColor: acc.color }}
                    >
                      <IconRenderer name={acc.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{acc.name}</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {acc.type === 'bank' ? 'Ngân hàng' : acc.type === 'credit' ? 'Thẻ tín dụng' : acc.type === 'e-wallet' ? 'Ví điện tử' : 'Tiền mặt'}
                      </span>
                    </div>
                  </div>

                  {acc.is_default !== 1 && (
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 rounded-xl transition opacity-0 group-hover:opacity-100"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Chip Visual */}
              <div className="flex items-center justify-between my-auto">
                <div className="w-8 h-6 rounded-md bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                  <div className="w-4 h-3 border-t border-b border-amber-400/60"></div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 tracking-widest">•••• •••• •••• {acc.id.slice(-4)}</span>
              </div>

              {/* Card Balance */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Số dư khả dụng</span>
                <p className={`text-2xl font-black mt-0.5 tracking-tight ${bal >= 0 ? 'text-slate-100' : 'text-rose-400'}`}>
                  {bal.toLocaleString('vi-VN')} ₫
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ➕ Modal Thêm Tài Khoản Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-slate-100">Thêm Ví / Tài Khoản Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tên tài khoản / Ví</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: MSB Digibank, Vietcombank, Momo..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Loại ví / Tài khoản</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="cash">Tiền mặt (Cash)</option>
                  <option value="bank">Tài khoản Ngân hàng (Bank)</option>
                  <option value="e-wallet">Ví điện tử (Momo, ZaloPay...)</option>
                  <option value="credit">Thẻ tín dụng (Credit Card)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Số dư ban đầu (₫)</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
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
                  {submitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔄 Modal Chuyển Tiền Nội Bộ */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">Chuyển Tiền Nội Bộ</h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="p-1 text-slate-400 hover:text-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Chuyển từ ví</label>
                  <select
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Chuyển đến ví</label>
                  <select
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Số tiền chuyển (₫)</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Ví dụ: 500000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-sky-500 text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ghi chú chuyển</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Ví dụ: Rút ATM, Nạp Momo, Chuyển tiết kiệm..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition"
                >
                  {submitting ? 'Đang chuyển...' : 'Xác Nhận Chuyển'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
