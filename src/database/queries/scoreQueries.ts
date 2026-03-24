// =============================================================================
// src/database/queries/scoreQueries.ts
// =============================================================================
import { getDatabase, generateId } from '../db';
import { InstanceStatus } from './instanceQueries';

export type DailyScore = {
  id: string;
  date: string;
  fixedCompleted: number;
  fixedTotal: number;
  flexibleCompleted: number;
  flexibleTotal: number;
  optionalCompleted: number;
  optionalTotal: number;
  pointsEarned: number;
  pointsPossible: number;
  score: number;
  createdAt: string;
  updatedAt: string;
};

type ScoreRow = {
  id: string;
  date: string;
  fixed_completed: number;
  fixed_total: number;
  flexible_completed: number;
  flexible_total: number;
  optional_completed: number;
  optional_total: number;
  points_earned: number;
  points_possible: number;
  score: number;
  created_at: string;
  updated_at: string;
};

function rowToScore(row: ScoreRow): DailyScore {
  return {
    id: row.id,
    date: row.date,
    fixedCompleted: row.fixed_completed,
    fixedTotal: row.fixed_total,
    flexibleCompleted: row.flexible_completed,
    flexibleTotal: row.flexible_total,
    optionalCompleted: row.optional_completed,
    optionalTotal: row.optional_total,
    pointsEarned: row.points_earned,
    pointsPossible: row.points_possible,
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Point values per priority type
export const POINTS = {
  fixed: 3,
  flexible: 2,
  optional: 1,
  snoozed: 1, // Always 1 point regardless of type
} as const;

export async function calculateAndSaveScore(date: string): Promise<DailyScore> {
  const db = getDatabase();

  // Get all instances for the date joined with task priority
  const rows = await db.getAllAsync<{
    priority: string;
    status: InstanceStatus;
  }>(
    `SELECT t.priority, ti.status
     FROM task_instances ti
     JOIN tasks t ON ti.task_id = t.id
     WHERE ti.date = ?`,
    [date]
  );

  let fixedCompleted = 0, fixedTotal = 0;
  let flexibleCompleted = 0, flexibleTotal = 0;
  let optionalCompleted = 0, optionalTotal = 0;
  let pointsEarned = 0;

  for (const row of rows) {
    const p = row.priority as 'fixed' | 'flexible' | 'optional';
    const s = row.status;

    // Count totals
    if (p === 'fixed') fixedTotal++;
    else if (p === 'flexible') flexibleTotal++;
    else optionalTotal++;

    // Count completions
    if (s === 'completed') {
      if (p === 'fixed') fixedCompleted++;
      else if (p === 'flexible') flexibleCompleted++;
      else optionalCompleted++;
      pointsEarned += POINTS[p];
    } else if (s === 'snoozed') {
      // Snoozed always earns 1 point
      pointsEarned += POINTS.snoozed;
      // Count as partial completion for display
      if (p === 'fixed') fixedCompleted += 0;
      else if (p === 'flexible') flexibleCompleted += 0;
      else optionalCompleted += 0;
    }
  }

  const pointsPossible =
    fixedTotal * POINTS.fixed +
    flexibleTotal * POINTS.flexible +
    optionalTotal * POINTS.optional;

  const score = pointsPossible > 0
    ? Math.round((pointsEarned / pointsPossible) * 100)
    : 0;

  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO daily_scores
      (id, date, fixed_completed, fixed_total,
       flexible_completed, flexible_total,
       optional_completed, optional_total,
       points_earned, points_possible, score,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       fixed_completed = excluded.fixed_completed,
       fixed_total = excluded.fixed_total,
       flexible_completed = excluded.flexible_completed,
       flexible_total = excluded.flexible_total,
       optional_completed = excluded.optional_completed,
       optional_total = excluded.optional_total,
       points_earned = excluded.points_earned,
       points_possible = excluded.points_possible,
       score = excluded.score,
       updated_at = excluded.updated_at`,
    [
      id, date,
      fixedCompleted, fixedTotal,
      flexibleCompleted, flexibleTotal,
      optionalCompleted, optionalTotal,
      pointsEarned, pointsPossible, score,
      now, now,
    ]
  );

  const saved = await getScoreForDate(date);
  return saved!;
}

export async function getScoreForDate(date: string): Promise<DailyScore | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ScoreRow>(
    'SELECT * FROM daily_scores WHERE date = ?',
    [date]
  );
  return row ? rowToScore(row) : null;
}

export async function getScoresForRange(
  startDate: string,
  endDate: string
): Promise<DailyScore[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ScoreRow>(
    `SELECT * FROM daily_scores
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC`,
    [startDate, endDate]
  );
  return rows.map(rowToScore);
}

export async function getWeeklyAverage(weekStartDate: string): Promise<number> {
  const db = getDatabase();

  // Calculate end of week
  const start = new Date(weekStartDate + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endDate = end.toISOString().slice(0, 10);

  const row = await db.getFirstAsync<{ avg_score: number }>(
    `SELECT AVG(score) as avg_score FROM daily_scores
     WHERE date >= ? AND date <= ?`,
    [weekStartDate, endDate]
  );

  return Math.round(row?.avg_score ?? 0);
}
