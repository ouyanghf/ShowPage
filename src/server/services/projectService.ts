import type { Project, ProjectSummary, ParsedModule } from '../lib/types.js';
import { generateProjectId } from '../lib/id.js';
import { isValidProjectId } from '../lib/validation.js';
import { parseHtmlModules } from '../lib/htmlParser.js';
import { getDb } from '../lib/db.js';
import { projectFileExists, readProjectFile, removeProjectFiles, writeProjectFiles } from '../lib/storage.js';

export function createProject(params: {
  originalFilename: string;
  html: string;
  folderId?: string | null;
}): Project {
  const projectId = generateProjectId();
  const { html: parsedHtml, modules, documentTitle } = parseHtmlModules(params.html);

  const title = documentTitle || modules[0]?.title || extractTitle(params.originalFilename);
  const now = new Date().toISOString();

  const project: Project = {
    id: projectId,
    folderId: params.folderId ?? null,
    title,
    sourceFile: 'original.html',
    parsedFile: 'parsed.html',
    createdAt: now,
    updatedAt: now,
    modules,
    layout: {
      showSidebar: true,
      sidebarWidth: 260,
      theme: 'light',
    },
  };

  writeProjectFiles(project.id, params.html, parsedHtml);

  const db = getDb();
  const sortOrder = getNextSortOrder(params.folderId ?? null);
  db.prepare(`
    INSERT INTO projects (id, folder_id, title, original_html, parsed_html, modules, layout, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    project.id,
    project.folderId,
    project.title,
    params.html,
    parsedHtml,
    JSON.stringify(project.modules),
    JSON.stringify(project.layout),
    sortOrder,
    project.createdAt,
    project.updatedAt,
  );

  return project;
}

export function getProject(projectId: string): Project {
  if (!isValidProjectId(projectId)) {
    throw new Error('Invalid project ID');
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as DbRow | undefined;
  if (!row) throw new Error('Project not found');

  return rowToProject(row);
}

export function getParsedHtml(projectId: string): string {
  if (!isValidProjectId(projectId)) {
    throw new Error('Invalid project ID');
  }

  const htmlFromFile = readProjectFile(projectId, 'parsed.html');
  if (htmlFromFile !== null) return htmlFromFile;

  const db = getDb();
  const row = db.prepare('SELECT parsed_html FROM projects WHERE id = ?').get(projectId) as { parsed_html: string } | undefined;
  if (!row) throw new Error('Project not found');

  return row.parsed_html;
}

export function getOriginalHtml(projectId: string): string {
  if (!isValidProjectId(projectId)) {
    throw new Error('Invalid project ID');
  }

  const htmlFromFile = readProjectFile(projectId, 'original.html');
  if (htmlFromFile !== null) return htmlFromFile;

  const db = getDb();
  const row = db.prepare('SELECT original_html FROM projects WHERE id = ?').get(projectId) as { original_html: string } | undefined;
  if (!row) throw new Error('Project not found');

  return row.original_html;
}

export function listProjects(folderId?: string | null): ProjectSummary[] {
  const db = getDb();
  let rows: DbRow[];

  if (folderId === undefined) {
    rows = db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, updated_at DESC').all() as DbRow[];
  } else {
    rows = db.prepare('SELECT * FROM projects WHERE folder_id IS ? ORDER BY sort_order ASC, updated_at DESC').all(folderId) as DbRow[];
  }

  return rows.map(rowToSummary);
}

export function updateProject(
  projectId: string,
  patch: Partial<Pick<Project, 'title' | 'modules' | 'layout' | 'folderId'>>
): Project {
  const project = getProject(projectId);

  if (patch.title !== undefined) project.title = patch.title;
  if (patch.modules !== undefined) project.modules = patch.modules;
  if (patch.layout !== undefined) project.layout = { ...project.layout, ...patch.layout };
  if (patch.folderId !== undefined) project.folderId = patch.folderId;
  project.updatedAt = new Date().toISOString();

  const db = getDb();
  const current = db.prepare('SELECT folder_id FROM projects WHERE id = ?').get(project.id) as { folder_id: string | null } | undefined;
  const folderChanged = patch.folderId !== undefined && current?.folder_id !== project.folderId;
  const sortOrder = folderChanged ? getNextSortOrder(project.folderId) : undefined;
  const sql = folderChanged
    ? 'UPDATE projects SET title = ?, modules = ?, layout = ?, folder_id = ?, sort_order = ?, updated_at = ? WHERE id = ?'
    : 'UPDATE projects SET title = ?, modules = ?, layout = ?, folder_id = ?, updated_at = ? WHERE id = ?';
  const params = folderChanged ? [
    project.title,
    JSON.stringify(project.modules),
    JSON.stringify(project.layout),
    project.folderId,
    sortOrder,
    project.updatedAt,
    project.id,
  ] : [
    project.title,
    JSON.stringify(project.modules),
    JSON.stringify(project.layout),
    project.folderId,
    project.updatedAt,
    project.id,
  ];
  db.prepare(sql).run(...params);

  return project;
}

export function moveProject(projectId: string, folderId: string | null): void {
  if (!isValidProjectId(projectId)) throw new Error('Invalid project ID');
  const db = getDb();
  const result = db.prepare('UPDATE projects SET folder_id = ?, sort_order = ?, updated_at = ? WHERE id = ?')
    .run(folderId, getNextSortOrder(folderId), new Date().toISOString(), projectId);
  if (result.changes === 0) throw new Error('Project not found');
}

export function deleteProject(projectId: string): void {
  if (!isValidProjectId(projectId)) {
    throw new Error('Invalid project ID');
  }

  const db = getDb();
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  if (result.changes === 0) throw new Error('Project not found');
  removeProjectFiles(projectId);
}

export function deleteProjects(projectIds: string[]): number {
  const safeIds = projectIds.filter(isValidProjectId);
  if (safeIds.length !== projectIds.length) {
    throw new Error('Invalid project ID');
  }
  if (safeIds.length === 0) return 0;

  const db = getDb();
  const removeRows = db.transaction((targets: string[]) => {
    const remove = db.prepare('DELETE FROM projects WHERE id = ?');
    let count = 0;
    for (const id of targets) {
      const result = remove.run(id);
      if (result.changes > 0) count += result.changes;
    }
    return count;
  });
  const deleted = removeRows(safeIds);
  for (const id of safeIds) removeProjectFiles(id);
  return deleted;
}

export function reorderProjects(projectIds: string[]): void {
  if (projectIds.length === 0) return;
  if (!projectIds.every(isValidProjectId)) {
    throw new Error('Invalid project ID');
  }

  const db = getDb();
  const rows = db.prepare(`SELECT id, sort_order FROM projects WHERE id IN (${projectIds.map(() => '?').join(',')}) ORDER BY sort_order ASC`)
    .all(...projectIds) as { id: string; sort_order: number }[];
  if (rows.length !== projectIds.length) {
    throw new Error('Project not found');
  }

  const update = db.prepare('UPDATE projects SET sort_order = ?, updated_at = ? WHERE id = ?');
  const sortSlots = rows.map(row => row.sort_order);
  const now = new Date().toISOString();
  const save = db.transaction(() => {
    projectIds.forEach((id, index) => update.run(sortSlots[index] ?? index + 1, now, id));
  });
  save();
}

export function backfillProjectFiles(): number {
  const db = getDb();
  const rows = db.prepare('SELECT id, original_html, parsed_html FROM projects').all() as {
    id: string;
    original_html: string;
    parsed_html: string;
  }[];

  let written = 0;
  for (const row of rows) {
    if (!isValidProjectId(row.id)) continue;
    if (!projectFileExists(row.id, 'original.html') || !projectFileExists(row.id, 'parsed.html')) {
      writeProjectFiles(row.id, row.original_html, row.parsed_html);
      written += 1;
    }
  }

  return written;
}

function extractTitle(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, '');
  return name || 'Untitled';
}

function rowToProject(row: DbRow): Project {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    sourceFile: 'original.html',
    parsedFile: 'parsed.html',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modules: JSON.parse(row.modules),
    layout: JSON.parse(row.layout),
  };
}

function rowToSummary(row: DbRow): ProjectSummary {
  const modules: ParsedModule[] = JSON.parse(row.modules);
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    moduleCount: modules.length,
    visibleModuleCount: modules.filter(m => m.visible).length,
    editUrl: `/project/${row.id}`,
    viewUrl: `/view/${row.id}`,
    originalUrl: `/static/projects/${row.id}/original.html`,
  };
}

interface DbRow {
  id: string;
  folder_id: string | null;
  title: string;
  original_html: string;
  parsed_html: string;
  modules: string;
  layout: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function getNextSortOrder(folderId: string | null): number {
  const db = getDb();
  const row = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM projects WHERE folder_id IS ?')
    .get(folderId) as { max_order: number };
  return row.max_order + 1;
}
