// src/database/queries/recurrenceQueries.ts

import { getDatabase, generateId } from '../db';

export type RecurrenceFrequency =
  | 'once'
  | 'daily'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'custom'
  | 'monthly';

export type RecurrenceRule = {
  id: string;
  taskId: string;
  frequency: RecurrenceFrequency;
  customDays?: number[];   // 0=Sun, 1=Mon ... 6=Sat
  startDate: string;
  endDate?: string;
  occurrences?: number;
  monthlyDay?: number;
  createdAt: string;
};

type RecurrenceRow = {
  id: string;
  task_id: string;
  frequency: RecurrenceFrequency;
  custom_days: string | null;
  start_date: string;
  end_date: string | null;
  occurrences: number | null;
  monthly_day: number | null;
  created_at: string;
};

function rowToRule(row: RecurrenceRow): RecurrenceRule {
  return {
    id: row.id,
    taskId: row.task_id,
    frequency: row.frequency,
    customDays: row.custom_days ? JSON.parse(row.custom_days) : undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    occurrences: row.occurrences ?? undefined,
    monthlyDay: row.monthly_day ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getRecurrenceRule(taskId: string): Promise<RecurrenceRule | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<RecurrenceRow>(
    'SELECT * FROM recurrence_rules WHERE task_id = ?',
    [taskId]
  );
  return row ? rowToRule(row) : null;
}

export async function createRecurrenceRule(data: Omit<RecurrenceRule, 'id' | 'createdAt'>): Promise<RecurrenceRule> {
  const db = getDatabase();
  const id = generateId();

  await db.runAsync(
    `INSERT INTO recurrence_rules
      (id, task_id, frequency, custom_days, start_date, end_date, occurrences, monthly_day)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.taskId,
      data.frequency,
      data.customDays ? JSON.stringify(data.customDays) : null,
      data.startDate,
      data.endDate ?? null,
      data.occurrences ?? null,
      data.monthlyDay ?? null,
    ]
  );

  const created = await getRecurrenceRule(data.taskId);
  return created!;
}

export async function updateRecurrenceRule(
  taskId: string,
  patch: Partial<Omit<RecurrenceRule, 'id' | 'taskId' | 'createdAt'>>
): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.frequency !== undefined) { fields.push('frequency = ?'); values.push(patch.frequency); }
  if (patch.customDays !== undefined) { fields.push('custom_days = ?'); values.push(patch.customDays ? JSON.stringify(patch.customDays) : null); }
  if (patch.startDate !== undefined) { fields.push('start_date = ?'); values.push(patch.startDate); }
  if (patch.endDate !== undefined) { fields.push('end_date = ?'); values.push(patch.endDate ?? null); }
  if (patch.occurrences !== undefined) { fields.push('occurrences = ?'); values.push(patch.occurrences ?? null); }
  if (patch.monthlyDay !== undefined) { fields.push('monthly_day = ?'); values.push(patch.monthlyDay ?? null); }

  if (fields.length === 0) return;

  values.push(taskId);
  await db.runAsync(
    `UPDATE recurrence_rules SET ${fields.join(', ')} WHERE task_id = ?`,
    values
  );
}

// ─── EXCEPTION HANDLING ───────────────────────────────────────────────────────

export async function addException(
  taskId: string,
  date: string,
  reason: 'skipped' | 'modified'
): Promise<void> {
  const db = getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT OR IGNORE INTO recurrence_exceptions (id, task_id, exception_date, reason)
     VALUES (?, ?, ?, ?)`,
    [id, taskId, date, reason]
  );
}

export async function getExceptionsForTask(taskId: string): Promise<string[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ exception_date: string }>(
    'SELECT exception_date FROM recurrence_exceptions WHERE task_id = ?',
    [taskId]
  );
  return rows.map(r => r.exception_date);
}

// ─── OCCURRENCE CHECK ─────────────────────────────────────────────────────────
// Does a task with a given recurrence rule occur on a specific date?

export function taskOccursOn(rule: RecurrenceRule, dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat

  // Check start date
  if (dateStr < rule.startDate) return false;

  // Check end date
  if (rule.endDate && dateStr > rule.endDate) return false;

  switch (rule.frequency) {
    case 'once':
      return dateStr === rule.startDate;
    case 'daily':
      return true;
    case 'weekdays':
      return dow >= 1 && dow <= 5;
    case 'weekends':
      return dow === 0 || dow === 6;
    case 'weekly': {
      const startDow = new Date(rule.startDate + 'T12:00:00').getDay();
      return dow === startDow;
    }
    case 'custom':
      return (rule.customDays ?? []).includes(dow);
    case 'monthly':
      return date.getDate() === (rule.monthlyDay ?? new Date(rule.startDate + 'T12:00:00').getDate());
    default:
      return false;
  }
}
