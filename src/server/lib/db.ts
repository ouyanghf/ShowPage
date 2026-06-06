import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDbPath(): string {
  return process.env.DB_PATH || path.resolve(__dirname, '../../../storage/showpage.db');
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      folder_id TEXT,
      title TEXT NOT NULL,
      original_html TEXT NOT NULL,
      parsed_html TEXT NOT NULL,
      modules TEXT NOT NULL DEFAULT '[]',
      layout TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    )
  `);

  const cols = database.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'folder_id')) {
    database.exec('ALTER TABLE projects ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL');
  }
  if (!cols.some(c => c.name === 'sort_order')) {
    database.exec('ALTER TABLE projects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    const rows = database.prepare('SELECT id FROM projects ORDER BY updated_at DESC').all() as { id: string }[];
    const update = database.prepare('UPDATE projects SET sort_order = ? WHERE id = ?');
    const migrate = database.transaction(() => {
      rows.forEach((row, index) => update.run(index + 1, row.id));
    });
    migrate();
  }
}
