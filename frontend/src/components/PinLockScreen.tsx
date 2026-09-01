import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Lock, Delete, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

interface PinLockScreenProps {
  onUnlocked: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlocked }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleVerify = useCallback(async (pinToVerify: string) => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.verifyPin(pinToVerify);
      if (res.success) {
        sessionStorage.setItem('salaria_api_key', pinToVerify);
        localStorage.removeItem('salaria_api_key');
        onUnlocked();
      } else {
        triggerError(res.error || 'Mã PIN không đúng. Vui lòng thử lại.');
      }
    } catch (e: any) {
      triggerError(e.message || 'Mã PIN không đúng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [loading, onUnlocked]);

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setPin('');
    setTimeout(() => setIsShaking(false), 600);
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 6 && !loading) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 6) {
        handleVerify(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (!loading && pin.length > 0) {
      setPin(prev => prev.slice(0, -1));
      setError('');
    }
  };

  const handleClear = () => {
    if (!loading) {
      setPin('');
      setError('');
    }
  };

  // Listen to physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, loading]);

  const keypad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫']
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* App Logo & Icon */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                SALARIA
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Nhập mã PIN 6 số để mở khóa sổ tài chính
            </p>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className={`flex items-center justify-center space-x-4 py-3 ${isShaking ? 'animate-bounce text-rose-500' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-500/50'
                    : 'border-2 border-slate-700 bg-slate-900/50'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error ? (
          <div className="flex items-center space-x-1.5 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="h-6 flex items-center text-xs text-slate-500">
            {loading ? (
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <span className="w-3.5 h-3.5 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
                <span>Đang xác thực...</span>
              </span>
            ) : (
              <span>Có thể gõ trực tiếp từ bàn phím</span>
            )}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3.5 w-full max-w-[280px]">
          {keypad.flat().map((btn, idx) => {
            const isClear = btn === 'C';
            const isDelete = btn === '⌫';
            const isNumber = !isClear && !isDelete;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (isNumber) handleKeyPress(btn);
                  else if (isDelete) handleDelete();
                  else if (isClear) handleClear();
                }}
                disabled={loading}
                className={`h-16 rounded-2xl flex items-center justify-center font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50 ${
                  isNumber
                    ? 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 text-xl text-slate-100 shadow-md hover:border-slate-700'
                    : isDelete
                    ? 'bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/50 text-slate-400 text-lg hover:text-slate-200'
                    : 'bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/50 text-slate-400 text-sm hover:text-slate-200'
                }`}
              >
                {btn}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bảo mật đầu cuối bởi Cloudflare Edge Security</span>
        </div>
      </div>
    </div>
  );
};
