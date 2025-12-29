import { query } from '../db/connection.js';
import { User, SubscriptionTier, Theme, UserProfile } from '../types/index.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  theme: Theme;
  created_at: Date;
  updated_at: Date;
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name || undefined,
    avatarUrl: row.avatar_url || undefined,
    subscriptionTier: row.subscription_tier,
    theme: row.theme || 'system',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUserToProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    subscriptionTier: user.subscriptionTier,
    theme: user.theme,
    createdAt: user.createdAt,
  };
}

export async function createUser(
  email: string,
  passwordHash: string,
  subscriptionTier: SubscriptionTier = 'free'
): Promise<User> {
  const result = await query<UserRow>(
    `INSERT INTO users (email, password_hash, subscription_tier)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, passwordHash, subscriptionTier]
  );
  
  return mapRowToUser(result.rows[0]);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapRowToUser(result.rows[0]);
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapRowToUser(result.rows[0]);
}

export async function updateUserSubscription(
  userId: string,
  tier: SubscriptionTier
): Promise<User | null> {
  const result = await query<UserRow>(
    `UPDATE users 
     SET subscription_tier = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, tier]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapRowToUser(result.rows[0]);
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM users WHERE id = $1',
    [id]
  );
  
  return (result.rowCount ?? 0) > 0;
}


export async function updateUserProfile(
  userId: string,
  updates: { displayName?: string; avatarUrl?: string }
): Promise<User | null> {
  const setClauses: string[] = [];
  const values: (string | null)[] = [];
  let paramIndex = 1;

  if (updates.displayName !== undefined) {
    setClauses.push(`display_name = $${++paramIndex}`);
    values.push(updates.displayName || null);
  }
  if (updates.avatarUrl !== undefined) {
    setClauses.push(`avatar_url = $${++paramIndex}`);
    values.push(updates.avatarUrl || null);
  }

  if (setClauses.length === 0) return findUserById(userId);

  const result = await query<UserRow>(
    `UPDATE users 
     SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, ...values]
  );

  return result.rows.length > 0 ? mapRowToUser(result.rows[0]) : null;
}

export async function updateUserTheme(userId: string, theme: Theme): Promise<User | null> {
  const result = await query<UserRow>(
    `UPDATE users 
     SET theme = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, theme]
  );

  return result.rows.length > 0 ? mapRowToUser(result.rows[0]) : null;
}
