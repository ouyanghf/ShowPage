import { Router } from 'express';
import { isValidProjectId } from '../lib/validation.js';
import { getOriginalHtml, getParsedHtml } from '../services/projectService.js';

export const staticRoutes = Router();

staticRoutes.get('/:projectId/parsed.html', (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isValidProjectId(projectId)) {
      res.status(400).send('Invalid project ID');
      return;
    }

    const html = getParsedHtml(projectId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.status(404).send('File not found');
  }
});

staticRoutes.get('/:projectId/original.html', (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isValidProjectId(projectId)) {
      res.status(400).send('Invalid project ID');
      return;
    }

    const html = getOriginalHtml(projectId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${projectId}-original.html"`);
    res.send(html);
  } catch {
    res.status(404).send('File not found');
  }
});
