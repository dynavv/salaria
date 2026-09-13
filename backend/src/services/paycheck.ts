/**
 * 💎 SALARIA BACKEND — PAYCHECK CYCLE CALCULATION SERVICE
 */

import { PaycheckCycle } from '../types';

export function getPaycheckCycle(referenceDate: Date = new Date(), payday: number = 22): PaycheckCycle {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  const d = referenceDate.getDate();

  let startYear = y;
  let startMonth = m;
  let endYear = y;
  let endMonth = m;

  if (d >= payday) {
    startYear = y;
    startMonth = m;
    endYear = m === 11 ? y + 1 : y;
    endMonth = m === 11 ? 0 : m + 1;
  } else {
    startYear = m === 0 ? y - 1 : y;
    startMonth = m === 0 ? 11 : m - 1;
    endYear = y;
    endMonth = m;
  }

  const startDateObj = new Date(startYear, startMonth, payday);
  const endDateObj = new Date(endYear, endMonth, payday - 1);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toIso = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  const startDate = toIso(startDateObj);
  const endDate = toIso(endDateObj);

  const diffMs = endDateObj.getTime() - startDateObj.getTime();
  const totalDays = Math.max(Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1, 28);

  const passedMs = referenceDate.getTime() - startDateObj.getTime();
  const currentDay = Math.min(Math.max(Math.round(passedMs / (1000 * 60 * 60 * 24)) + 1, 1), totalDays);
  const daysRemaining = Math.max(totalDays - currentDay, 1);

  const startDisplay = `${pad(startDateObj.getDate())}/${pad(startDateObj.getMonth() + 1)}`;
  const endDisplay = `${pad(endDateObj.getDate())}/${pad(endDateObj.getMonth() + 1)}`;

  return {
    startDate,
    endDate,
    shortDisplay: `${startDisplay} - ${endDisplay}`,
    daysRemaining,
    totalDays
  };
}

export interface ThreeBucketCalculationParams {
  baseBudget: number;
  savingsGoal?: number;
  housingBudget?: number;
  paidHousing?: number;
  totalExpense: number;
  daysRemaining: number;
}

export interface ThreeBucketResult {
  safeToSpendPerDay: number;
  remainingDiscretionary: number;
  reservedHousing: number;
  savingsGoal: number;
}

export function calculateThreeBucketSafeToSpend(params: ThreeBucketCalculationParams): ThreeBucketResult {
  const {
    baseBudget,
    savingsGoal = 0,
    housingBudget = 4000000,
    paidHousing = 0,
    totalExpense,
    daysRemaining
  } = params;

  // Đóng băng tiền nhà nếu chưa đóng đủ
  const reservedHousing = housingBudget > 0 ? Math.max(0, housingBudget - paidHousing) : 0;
  // Quỹ chi tiêu sinh hoạt còn lại
  const remainingDiscretionary = Math.max(0, baseBudget - savingsGoal - reservedHousing - totalExpense);
  const safeToSpendPerDay = Math.round(remainingDiscretionary / Math.max(1, daysRemaining));

  return {
    safeToSpendPerDay,
    remainingDiscretionary,
    reservedHousing,
    savingsGoal
  };
}

