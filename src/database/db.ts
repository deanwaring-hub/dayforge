// src/database/db.ts
// DayForge database initialisation
// Uses runAsync exclusively — execAsync is unreliable on Android production builds

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

  await database.runAsync("PRAGMA journal_mode = WAL");
  await database.runAsync("PRAGMA foreign_keys = ON");

  await createTables(database);
  await runMigrations(database);
}

async function createTables(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY DEFAULT 1,
      day_start TEXT NOT NULL DEFAULT '06:00',
      day_end TEXT NOT NULL DEFAULT '21:00',
      theme TEXT NOT NULL DEFAULT 'slate',
      default_buffer INTEGER NOT NULL DEFAULT 10,
      onboarded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#8892b0',
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      notification_minutes_before INTEGER NOT NULL DEFAULT 60,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await database.runAsync(`
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
    )
  `);

  await database.runAsync(`
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
    )
  `);

  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS recurrence_exceptions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      exception_date TEXT NOT NULL,
      reason TEXT NOT NULL CHECK(reason IN ('skipped', 'modified')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, exception_date)
    )
  `);

  await database.runAsync(`
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
    )
  `);

  await database.runAsync(`
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
    )
  `);

  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      run_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {

  // ── Migration 1 — seed General category only ─────────────────────────────
  const v1 = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?", [1]
  );
  if (!v1) {
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (id, label, color, notification_minutes_before, sort_order, default_priority, default_priority_tier, default_duration, default_buffer_after, default_notification_enabled) VALUES ('general', 'General', '#8892B0', 15, 1, 'flexible', 'normal', 30, 10, 1)`
    );
    await database.runAsync("INSERT INTO schema_migrations (version) VALUES (?)", [1]);
    console.log("Migration 1 applied.");
  }

  // ── Migration 2 — seed default user ──────────────────────────────────────
  const v2 = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?", [2]
  );
  if (!v2) {
    await database.runAsync(
      `INSERT OR IGNORE INTO users (id, day_start, day_end, theme, onboarded) VALUES (1, '06:00', '21:00', 'slate', 0)`
    );
    await database.runAsync("INSERT INTO schema_migrations (version) VALUES (?)", [2]);
    console.log("Migration 2 applied.");
  }

  // ── Migration 3 — add has_conflict column ────────────────────────────────
  const v3 = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?", [3]
  );
  if (!v3) {
    try {
      await database.runAsync(
        `ALTER TABLE task_instances ADD COLUMN has_conflict INTEGER NOT NULL DEFAULT 0`
      );
    } catch (e) {
      console.log("Migration 3: has_conflict already exists, skipping.");
    }
    await database.runAsync("INSERT INTO schema_migrations (version) VALUES (?)", [3]);
    console.log("Migration 3 applied.");
  }

  // ── Migration 4 — single welcome task ────────────────────────────────────
  const v4 = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?", [4]
  );
  if (!v4) {
    // Ensure general exists before inserting welcome task
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (id, label, color, notification_minutes_before, sort_order) VALUES ('general', 'General', '#8892B0', 15, 1)`
    );
    await database.runAsync(
      `INSERT OR IGNORE INTO tasks (id, name, category_id, priority, priority_tier, duration, buffer_after, preferred_time, travel_to, travel_from, notification_enabled, notification_minutes_before, is_active, created_at, updated_at)
       VALUES ('demo_welcome', 'Add your first task 👋', 'general', 'flexible', 'normal', 30, 10, '09:00', 0, 0, 0, 15, 1, datetime('now'), datetime('now'))`
    );
    await database.runAsync(
      `INSERT OR IGNORE INTO recurrence_rules (id, task_id, frequency, start_date) VALUES ('demo_welcome_r', 'demo_welcome', 'once', date('now'))`
    );
    await database.runAsync("INSERT INTO schema_migrations (version) VALUES (?)", [4]);
    console.log("Migration 4 applied.");
  }

  // ── Migration 5 — category task defaults ─────────────────────────────────
  const v5 = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?", [5]
  );
  if (!v5) {
    try { await database.runAsync(`ALTER TABLE categories ADD COLUMN default_priority TEXT NOT NULL DEFAULT 'flexible'`); } catch (e) {}
    try { await database.runAsync(`ALTER TABLE categories ADD COLUMN default_priority_tier TEXT NOT NULL DEFAULT 'normal'`); } catch (e) {}
    try { await database.runAsync(`ALTER TABLE categories ADD COLUMN default_duration INTEGER NOT NULL DEFAULT 30`); } catch (e) {}
    try { await database.runAsync(`ALTER TABLE categories ADD COLUMN default_buffer_after INTEGER NOT NULL DEFAULT 10`); } catch (e) {}
    try { await database.runAsync(`ALTER TABLE categories ADD COLUMN default_notification_enabled INTEGER NOT NULL DEFAULT 1`); } catch (e) {}
    await database.runAsync("INSERT INTO schema_migrations (version) VALUES (?)", [5]);
    console.log("Migration 5 applied.");
  }

  // ── Migration 6 — remove old demo tasks, remove old default categories ───
  const v6 = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?", [6]
  );
  if (!v6) {
    // Remove old 10 demo tasks
    await database.runAsync(`DELETE FROM task_instances WHERE task_id LIKE 'demo_t%'`);
    await database.runAsync(`DELETE FROM recurrence_rules WHERE task_id LIKE 'demo_t%'`);
    await database.runAsync(`DELETE FROM tasks WHERE id LIKE 'demo_t%'`);
    // Remove old default categories that users didn't create themselves
    // Only remove the ones seeded by old migration 1 — leave user-created ones
    const oldDefaults = ['appointments','races','training','study','chores','medical','projects','personal'];
    for (const id of oldDefaults) {
      // Only delete if no tasks reference it — respect user data
      const taskCount = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM tasks WHERE category_id = ?`, [id]
      );
      if ((taskCount?.count ?? 0) === 0) {
        await database.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
      }
    }
    // Ensure general exists
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (id, label, color, notification_minutes_before, sort_order) VALUES ('general', 'General', '#8892B0', 15, 1)`
    );
    await database.runAsync("INSERT INTO schema_migrations (version) VALUES (?)", [6]);
    console.log("Migration 6 applied.");
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
