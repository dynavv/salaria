import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  HelpCircle, 
  Copy, 
  ExternalLink,
  MessageSquare,
  Bot
} from 'lucide-react';
import { api } from '../api/client';

interface TelegramBotConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export const TelegramBotConfigModal: React.FC<TelegramBotConfigModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
}) => {
  const [botToken, setBotToken] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [replyEnabled, setReplyEnabled] = useState<boolean>(false);
  const [botUsername, setBotUsername] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const [testing, setTesting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const config = await api.getTelegramConfig();
      setIsConfigured(config.configured);
      setBotUsername(config.botUsername || '');
      setAutoSync(config.autoSync);
      setReplyEnabled(config.replyEnabled);
      setLastSyncTime(config.lastSyncTime || '');
      if (config.configured && !botToken) {
        setBotToken(config.maskedToken);
      }
    } catch (err) {
      console.error('Failed to load telegram config', err);
    }
  };

  const handleTestToken = async () => {
    if (!botToken.trim()) {
      setTestResult({ success: false, msg: 'Vui lòng dán mã Token Bot của bạn!' });
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.testTelegramBot(botToken.trim());
      setTestResult({
        success: true,
        msg: `✅ Kết nối thành công tới Bot: @${res.username} (${res.botName})`,
      });
      setBotUsername(res.username || '');
    } catch (err: any) {
      setTestResult({ success: false, msg: '❌ ' + err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setTestResult(null);
      // If masked token, only update flags
      const isMasked = botToken.includes('...');
      const res = await api.saveTelegramConfig({
        botToken: isMasked ? undefined : botToken.trim(),
        autoSync,
        replyEnabled,
      });
      setIsConfigured(true);
      if (res.botUsername) setBotUsername(res.botUsername);
      setTestResult({ success: true, msg: '✅ Đã lưu cấu hình Telegram thành công!' });
    } catch (err: any) {
      setTestResult({ success: false, msg: '❌ ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await api.syncTelegram();
      setSyncResult({
        success: true,
        msg: res.message,
      });
      setLastSyncTime(new Date().toISOString());
      if (onSyncSuccess) onSyncSuccess();
    } catch (err: any) {
      setSyncResult({ success: false, msg: '❌ ' + err.message });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Tự Động Đồng Bộ Telegram Bot (Auto-Sync)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Nhắn tin chi tiêu trên Telegram và tự động đồng bộ ngay khi F5/Refresh.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Quick 3-Step Guide */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
            <h4 className="font-bold text-sky-400 flex items-center space-x-1.5 text-xs">
              <HelpCircle className="w-4 h-4" />
              <span>Hướng dẫn tạo Bot Telegram riêng trong 1 phút (Miễn phí 100%):</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed text-[11.5px]">
              <li>
                Mở Telegram, tìm kiếm bot <strong>@BotFather</strong> (có tích xanh) và bấm <strong>Start</strong>.
              </li>
              <li>
                Gửi lệnh <code className="px-1.5 py-0.5 rounded bg-slate-900 text-sky-300 font-mono">/newbot</code>, đặt tên hiển thị và username kết thúc bằng <code className="px-1.5 py-0.5 rounded bg-slate-900 text-sky-300 font-mono">_bot</code> (ví dụ: <code className="text-slate-200 font-mono">my_expense_tracker_bot</code>).
              </li>
              <li>
                Copy chuỗi <strong>HTTP API Token</strong> (dạng <code className="text-emerald-400 font-mono">7123456789:AAH...</code>) và dán vào ô bên dưới.
              </li>
              <li>
                Bấm vào link bot vừa tạo, ấn <strong>Start</strong> và nhắn thử: <code className="text-amber-300 font-mono">Cơm trưa 45k</code> hoặc <code className="text-amber-300 font-mono">Grab 35k</code>.
              </li>
            </ol>
          </div>

          {/* Bot Token Input */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-200">
              Telegram Bot Token:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="Dán mã Token từ @BotFather vào đây (dạng 123456:ABC-DEF...)"
                className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleTestToken}
                disabled={testing || !botToken.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold border border-slate-700 transition disabled:opacity-50"
              >
                {testing ? 'Đang test...' : 'Kiểm tra'}
              </button>
            </div>
            {botUsername && (
              <p className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đang kết nối với: <strong>@{botUsername}</strong></span>
              </p>
            )}
          </div>

          {/* Test or Save Result Alert */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.msg}
            </div>
          )}

          {/* Feature Toggles */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <div>
                <p className="font-bold text-slate-200">Tự động đồng bộ khi mở web / F5 (Refresh)</p>
                <p className="text-[11px] text-slate-400">
                  Mỗi khi bạn tải lại trang, hệ thống sẽ tự động quét tin nhắn mới từ Bot và nạp vào biểu đồ.
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer border-t border-slate-700/60 pt-3">
              <input
                type="checkbox"
                checked={replyEnabled}
                onChange={(e) => setReplyEnabled(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0"
              />
              <div>
                <p className="font-bold text-slate-200">Bot phản hồi xác nhận trong Telegram</p>
                <p className="text-[11px] text-slate-400">
                  Sau khi bạn nhắn tin, Bot sẽ reply lại xác nhận số tiền và danh mục đã lưu.
                </p>
              </div>
            </label>
          </div>

          {/* Sync Trigger Box if configured */}
          {isConfigured && (
            <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-sky-300">Thao tác thủ công</span>
                <p className="text-[11px] text-slate-400">
                  {lastSyncTime
                    ? `Lần đồng bộ gần nhất: ${new Date(lastSyncTime).toLocaleTimeString('vi-VN')} ${new Date(lastSyncTime).toLocaleDateString('vi-VN')}`
                    : 'Chưa có lịch sử đồng bộ'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Đang kéo tin nhắn...' : 'Đồng bộ ngay'}</span>
              </button>
            </div>
          )}

          {/* Sync Result Alert */}
          {syncResult && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                syncResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {syncResult.msg}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
          </button>
        </div>
      </div>
    </div>
  );
};
