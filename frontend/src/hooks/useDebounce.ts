import { useState, useEffect } from 'react';

/**
 * Hook trì hoãn cập nhật giá trị (Debounce) nhằm giảm thiểu việc tính toán lại
 * hoặc gọi API không cần thiết khi người dùng nhập dữ liệu liên tục.
 *
 * @param value Giá trị cần debounce
 * @param delay Thời gian chờ (mili giây), mặc định 300ms
 * @returns Giá trị đã được debounce
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
