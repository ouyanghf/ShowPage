import { Router } from 'express';
import multer from 'multer';
import { isAllowedExtension, isValidProjectId, MAX_FILE_SIZE } from '../lib/validation.js';
import {
  createProject,
  deleteProject,
  deleteProjects,
  getProject,
  listProjects,
  reorderProjects,
  updateProject,
} from '../services/projectService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (isAllowedExtension(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only .html and .htm files are allowed'));
    }
  },
});

export const projectRoutes = Router();

projectRoutes.get('/', (req, res) => {
  try {
    const folderId = req.query.folderId as string | undefined;
    const projects = folderId !== undefined
      ? listProjects(folderId || null)
      : listProjects();
    res.json({ projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list projects';
    res.status(500).json({ error: message });
  }
});

projectRoutes.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  });
}, (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const html = req.file.buffer.toString('utf-8');
    const folderId = req.body?.folderId || null;
    const project = createProject({
      originalFilename: req.file.originalname,
      html,
      folderId,
    });

    res.json({
      projectId: project.id,
      title: project.title,
      modules: project.modules,
      editUrl: `/project/${project.id}`,
      viewUrl: `/view/${project.id}`,
      originalUrl: `/static/projects/${project.id}/original.html`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    res.status(500).json({ error: message });
  }
});

projectRoutes.post('/batch-delete', (req, res) => {
  try {
    const { projectIds } = req.body;
    if (!Array.isArray(projectIds)) {
      res.status(400).json({ error: 'projectIds must be an array' });
      return;
    }

    const deleted = deleteProjects(projectIds);
    res.json({ success: true, deleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Batch delete failed';
    res.status(500).json({ error: message });
  }
});

projectRoutes.put('/reorder', (req, res) => {
  try {
    const { projectIds } = req.body;
    if (!Array.isArray(projectIds)) {
      res.status(400).json({ error: 'projectIds must be an array' });
      return;
    }

    reorderProjects(projectIds);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reorder failed';
    res.status(500).json({ error: message });
  }
});

projectRoutes.get('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isValidProjectId(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }

    const project = getProject(projectId);
    res.json({
      id: project.id,
      title: project.title,
      modules: project.modules,
      layout: project.layout,
      htmlUrl: `/static/projects/${project.id}/parsed.html`,
      originalUrl: `/static/projects/${project.id}/original.html`,
      viewUrl: `/view/${project.id}`,
    });
  } catch (err) {
    res.status(404).json({ error: 'Project not found' });
  }
});

projectRoutes.put('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isValidProjectId(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }

    const { title, modules, layout, folderId } = req.body;
    updateProject(projectId, { title, modules, layout, folderId });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(500).json({ error: message });
  }
});

projectRoutes.delete('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isValidProjectId(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }

    deleteProject(projectId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    res.status(500).json({ error: message });
  }
});
