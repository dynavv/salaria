import { useState, useEffect, useCallback } from 'react';

/**
 * Hook lưu trữ state vào localStorage của trình duyệt, hỗ trợ type-safe
 * và fallback an toàn khi gặp lỗi parse JSON.
 *
 * @param key Khóa lưu trữ trong localStorage
 * @param initialValue Giá trị ban đầu nếu chưa có trong storage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Lấy giá trị ban đầu từ localStorage
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Lỗi khi đọc localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Cập nhật giá trị vào state và localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined') {
        console.warn(`Không thể ghi vào localStorage ngoài môi trường browser`);
        return;
      }

      try {
        setStoredValue((current) => {
          const valueToStore = value instanceof Function ? value(current) : value;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        console.warn(`Lỗi khi ghi localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  // Đồng bộ giá trị nếu key thay đổi trong tab khác
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch {
          // Bỏ qua nếu giá trị không hợp lệ
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
