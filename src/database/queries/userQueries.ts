// src/database/queries/userQueries.ts
// User settings — single row, id always = 1

import { getDatabase, generateId } from '../db';

export type User = {
  id: number;
  dayStart: string;
  dayEnd: string;
  theme: string;
  defaultBuffer: number;
  onboarded: boolean;
  createdAt: string;
};

type UserRow = {
  id: number;
  day_start: string;
  day_end: string;
  theme: string;
  default_buffer: number;
  onboarded: number;
  created_at: string;
};

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    dayStart: row.day_start,
    dayEnd: row.day_end,
    theme: row.theme,
    defaultBuffer: row.default_buffer,
    onboarded: row.onboarded === 1,
    createdAt: row.created_at,
  };
}

export async function getUser(): Promise<User | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<UserRow>(
    'SELECT * FROM users WHERE id = 1'
  );
  return row ? rowToUser(row) : null;
}

export async function updateUser(patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.dayStart !== undefined) { fields.push('day_start = ?'); values.push(patch.dayStart); }
  if (patch.dayEnd !== undefined) { fields.push('day_end = ?'); values.push(patch.dayEnd); }
  if (patch.theme !== undefined) { fields.push('theme = ?'); values.push(patch.theme); }
  if (patch.defaultBuffer !== undefined) { fields.push('default_buffer = ?'); values.push(patch.defaultBuffer); }
  if (patch.onboarded !== undefined) { fields.push('onboarded = ?'); values.push(patch.onboarded ? 1 : 0); }

  if (fields.length === 0) return;

  values.push(1);
  await db.runAsync(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function completeOnboarding(settings: {
  dayStart: string;
  dayEnd: string;
  theme: string;
}): Promise<void> {
  await updateUser({ ...settings, onboarded: true });
}
