export interface PaycheckCycleInfo {
  startDate: string;         // e.g. "2026-08-22"
  endDate: string;           // e.g. "2026-09-21"
  displayTitle: string;      // e.g. "Kỳ lương (22/08 - 21/09)"
  shortDisplay: string;      // e.g. "22/08 - 21/09"
  currentDayInCycle: number; // e.g. 13
  totalDaysInCycle: number;  // e.g. 31
  daysRemaining: number;     // e.g. 18
  cycleProgressPercent: number;
}

export function getPaycheckCycle(referenceDate: Date = new Date(), payday: number = 22): PaycheckCycleInfo {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth(); // 0-based
  const d = referenceDate.getDate();

  let startYear = y;
  let startMonth = m;
  let endYear = y;
  let endMonth = m;

  if (d >= payday) {
    // Current cycle starts this month on payday, ends next month on (payday - 1)
    startYear = y;
    startMonth = m;
    endYear = m === 11 ? y + 1 : y;
    endMonth = m === 11 ? 0 : m + 1;
  } else {
    // Current cycle starts previous month on payday, ends this month on (payday - 1)
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
    displayTitle: `Kỳ lương (${startDisplay} - ${endDisplay})`,
    shortDisplay: `${startDisplay} - ${endDisplay}`,
    currentDayInCycle: currentDay,
    totalDaysInCycle: totalDays,
    daysRemaining,
    cycleProgressPercent: Math.min(Math.round((currentDay / totalDays) * 100), 100)
  };
}
