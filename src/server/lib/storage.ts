import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageRoot = path.resolve(__dirname, '../../../storage');

export function writeProjectFiles(projectId: string, originalHtml: string, parsedHtml: string): void {
  const dir = getProjectDir(projectId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'original.html'), originalHtml, 'utf-8');
  fs.writeFileSync(path.join(dir, 'parsed.html'), parsedHtml, 'utf-8');
}

export function readProjectFile(projectId: string, filename: 'original.html' | 'parsed.html'): string | null {
  const filePath = path.join(getProjectDir(projectId), filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

export function projectFileExists(projectId: string, filename: 'original.html' | 'parsed.html'): boolean {
  return fs.existsSync(path.join(getProjectDir(projectId), filename));
}

export function removeProjectFiles(projectId: string): void {
  fs.rmSync(getProjectDir(projectId), { recursive: true, force: true });
}

function getProjectDir(projectId: string): string {
  return path.join(storageRoot, 'projects', projectId);
}
