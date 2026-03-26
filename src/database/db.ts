// src/database/db.ts
// DayForge database initialisation
// PRAGMA statements run individually for Android APK compatibility

import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("dayforge.db");
  }
  return db;
}

export async function initialiseDatabase(): Promise<void> {
  const database = getDatabase();

  // Run PRAGMAs individually — execAsync with multiple statements
  // can fail silently on Android production builds
  await database.runAsync("PRAGMA journal_mode = WAL");
  await database.runAsync("PRAGMA foreign_keys = ON");

  await createTables(database);
  await runMigrations(database);
}

async function createTables(database: SQLite.SQLiteDatabase): Promise<void> {
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
      has_conflict INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, date)
    );
  `);

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

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      run_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Standard migrations — single statement each, safe to use execAsync
  const migrations: { version: number; sql: string }[] = [
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

  // Migration 4 — demo tasks
  // Individual runAsync calls required for foreign key constraint reliability
  const v4 = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?", [4]
  );

  if (!v4) {
    const demoTasks = [
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t1', 'Team Meeting', 'appointments', 'fixed', 'high', 60, 10, '09:00', null, 0, 0, 1, 60, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t2', 'Physio Appointment', 'medical', 'fixed', 'high', 45, 10, '14:00', null, 20, 20, 1, 60, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t3', 'School Run', 'chores', 'fixed', 'normal', 30, 10, '15:30', null, 0, 0, 1, 15, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t4', 'Morning Run', 'training', 'flexible', 'high', 60, 10, null, '07:00', 0, 0, 1, 30, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t5', 'Project Review', 'projects', 'flexible', 'normal', 45, 10, null, '10:30', 0, 0, 1, 15, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t6', 'Study Session', 'study', 'flexible', 'normal', 90, 10, null, '11:00', 0, 0, 1, 15, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t7', 'Evening Read', 'personal', 'optional', 'normal', 30, 10, null, '20:00', 0, 0, 0, 15, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t8', 'Inbox Zero', 'projects', 'optional', 'low', 20, 10, null, '08:00', 0, 0, 0, 15, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t9', 'Meal Prep', 'chores', 'optional', 'low', 45, 10, null, '17:00', 0, 0, 0, 15, 1, datetime('now'), datetime('now'))`,
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, time, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at) VALUES ('demo_t10', 'Catch Up With Friends', 'personal', 'optional', 'normal', 30, 10, null, '19:00', 0, 0, 0, 15, 1, datetime('now'), datetime('now'))`,
    ];

    const demoRules = [
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r1', 'demo_t1', 'weekly', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r2', 'demo_t2', 'once', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r3', 'demo_t3', 'weekdays', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r4', 'demo_t4', 'daily', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r5', 'demo_t5', 'weekly', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r6', 'demo_t6', 'weekdays', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r7', 'demo_t7', 'daily', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r8', 'demo_t8', 'daily', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r9', 'demo_t9', 'weekly', date('now'))`,
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_r10', 'demo_t10', 'weekly', date('now'))`,
    ];

    for (const sql of demoTasks) {
      await database.runAsync(sql);
    }
    for (const sql of demoRules) {
      await database.runAsync(sql);
    }

    await database.runAsync(
      "INSERT INTO schema_migrations (version) VALUES (?)", [4]
    );
    console.log("Migration 4 applied.");
  }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
