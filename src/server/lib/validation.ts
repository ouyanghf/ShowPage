import path from 'node:path';

export const ALLOWED_EXTENSIONS = ['.html', '.htm'];
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

const PROJECT_ID_PATTERN = /^p_[a-z0-9]{8}$/;
const FOLDER_ID_PATTERN = /^[pf]_[a-z0-9]{8}$/;

export function isValidProjectId(id: string): boolean {
  return PROJECT_ID_PATTERN.test(id);
}

export function isValidFolderId(id: string): boolean {
  return FOLDER_ID_PATTERN.test(id);
}

export function isAllowedExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

export function isPathSafe(input: string): boolean {
  if (input.includes('..')) return false;
  if (input.includes('\\')) return false;
  if (input.includes('\0')) return false;
  return true;
}
