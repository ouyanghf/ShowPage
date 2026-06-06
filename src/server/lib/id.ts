import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const generate = customAlphabet(alphabet, 8);

export function generateProjectId(): string {
  return `p_${generate()}`;
}

export function generateFolderId(): string {
  return `f_${generate()}`;
}
