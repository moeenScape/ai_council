import { query } from '../db/connection.js';
import { RefreshToken } from '../types/index.js';
import crypto from 'crypto';

interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

function mapRowToRefreshToken(row: RefreshTokenRow): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/**
 * Hash a refresh token for storage
 * Using SHA-256 for faster hashing (bcrypt is too slow for token lookups)
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<RefreshToken> {
  const tokenHash = hashToken(token);
  
  const result = await query<RefreshTokenRow>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, tokenHash, expiresAt]
  );
  
  return mapRowToRefreshToken(result.rows[0]);
}

export async function findRefreshToken(token: string): Promise<RefreshToken | null> {
  const tokenHash = hashToken(token);
  
  const result = await query<RefreshTokenRow>(
    `SELECT * FROM refresh_tokens 
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapRowToRefreshToken(result.rows[0]);
}

export async function deleteRefreshToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  
  const result = await query(
    'DELETE FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash]
  );
  
  return (result.rowCount ?? 0) > 0;
}

export async function deleteAllUserRefreshTokens(userId: string): Promise<number> {
  const result = await query(
    'DELETE FROM refresh_tokens WHERE user_id = $1',
    [userId]
  );
  
  return result.rowCount ?? 0;
}

export async function deleteExpiredTokens(): Promise<number> {
  const result = await query(
    'DELETE FROM refresh_tokens WHERE expires_at <= NOW()'
  );
  
  return result.rowCount ?? 0;
}
