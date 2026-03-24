// src/database/queries/categoryQueries.ts

import { getDatabase, generateId } from '../db';

export type Category = {
  id: string;
  label: string;
  color: string;
  notificationsEnabled: boolean;
  notificationMinutesBefore: number;
  sortOrder: number;
  createdAt: string;
};

type CategoryRow = {
  id: string;
  label: string;
  color: string;
  notifications_enabled: number;
  notification_minutes_before: number;
  sort_order: number;
  created_at: string;
};

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    label: row.label,
    color: row.color,
    notificationsEnabled: row.notifications_enabled === 1,
    notificationMinutesBefore: row.notification_minutes_before,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function getCategories(): Promise<Category[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sort_order ASC'
  );
  return rows.map(rowToCategory);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<CategoryRow>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return row ? rowToCategory(row) : null;
}

export async function createCategory(data: {
  label: string;
  color: string;
  notificationsEnabled?: boolean;
  notificationMinutesBefore?: number;
}): Promise<Category> {
  const db = getDatabase();
  const id = generateId();

  const maxOrder = await db.getFirstAsync<{ max_order: number }>(
    'SELECT MAX(sort_order) as max_order FROM categories'
  );
  const sortOrder = (maxOrder?.max_order ?? 0) + 1;

  await db.runAsync(
    `INSERT INTO categories
      (id, label, color, notifications_enabled, notification_minutes_before, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.label,
      data.color,
      data.notificationsEnabled !== false ? 1 : 0,
      data.notificationMinutesBefore ?? 15,
      sortOrder,
    ]
  );

  const created = await getCategoryById(id);
  return created!;
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<Category, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.label !== undefined) { fields.push('label = ?'); values.push(patch.label); }
  if (patch.color !== undefined) { fields.push('color = ?'); values.push(patch.color); }
  if (patch.notificationsEnabled !== undefined) { fields.push('notifications_enabled = ?'); values.push(patch.notificationsEnabled ? 1 : 0); }
  if (patch.notificationMinutesBefore !== undefined) { fields.push('notification_minutes_before = ?'); values.push(patch.notificationMinutesBefore); }
  if (patch.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(patch.sortOrder); }

  if (fields.length === 0) return;

  values.push(id);
  await db.runAsync(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export const DEFAULT_CATEGORIES = [
  { id: 'appointments', label: 'Appointments', color: '#5B8AF0' },
  { id: 'races', label: 'Races', color: '#F87171' },
  { id: 'training', label: 'Training', color: '#43D9AD' },
  { id: 'study', label: 'Study', color: '#A78BFA' },
  { id: 'chores', label: 'Household Chores', color: '#FBBF24' },
  { id: 'medical', label: 'Medical', color: '#F97316' },
  { id: 'projects', label: 'Projects', color: '#EC4899' },
  { id: 'personal', label: 'Personal', color: '#8892B0' },
];