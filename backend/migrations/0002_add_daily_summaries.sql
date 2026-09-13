-- ============================================================
-- MIGRATION: 0002_add_daily_summaries.sql
-- Thêm bảng lưu trữ bản tin tổng kết chi tiêu cuối ngày (Daily Spending Digest)
-- Độc lập hoàn toàn với bảng transactions để bảo toàn tính toàn vẹn số dư
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_summaries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE, -- Định dạng 'YYYY-MM-DD'
  today_expense REAL NOT NULL DEFAULT 0,
  safe_to_spend REAL NOT NULL DEFAULT 0,
  days_remaining INTEGER NOT NULL DEFAULT 0,
  status_note TEXT,
  created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date DESC);
