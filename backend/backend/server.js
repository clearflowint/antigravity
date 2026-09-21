// backend/server.js
// Standalone Production HTTP Server for Docker & Cloud Run deployments
import http from 'http';
import { handleApiRequest } from './app/routes/apiRouter.js';
import { config } from './app/config.js';

const PORT = config.backendPort || 8000;

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api') || req.url === '/api') {
    await handleApiRequest(req, res);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found', message: 'ClearFlow Backend Service' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ClearFlow Backend] Running on http://0.0.0.0:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[ClearFlow Backend] SIGTERM received, shutting down...');
  server.close();
});
