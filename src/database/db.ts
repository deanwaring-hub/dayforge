// src/database/db.ts
// DayForge database initialisation
// Opens SQLite connection and creates all tables on first run
// Safe to run on every app start — CREATE TABLE IF NOT EXISTS means no data loss

import * as SQLite from "expo-sqlite";

// ─── DATABASE CONNECTION ──────────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("dayforge.db");
  }
  return db;
}

// ─── INITIALISE ───────────────────────────────────────────────────────────────
// Call once on app startup — creates tables and runs any pending migrations

export async function initialiseDatabase(): Promise<void> {
  const database = getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await createTables(database);
  await runMigrations(database);
}

// ─── CREATE TABLES ────────────────────────────────────────────────────────────

async function createTables(database: SQLite.SQLiteDatabase): Promise<void> {
  // ── users ──────────────────────────────────────────────────────────────────
  // Single user app — only one row ever exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY DEFAULT 1,
      day_start TEXT NOT NULL DEFAULT '06:00',
      day_end TEXT NOT NULL DEFAULT '21:00',
      theme TEXT NOT NULL DEFAULT 'slate',
      default_buffer INTEGER NOT NULL DEFAULT 10,
      onboarded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── categories ─────────────────────────────────────────────────────────────
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#8892b0',
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      notification_minutes_before INTEGER NOT NULL DEFAULT 60,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── tasks ──────────────────────────────────────────────────────────────────
  // Template record — never changes day to day
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('fixed', 'flexible', 'optional')),
      priority_tier TEXT NOT NULL DEFAULT 'normal' CHECK(priority_tier IN ('high', 'normal', 'low')),
      duration INTEGER NOT NULL DEFAULT 30,
      buffer_after INTEGER NOT NULL DEFAULT 10,
      time TEXT,
      preferred_time TEXT,
      earliest_start TEXT,
      latest_end TEXT,
      travel_to INTEGER DEFAULT 0,
      travel_from INTEGER DEFAULT 0,
      notification_enabled INTEGER NOT NULL DEFAULT 1,
      notification_minutes_before INTEGER NOT NULL DEFAULT 60,
      notes TEXT,
      paused_until TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  // ── recurrence_rules ───────────────────────────────────────────────────────
  // One row per task — defines how often it repeats
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS recurrence_rules (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL UNIQUE,
      frequency TEXT NOT NULL CHECK(frequency IN (
        'once', 'daily', 'weekdays', 'weekends', 'weekly', 'custom', 'monthly'
      )),
      custom_days TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      occurrences INTEGER,
      monthly_day INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // ── recurrence_exceptions ─────────────────────────────────────────────────
  // Skip or modify a single occurrence without touching the template
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS recurrence_exceptions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      exception_date TEXT NOT NULL,
      reason TEXT NOT NULL CHECK(reason IN ('skipped', 'modified')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, exception_date)
    );
  `);

  // ── task_instances ─────────────────────────────────────────────────────────
  // Each scheduled occurrence of a task on a specific date
  // Created by the scheduler when building a day
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS task_instances (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      date TEXT NOT NULL,
      scheduled_start TEXT NOT NULL,
      scheduled_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
        'pending', 'completed', 'snoozed', 'skipped', 'incomplete'
      )),
      snooze_count INTEGER NOT NULL DEFAULT 0,
      snoozed_until TEXT,
      completed_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, date)
    );
  `);

  // ── daily_scores ───────────────────────────────────────────────────────────
  // Pre-calculated score per day for fast dashboard loading
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_scores (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      fixed_completed INTEGER NOT NULL DEFAULT 0,
      fixed_total INTEGER NOT NULL DEFAULT 0,
      flexible_completed INTEGER NOT NULL DEFAULT 0,
      flexible_total INTEGER NOT NULL DEFAULT 0,
      optional_completed INTEGER NOT NULL DEFAULT 0,
      optional_total INTEGER NOT NULL DEFAULT 0,
      points_earned REAL NOT NULL DEFAULT 0,
      points_possible REAL NOT NULL DEFAULT 0,
      score REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── schema_migrations ──────────────────────────────────────────────────────
  // Tracks which migrations have been run
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      run_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ─── MIGRATIONS ───────────────────────────────────────────────────────────────
// Add new migrations here as the schema evolves
// Each migration runs exactly once — never modifies existing data

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrations: { version: number; sql: string }[] = [
    // Version 1 — seed default categories
    {
      version: 1,
      sql: `
        INSERT OR IGNORE INTO categories (id, label, color, notification_minutes_before, sort_order) VALUES
          ('appointments', 'Appointments', '#5B8AF0', 60, 1),
          ('races',        'Races',        '#F87171', 30, 2),
          ('training',     'Training',     '#43D9AD', 30, 3),
          ('study',        'Study',        '#A78BFA', 15, 4),
          ('chores',       'Household Chores', '#FBBF24', 15, 5),
          ('medical',      'Medical',      '#F97316', 60, 6),
          ('projects',     'Projects',     '#EC4899', 15, 7),
          ('personal',     'Personal',     '#8892B0', 15, 8);
      `,
    },
    // Version 2 — seed default user row
    {
      version: 2,
      sql: `
        INSERT OR IGNORE INTO users (id, day_start, day_end, theme, onboarded)
        VALUES (1, '06:00', '21:00', 'slate', 0);
      `,
    },
    {
      version: 3,
      sql: `ALTER TABLE task_instances ADD COLUMN has_conflict INTEGER NOT NULL DEFAULT 0;`,
    },
  ];

  for (const migration of migrations) {
    const already = await database.getFirstAsync<{ version: number }>(
      "SELECT version FROM schema_migrations WHERE version = ?",
      [migration.version],
    );

    if (!already) {
      await database.execAsync(migration.sql);
      await database.runAsync(
        "INSERT INTO schema_migrations (version) VALUES (?)",
        [migration.version],
      );
      console.log(`Migration ${migration.version} applied.`);
    }
  }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

// Generate a simple unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Get today's date as YYYY-MM-DD
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Format a date as YYYY-MM-DD
export function formatDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Convert HH:MM to total minutes since midnight
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Convert total minutes since midnight to HH:MM
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
