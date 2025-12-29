import { query } from '../db/connection.js';
import { User, SubscriptionTier } from '../types/index.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  subscription_tier: SubscriptionTier;
  created_at: Date;
  updated_at: Date;
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    subscriptionTier: row.subscription_tier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
