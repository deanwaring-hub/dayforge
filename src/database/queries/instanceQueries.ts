// src/database/queries/instanceQueries.ts

import { getDatabase, generateId } from '../db';

export type InstanceStatus = 'pending' | 'completed' | 'snoozed' | 'skipped' | 'incomplete';

export type TaskInstance = {
  id: string;
  taskId: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: InstanceStatus;
  snoozeCount: number;
  snoozedUntil?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
};

type InstanceRow = {
  id: string;
  task_id: string;
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: InstanceStatus;
  snooze_count: number;
  snoozed_until: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
};

function rowToInstance(row: InstanceRow): TaskInstance {
  return {
    id: row.id,
    taskId: row.task_id,
    date: row.date,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    status: row.status,
    snoozeCount: row.snooze_count,
    snoozedUntil: row.snoozed_until ?? undefined,
    completedAt: row.completed_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getInstancesForDate(date: string): Promise<TaskInstance[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<InstanceRow>(
    `SELECT * FROM task_instances WHERE date = ? ORDER BY scheduled_start ASC`,
    [date]
  );
  return rows.map(rowToInstance);
}

export async function getInstanceByTaskAndDate(
  taskId: string,
  date: string
): Promise<TaskInstance | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<InstanceRow>(
    'SELECT * FROM task_instances WHERE task_id = ? AND date = ?',
    [taskId, date]
  );
  return row ? rowToInstance(row) : null;
}

export async function createInstance(data: {
  taskId: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
}): Promise<TaskInstance> {
  const db = getDatabase();
  const id = generateId();

  await db.runAsync(
    `INSERT OR REPLACE INTO task_instances
      (id, task_id, date, scheduled_start, scheduled_end, status, snooze_count)
     VALUES (?, ?, ?, ?, ?, 'pending', 0)`,
    [id, data.taskId, data.date, data.scheduledStart, data.scheduledEnd]
  );

  const created = await getInstanceByTaskAndDate(data.taskId, data.date);
  return created!;
}

export async function updateInstanceStatus(
  id: string,
  status: InstanceStatus,
  extras?: { snoozedUntil?: string; notes?: string }
): Promise<void> {
  const db = getDatabase();
  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  await db.runAsync(
    `UPDATE task_instances
     SET status = ?, completed_at = ?,
         snoozed_until = ?, notes = COALESCE(?, notes)
     WHERE id = ?`,
    [
      status,
      completedAt,
      extras?.snoozedUntil ?? null,
      extras?.notes ?? null,
      id,
    ]
  );
}

export async function incrementSnoozeCount(id: string): Promise<number> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE task_instances SET snooze_count = snooze_count + 1 WHERE id = ?',
    [id]
  );
  const row = await db.getFirstAsync<{ snooze_count: number }>(
    'SELECT snooze_count FROM task_instances WHERE id = ?',
    [id]
  );
  return row?.snooze_count ?? 0;
}

export async function markDayIncomplete(date: string): Promise<void> {
  // Called at end of day — marks any pending instances as incomplete
  const db = getDatabase();
  await db.runAsync(
    `UPDATE task_instances SET status = 'incomplete'
     WHERE date = ? AND status = 'pending'`,
    [date]
  );
}

