/**
 * 💎 SALARIA BACKEND — DATABASE & LOGGING HELPERS
 */

export async function logToD1(
  db: any,
  level: string,
  tag: string,
  message: string,
  metadata: any = null
): Promise<void> {
  if (!db) return;
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();
    const metaStr = metadata
      ? typeof metadata === 'string'
        ? metadata
        : JSON.stringify(metadata)
      : null;

    await db
      .prepare(
        `INSERT INTO system_logs (id, timestamp, level, tag, source, message, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, timestamp, level, tag, 'worker_backend', message, metaStr)
      .run();
  } catch (err: any) {
    console.warn('[logToD1 Warning]', err.message);
  }
}
