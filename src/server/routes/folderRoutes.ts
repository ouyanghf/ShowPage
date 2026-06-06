import { Router } from 'express';
import { isValidFolderId } from '../lib/validation.js';
import { createFolder, listFolders, renameFolder, moveFolder, deleteFolder } from '../services/folderService.js';

export const folderRoutes = Router();

folderRoutes.get('/', (_req, res) => {
  try {
    const folders = listFolders();
    res.json({ folders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list folders';
    res.status(500).json({ error: message });
  }
});

folderRoutes.post('/', (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }
    const folder = createFolder({ name: name.trim(), parentId: parentId ?? null });
    res.json(folder);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create folder';
    res.status(500).json({ error: message });
  }
});

folderRoutes.put('/:folderId', (req, res) => {
  try {
    const { folderId } = req.params;
    if (!isValidFolderId(folderId)) {
      res.status(400).json({ error: 'Invalid folder ID' });
      return;
    }
    const { name, parentId } = req.body;
    if (name !== undefined) renameFolder(folderId, name.trim());
    if (parentId !== undefined) moveFolder(folderId, parentId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update folder';
    res.status(500).json({ error: message });
  }
});

folderRoutes.delete('/:folderId', (req, res) => {
  try {
    const { folderId } = req.params;
    if (!isValidFolderId(folderId)) {
      res.status(400).json({ error: 'Invalid folder ID' });
      return;
    }
    deleteFolder(folderId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete folder';
    res.status(500).json({ error: message });
  }
});
