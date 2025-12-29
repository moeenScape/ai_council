import { query } from '../db/connection.js';
import { UsageLog } from '../types/index.js';

interface UsageLogRow {
  id: string;
  user_id: string;
  date: string;
  comparisons_used: number;
  updated_at: Date;
}

function mapRowToUsageLog(row: UsageLogRow): UsageLog {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    comparisonsUsed: row.comparisons_used,
    updatedAt: row.updated_at,
  };
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get or create usage log for a user on a specific date
 */
export async function getOrCreateUsageLog(
  userId: string,
  date: string = getTodayDate()
): Promise<UsageLog> {
  // Try to insert, on conflict do nothing and return existing
  const result = await query<UsageLogRow>(
    `INSERT INTO usage_logs (user_id, date, comparisons_used)
     VALUES ($1, $2, 0)
     ON CONFLICT (user_id, date) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [userId, date]
  );
  
  return mapRowToUsageLog(result.rows[0]);
}

/**
 * Get usage log for a user on a specific date
 */
export async function getUsageLog(
  userId: string,
  date: string = getTodayDate()
): Promise<UsageLog | null> {
  const result = await query<UsageLogRow>(
    'SELECT * FROM usage_logs WHERE user_id = $1 AND date = $2',
    [userId, date]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapRowToUsageLog(result.rows[0]);
}

/**
 * Increment usage count for a user
 */
export async function incrementUsage(
  userId: string,
  date: string = getTodayDate()
): Promise<UsageLog> {
  const result = await query<UsageLogRow>(
    `INSERT INTO usage_logs (user_id, date, comparisons_used)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, date) 
     DO UPDATE SET comparisons_used = usage_logs.comparisons_used + 1, updated_at = NOW()
     RETURNING *`,
    [userId, date]
  );
  
  return mapRowToUsageLog(result.rows[0]);
}

/**
 * Reset usage count for a user
 */
export async function resetUsage(
  userId: string,
  date: string = getTodayDate()
): Promise<UsageLog> {
  const result = await query<UsageLogRow>(
    `INSERT INTO usage_logs (user_id, date, comparisons_used)
     VALUES ($1, $2, 0)
     ON CONFLICT (user_id, date) 
     DO UPDATE SET comparisons_used = 0, updated_at = NOW()
     RETURNING *`,
    [userId, date]
  );
  
  return mapRowToUsageLog(result.rows[0]);
}

/**
 * Get total usage for a user in a date range
 */
export async function getTotalUsage(
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const result = await query<{ total: string }>(
    `SELECT COALESCE(SUM(comparisons_used), 0) as total
     FROM usage_logs 
     WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, startDate, endDate]
  );
  
  return parseInt(result.rows[0].total, 10);
}
