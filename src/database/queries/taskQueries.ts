// src/database/queries/taskQueries.ts

import { getDatabase, generateId } from '../db';

export type TaskPriority = 'fixed' | 'flexible' | 'optional';
export type TaskPriorityTier = 'high' | 'normal' | 'low';

export type Task = {
  id: string;
  name: string;
  categoryId: string;
  priority: TaskPriority;
  priorityTier: TaskPriorityTier;
  duration: number;
  bufferAfter: number;
  time?: string;
  preferredTime?: string;
  earliestStart?: string;
  latestEnd?: string;
  travelTo: number;
  travelFrom: number;
  notificationEnabled: boolean;
  notificationMinutesBefore: number;
  notes?: string;
  pausedUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskData = Omit<Task, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;

type TaskRow = {
  id: string;
  name: string;
  category_id: string;
  priority: TaskPriority;
  priority_tier: TaskPriorityTier;
  duration: number;
  buffer_after: number;
  time: string | null;
  preferred_time: string | null;
  earliest_start: string | null;
  latest_end: string | null;
  travel_to: number;
  travel_from: number;
  notification_enabled: number;
  notification_minutes_before: number;
  notes: string | null;
  paused_until: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    priority: row.priority,
    priorityTier: row.priority_tier,
    duration: row.duration,
    bufferAfter: row.buffer_after,
    time: row.time ?? undefined,
    preferredTime: row.preferred_time ?? undefined,
    earliestStart: row.earliest_start ?? undefined,
    latestEnd: row.latest_end ?? undefined,
    travelTo: row.travel_to,
    travelFrom: row.travel_from,
    notificationEnabled: row.notification_enabled === 1,
    notificationMinutesBefore: row.notification_minutes_before,
    notes: row.notes ?? undefined,
    pausedUntil: row.paused_until ?? undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllTasks(): Promise<Task[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks WHERE is_active = 1 ORDER BY created_at ASC`
  );
  return rows.map(rowToTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<TaskRow>(
    'SELECT * FROM tasks WHERE id = ?',
    [id]
  );
  return row ? rowToTask(row) : null;
}

export async function getActiveTasksForDate(dateStr: string): Promise<Task[]> {
  const db = getDatabase();
  // Get all active tasks that are not paused on the given date
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT * FROM tasks
     WHERE is_active = 1
     AND (paused_until IS NULL OR paused_until < ?)
     ORDER BY
       CASE priority WHEN 'fixed' THEN 1 WHEN 'flexible' THEN 2 ELSE 3 END,
       CASE priority_tier WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END`,
    [dateStr]
  );
  return rows.map(rowToTask);
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO tasks (
      id, name, category_id, priority, priority_tier, duration, buffer_after,
      time, preferred_time, earliest_start, latest_end,
      travel_to, travel_from, notification_enabled, notification_minutes_before,
      notes, paused_until, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      data.name,
      data.categoryId,
      data.priority,
      data.priorityTier,
      data.duration,
      data.bufferAfter,
      data.time ?? null,
      data.preferredTime ?? null,
      data.earliestStart ?? null,
      data.latestEnd ?? null,
      data.travelTo,
      data.travelFrom,
      data.notificationEnabled ? 1 : 0,
      data.notificationMinutesBefore,
      data.notes ?? null,
      data.pausedUntil ?? null,
      now,
      now,
    ]
  );

  const created = await getTaskById(id);
  return created!;
}

export async function updateTask(
  id: string,
  patch: Partial<CreateTaskData>
): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.categoryId !== undefined) { fields.push('category_id = ?'); values.push(patch.categoryId); }
  if (patch.priority !== undefined) { fields.push('priority = ?'); values.push(patch.priority); }
  if (patch.priorityTier !== undefined) { fields.push('priority_tier = ?'); values.push(patch.priorityTier); }
  if (patch.duration !== undefined) { fields.push('duration = ?'); values.push(patch.duration); }
  if (patch.bufferAfter !== undefined) { fields.push('buffer_after = ?'); values.push(patch.bufferAfter); }
  if (patch.time !== undefined) { fields.push('time = ?'); values.push(patch.time ?? null); }
  if (patch.preferredTime !== undefined) { fields.push('preferred_time = ?'); values.push(patch.preferredTime ?? null); }
  if (patch.earliestStart !== undefined) { fields.push('earliest_start = ?'); values.push(patch.earliestStart ?? null); }
  if (patch.latestEnd !== undefined) { fields.push('latest_end = ?'); values.push(patch.latestEnd ?? null); }
  if (patch.travelTo !== undefined) { fields.push('travel_to = ?'); values.push(patch.travelTo); }
  if (patch.travelFrom !== undefined) { fields.push('travel_from = ?'); values.push(patch.travelFrom); }
  if (patch.notificationEnabled !== undefined) { fields.push('notification_enabled = ?'); values.push(patch.notificationEnabled ? 1 : 0); }
  if (patch.notificationMinutesBefore !== undefined) { fields.push('notification_minutes_before = ?'); values.push(patch.notificationMinutesBefore); }
  if (patch.notes !== undefined) { fields.push('notes = ?'); values.push(patch.notes ?? null); }
  if (patch.pausedUntil !== undefined) { fields.push('paused_until = ?'); values.push(patch.pausedUntil ?? null); }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function pauseTask(id: string, pausedUntil: string): Promise<void> {
  await updateTask(id, { pausedUntil });
}

export async function resumeTask(id: string): Promise<void> {
  await updateTask(id, { pausedUntil: undefined });
}

export async function deleteTask(id: string): Promise<void> {
  // Soft delete — keeps historical instance data intact
  const db = getDatabase();
  await db.runAsync(
    `UPDATE tasks SET is_active = 0, updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}
