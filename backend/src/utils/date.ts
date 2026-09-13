/**
 * 💎 SALARIA BACKEND — VIETNAM TIMEZONE (UTC+7) UTILITIES
 */

export function getVietnamTime(d = new Date()): Date {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
}

export function getVietnamDateString(d = new Date()): string {
  // YYYY-MM-DD
  return getVietnamTime(d).toISOString().split('T')[0];
}

export function getVietnamMonthString(d = new Date()): string {
  // YYYY-MM
  return getVietnamTime(d).toISOString().substring(0, 7);
}

export function getVietnamTimeString(d = new Date()): string {
  // YYYY-MM-DD HH:mm:ss
  return getVietnamTime(d).toISOString().replace('T', ' ').substring(0, 19);
}
