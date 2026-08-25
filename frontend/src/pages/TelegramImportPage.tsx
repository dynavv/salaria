import React, { useState, useRef } from 'react';
import { 
  FileUp, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  ArrowRight, 
  Calendar, 
  Coins, 
  Wallet, 
  Tag,
  Download,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, Category, ParsedTransaction, TelegramParseResult } from '../types';
import { api } from '../api/client';
import { IconRenderer } from '../components/IconRenderer';

interface TelegramImportPageProps {
  accounts: Account[];
  categories: Category[];
  onImportComplete: () => void;
  onNavigateToAdvisor: () => void;
}

export const TelegramImportPage: React.FC<TelegramImportPageProps> = ({
  accounts,
  categories,
  onImportComplete,
  onNavigateToAdvisor
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || 'acc_cash');
  const [parseResult, setParseResult] = useState<TelegramParseResult | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'parsed' | 'unparsed'>('parsed');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file parsing
  const handleProcessFile = async (file: File) => {
    try {
      setParsing(true);
      setError('');
      setSuccessMessage('');

      const result = await api.parseTelegramFile(file, selectedAccountId);
      setParseResult(result);
      setTransactions(result.transactions);
      setSelectedIds(new Set(result.transactions.map((t) => t.id)));
      setActiveTab('parsed');
    } catch (err: any) {
      setError(err.message || 'Không thể xử lý file Telegram HTML.');
    } finally {
      setParsing(false);
    }
  };

  // Load sample HTML to test immediately
  const handleLoadSample = async () => {
    try {
      setParsing(true);
      setError('');
      setSuccessMessage('');
      const sampleHtml = await api.getSampleTelegramHtml();
      const result = await api.parseTelegramText(sampleHtml, selectedAccountId);
      setParseResult(result);
      setTransactions(result.transactions);
      setSelectedIds(new Set(result.transactions.map((t) => t.id)));
      setActiveTab('parsed');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu mẫu.');
    } finally {
      setParsing(false);
    }
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Inline editing
  const handleUpdateTx = (id: string, field: keyof ParsedTransaction, value: any) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;
        const updated = { ...tx, [field]: value };
        if (field === 'categoryId') {
          const cat = categories.find((c) => c.id === value);
          if (cat) {
            updated.categoryName = cat.name;
            updated.categoryIcon = cat.icon;
            updated.categoryColor = cat.color;
          }
        }
        return updated;
      })
    );
  };

  const handleDeleteTx = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
  };

  // Confirm and Save into DB
  const handleConfirmImport = async () => {
    const txToSave = transactions.filter((t) => selectedIds.has(t.id));
    if (txToSave.length === 0) {
      setError('Vui lòng chọn ít nhất 1 giao dịch để lưu.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const res = await api.confirmImport(txToSave);

      // Trigger celebration confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSuccessMessage(res.message);
      onImportComplete();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu giao dịch vào cơ sở dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selectedIds.size;
  const selectedExpense = transactions
    .filter((t) => selectedIds.has(t.id) && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const selectedIncome = transactions
    .filter((t) => selectedIds.has(t.id) && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileUp className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-100">Import Nhật ký Telegram (HTML)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Tự động bóc tách ngày giờ, số tiền (50k, 50.000, 1.5tr...) và phân loại danh mục tiếng Việt từ file xuất Telegram.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadSample}
            disabled={parsing}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-400 border border-slate-700 transition active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nạp lại data mẫu demo</span>
          </button>

          <button
            onClick={async () => {
              if (window.confirm('Bạn có muốn xóa toàn bộ dữ liệu mẫu để bắt đầu sổ trắng 100% không?')) {
                await api.clearAllTransactions();
                onImportComplete();
                setSuccessMessage('Đã làm sạch toàn bộ dữ liệu cũ. Bây giờ bạn có thể kéo thả file Telegram thật của mình vào!');
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-slate-700 hover:border-rose-500/30 transition active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa sạch data mẫu</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-300">{successMessage}</p>
              <p className="text-xs text-slate-400">Dữ liệu đã được nạp vào sổ và cập nhật biểu đồ phân tích.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateToAdvisor}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
            >
              <span>Xem Nhận xét & Lời khuyên</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`p-8 rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
          dragOver
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-700/80 bg-slate-900/40 hover:bg-slate-800/40 hover:border-slate-600'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".html,.htm,.txt"
          onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
          <FileUp className={`w-7 h-7 ${parsing ? 'animate-bounce text-emerald-400' : 'text-slate-300'}`} />
        </div>

        <h3 className="text-sm font-bold text-slate-200">
          {parsing ? 'Đang phân tích file Telegram...' : 'Kéo thả file messages.html vào đây hoặc bấm để chọn file'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Hỗ trợ file HTML xuất từ Telegram Desktop (Chat Export). Tự động phân tích các dòng tin nhắn tiếng Việt.
        </p>

        {/* Target account picker */}
        <div className="mt-4 flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700" onClick={(e) => e.stopPropagation()}>
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span>Ghi nhận vào ví mặc định:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Parsed Results Preview Area */}
      {parseResult && transactions.length > 0 && (
        <div className="space-y-4">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400">Giao dịch tìm thấy</span>
              <p className="text-xl font-black text-slate-100 mt-1">
                {selectedCount} <span className="text-xs text-slate-500 font-normal">/ {transactions.length} dòng</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400">Tổng Chi trích xuất</span>
              <p className="text-xl font-black text-rose-400 mt-1">
                {selectedExpense.toLocaleString('vi-VN')} ₫
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400">Tổng Thu trích xuất</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {selectedIncome.toLocaleString('vi-VN')} ₫
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400">Khoảng thời gian</span>
              <p className="text-xs font-bold text-slate-300 mt-2 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>{parseResult.dateRange.start} → {parseResult.dateRange.end}</span>
              </p>
            </div>
          </div>

          {/* Table Tabs & Controls */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('parsed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'parsed'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Giao dịch hợp lệ ({transactions.length})
              </button>
              <button
                onClick={() => setActiveTab('unparsed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'unparsed'
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tin nhắn bỏ qua ({parseResult.unparsedMessages.length})
              </button>
            </div>

            {activeTab === 'parsed' && (
              <div className="flex items-center space-x-3 text-xs">
                <button
                  onClick={handleToggleSelectAll}
                  className="text-slate-400 hover:text-slate-200 font-medium"
                >
                  {selectedIds.size === transactions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
            )}
          </div>

          {/* Table Content */}
          {activeTab === 'parsed' ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700/60">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === transactions.length && transactions.length > 0}
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 w-28">Ngày</th>
                      <th className="py-3 px-3 w-28">Loại</th>
                      <th className="py-3 px-3 w-36">Số tiền (₫)</th>
                      <th className="py-3 px-3 w-44">Danh mục gán tự động</th>
                      <th className="py-3 px-3">Ghi chú & Raw Text</th>
                      <th className="py-3 px-3 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.map((tx) => {
                      const isSelected = selectedIds.has(tx.id);
                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-slate-800/40 transition ${
                            !isSelected ? 'opacity-50 bg-slate-950/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(tx.id)}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3">
                            <input
                              type="date"
                              value={tx.date}
                              onChange={(e) => handleUpdateTx(tx.id, 'date', e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-medium focus:outline-none focus:border-emerald-500 w-full"
                            />
                          </td>

                          {/* Type */}
                          <td className="py-3 px-3">
                            <select
                              value={tx.type}
                              onChange={(e) => handleUpdateTx(tx.id, 'type', e.target.value)}
                              className={`bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 font-bold focus:outline-none focus:border-emerald-500 w-full ${
                                tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              <option value="expense">Chi tiêu</option>
                              <option value="income">Thu nhập</option>
                            </select>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={tx.amount}
                              onChange={(e) => handleUpdateTx(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 font-extrabold text-slate-100 focus:outline-none focus:border-emerald-500 w-full"
                            />
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <select
                              value={tx.categoryId || ''}
                              onChange={(e) => handleUpdateTx(tx.id, 'categoryId', e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-medium focus:outline-none focus:border-emerald-500 w-full"
                            >
                              {categories
                                .filter((c) => c.type === (tx.type === 'income' ? 'income' : 'expense'))
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          </td>

                          {/* Note & Raw text */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={tx.note}
                                onChange={(e) => handleUpdateTx(tx.id, 'note', e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 w-full font-medium"
                              />
                              <p className="text-[11px] text-slate-500 truncate font-mono">
                                Gốc: "{tx.rawText}"
                              </p>
                            </div>
                          </td>

                          {/* Delete action */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteTx(tx.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800">
              {parseResult.unparsedMessages.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Không có tin nhắn nào bị bỏ qua.</p>
              ) : (
                parseResult.unparsedMessages.map((msg, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-300 font-mono">"{msg.text}"</span>
                      <p className="text-[11px] text-slate-500">{msg.date} • {msg.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sticky Confirm Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl sticky bottom-4 z-10">
            <div className="text-xs text-slate-300 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>
                Đã chọn <strong className="text-emerald-400 font-bold">{selectedCount}</strong> giao dịch để lưu vào cơ sở dữ liệu
              </span>
            </div>

            <button
              onClick={handleConfirmImport}
              disabled={saving || selectedCount === 0}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Đang lưu vào sổ...' : `Xác nhận & Lưu ${selectedCount} Giao dịch`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
