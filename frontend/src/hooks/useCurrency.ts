import { useMemo, useCallback } from 'react';

export interface CurrencyFormatOptions {
  showSign?: boolean;      // Hiển thị dấu + / -
  showSymbol?: boolean;    // Hiển thị ký hiệu ₫ (mặc định true)
  compact?: boolean;       // Rút gọn: 1.5tr ₫ hoặc 200k ₫
}

/**
 * Hook tiện ích chuyên sâu cho việc định dạng, phân tích chuỗi và bảo mật số dư tiền tệ VND trong Salarini.
 */
export function useCurrency() {
  /**
   * Định dạng số thành chuỗi tiền tệ VND chuẩn
   */
  const format = useCallback((amount: number, options: CurrencyFormatOptions = {}): string => {
    const { showSign = false, showSymbol = true, compact = false } = options;
    const absAmount = Math.abs(amount);
    const sign = amount > 0 && showSign ? '+' : amount < 0 ? '-' : '';
    const symbol = showSymbol ? ' ₫' : '';

    if (compact) {
      if (absAmount >= 1_000_000_000) {
        const val = (absAmount / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
        return `${sign}${val} tỷ${symbol}`;
      }
      if (absAmount >= 1_000_000) {
        const val = (absAmount / 1_000_000).toFixed(1).replace(/\.0$/, '');
        return `${sign}${val} tr${symbol}`;
      }
      if (absAmount >= 1_000) {
        const val = (absAmount / 1_000).toFixed(0);
        return `${sign}${val}k${symbol}`;
      }
    }

    const formattedNum = absAmount.toLocaleString('vi-VN');
    return `${sign}${formattedNum}${symbol}`;
  }, []);

  /**
   * Phân tích chuỗi ngôn ngữ tự nhiên thành số tiền:
   * Ví dụ: "50k" -> 50000, "1.5tr" / "1,5tr" -> 1500000, "2m" -> 2000000
   */
  const parse = useCallback((text: string): number | null => {
    if (!text || typeof text !== 'string') return null;
    const cleaned = text.trim().toLowerCase().replace(/,/g, '.');

    // Mẫu: 1.5tr, 2trieu, 2 triệu
    const trMatch = cleaned.match(/^([0-9.]+)\s*(tr|triệu|trieu|m)$/);
    if (trMatch) {
      const num = parseFloat(trMatch[1]);
      return isNaN(num) ? null : Math.round(num * 1_000_000);
    }

    // Mẫu: 50k, 500k
    const kMatch = cleaned.match(/^([0-9.]+)\s*(k|nghìn|nghin)$/);
    if (kMatch) {
      const num = parseFloat(kMatch[1]);
      return isNaN(num) ? null : Math.round(num * 1_000);
    }

    // Mẫu số thuần túy
    const pureNumber = cleaned.replace(/[^0-9.-]/g, '');
    const num = parseFloat(pureNumber);
    return isNaN(num) ? null : num;
  }, []);

  /**
   * Ẩn số dư khi bật chế độ riêng tư
   */
  const mask = useCallback(
    (amount: number, isMasked: boolean, options: CurrencyFormatOptions = {}): string => {
      if (isMasked) {
        return options.showSymbol !== false ? '•••••• ₫' : '••••••';
      }
      return format(amount, options);
    },
    [format]
  );

  return useMemo(
    () => ({
      format,
      parse,
      mask,
    }),
    [format, parse, mask]
  );
}
