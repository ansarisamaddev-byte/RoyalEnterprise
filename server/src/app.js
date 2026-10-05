import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: env.clientUrl.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', routes);

  // PHASE 2 HOOK: if the admin module has been merged in, mount it automatically.
  const adminEntry = path.join(__dirname, 'routes', 'admin', 'index.js');
  if (fs.existsSync(adminEntry)) {
    const admin = await import(pathToFileURL(adminEntry).href);
    app.use('/api/admin', admin.default);
    console.log('Admin API enabled');
  }

  // Unknown /api routes return JSON 404 (never the web page).
  app.use('/api', notFound);

  // SINGLE-SERVICE DEPLOYMENT: serve the built React app (client/dist) from Express.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { maxAge: '1y', immutable: true, fallthrough: false }));
    app.use(express.static(clientDist, { maxAge: '1h' }));
    // React Router paths (/mobiles, /product/x, /admin ...) all load index.html
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
