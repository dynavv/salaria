import { useState, useMemo, useCallback } from 'react';
import { getPaycheckCycle, PaycheckCycleInfo } from '../utils/paycheckHelper';

export interface UsePaycheckCycleReturn {
  cycle: PaycheckCycleInfo;
  offset: number;
  isCurrentCycle: boolean;
  goToPreviousCycle: () => void;
  goToNextCycle: () => void;
  resetToCurrentCycle: () => void;
  setOffset: (offset: number) => void;
}

/**
 * Hook quản lý chu kỳ lương (mặc định ngày 22 hàng tháng).
 * Cho phép xem kỳ lương hiện tại hoặc lùi/tiến về các kỳ lương trước/sau.
 */
export function usePaycheckCycle(payday: number = 22): UsePaycheckCycleReturn {
  const [offset, setOffset] = useState<number>(0);

  // Tính ngày tham chiếu dựa theo offset (mỗi offset tương đương dịch chuyển 1 tháng)
  const referenceDate = useMemo(() => {
    const d = new Date();
    if (offset !== 0) {
      d.setMonth(d.getMonth() + offset);
    }
    return d;
  }, [offset]);

  const cycle = useMemo(() => {
    return getPaycheckCycle(referenceDate, payday);
  }, [referenceDate, payday]);

  const isCurrentCycle = offset === 0;

  const goToPreviousCycle = useCallback(() => {
    setOffset((prev) => prev - 1);
  }, []);

  const goToNextCycle = useCallback(() => {
    setOffset((prev) => prev + 1);
  }, []);

  const resetToCurrentCycle = useCallback(() => {
    setOffset(0);
  }, []);

  return {
    cycle,
    offset,
    isCurrentCycle,
    goToPreviousCycle,
    goToNextCycle,
    resetToCurrentCycle,
    setOffset,
  };
}
