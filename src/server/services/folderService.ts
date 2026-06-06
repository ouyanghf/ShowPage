import type { Folder } from '../lib/types.js';
import { getDb } from '../lib/db.js';
import { generateFolderId } from '../lib/id.js';

export function createFolder(params: { name: string; parentId?: string | null }): Folder {
  const id = generateFolderId();
  const now = new Date().toISOString();

  const db = getDb();
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM folders WHERE parent_id IS ?'
  ).get(params.parentId ?? null) as { max_order: number };

  db.prepare(`
    INSERT INTO folders (id, name, parent_id, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, params.name, params.parentId ?? null, maxOrder.max_order + 1, now);

  return { id, name: params.name, parentId: params.parentId ?? null, sortOrder: maxOrder.max_order + 1, createdAt: now };
}

export function listFolders(): Folder[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM folders ORDER BY sort_order ASC, created_at ASC').all() as DbFolderRow[];
  return rows.map(rowToFolder);
}

export function renameFolder(id: string, name: string): void {
  const db = getDb();
  const result = db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id);
  if (result.changes === 0) throw new Error('Folder not found');
}

export function moveFolder(id: string, parentId: string | null): void {
  const db = getDb();
  if (parentId === id) throw new Error('Cannot move folder into itself');
  const result = db.prepare('UPDATE folders SET parent_id = ? WHERE id = ?').run(parentId, id);
  if (result.changes === 0) throw new Error('Folder not found');
}

export function deleteFolder(id: string): void {
  const db = getDb();
  db.prepare('UPDATE projects SET folder_id = NULL WHERE folder_id = ?').run(id);
  db.prepare('UPDATE folders SET parent_id = NULL WHERE parent_id = ?').run(id);
  const result = db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  if (result.changes === 0) throw new Error('Folder not found');
}

function rowToFolder(row: DbFolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

interface DbFolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}
