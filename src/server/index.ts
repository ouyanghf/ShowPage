import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRoutes } from './routes/projectRoutes.js';
import { folderRoutes } from './routes/folderRoutes.js';
import { staticRoutes } from './routes/staticRoutes.js';
import { backfillProjectFiles } from './services/projectService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (req.path.includes('..')) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }
  next();
});

app.use('/api/projects', projectRoutes);
app.use('/api/folders', folderRoutes);
app.use('/static/projects', staticRoutes);

backfillProjectFiles();

await mountFrontend(app);

app.listen(PORT, () => {
  console.log(`ShowPage running on http://localhost:${PORT}`);
});

async function mountFrontend(expressApp: express.Express): Promise<void> {
  const projectRoot = path.resolve(__dirname, '../..');
  const uiRoot = path.join(projectRoot, 'src', 'ui');
  const uiDist = path.join(projectRoot, 'dist', 'public');

  if (isProduction) {
    expressApp.use(express.static(uiDist));
    expressApp.get('*', (_req, res) => {
      res.sendFile(path.join(uiDist, 'index.html'));
    });
    return;
  }

  try {
    const { createServer } = await import('vite');
    const vite = await createServer({
      configFile: path.join(projectRoot, 'vite.config.ts'),
      root: uiRoot,
      appType: 'custom',
      server: {
        middlewareMode: true,
        hmr: { server: undefined },
      },
    });

    expressApp.use(vite.middlewares);
    expressApp.use('*', async (req, res, next) => {
      try {
        const indexPath = path.join(uiRoot, 'index.html');
        const template = await fs.readFile(indexPath, 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } catch (err) {
    console.warn('Vite middleware unavailable; serving dist/public instead.');
    console.warn(err instanceof Error ? err.message : err);
    expressApp.use(express.static(uiDist));
    expressApp.get('*', (_req, res) => {
      res.sendFile(path.join(uiDist, 'index.html'));
    });
  }
}
