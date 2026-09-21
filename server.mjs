// server.mjs - Standalone Server para Antigravity Jev
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, saveConfig, executeJevDecision, streamLLMResponse } from './api-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // POST /api/jev/decision
  if (req.method === 'POST' && pathname === '/api/jev/decision') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const decision = await executeJevDecision(data.prompt, data.keys);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(decision));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/llm/chat
  if (req.method === 'POST' && pathname === '/api/llm/chat') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        await streamLLMResponse(data, res);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET / POST /api/config
  if (pathname === '/api/config') {
    const currentConfig = loadConfig();
    if (req.method === 'GET') {
      const safe = {
        ...currentConfig,
        jevApiKeyMasked: currentConfig.jevApiKey ? `${currentConfig.jevApiKey.slice(0, 4)}...${currentConfig.jevApiKey.slice(-4)}` : '',
        hasJevKey: !!currentConfig.jevApiKey,
        llmApiKeyMasked: currentConfig.llmApiKey ? `${currentConfig.llmApiKey.slice(0, 4)}...${currentConfig.llmApiKey.slice(-4)}` : '',
        hasLlmKey: !!currentConfig.llmApiKey
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(safe));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const newCfg = JSON.parse(body || '{}');
          const merged = { ...currentConfig, ...newCfg };
          saveConfig(merged);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, config: merged }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // Arquivos estáticos (serve da pasta dist se existir, ou do root)
  const distDir = path.join(__dirname, 'dist');
  const baseDir = fs.existsSync(distDir) ? distDir : __dirname;
  let targetPath = path.join(baseDir, pathname === '/' ? 'index.html' : pathname);

  const ext = path.extname(targetPath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  };

  fs.readFile(targetPath, (err, content) => {
    if (err) {
      // Fallback para index.html (SPA)
      const indexPath = path.join(baseDir, 'index.html');
      fs.readFile(indexPath, (idxErr, idxContent) => {
        if (idxErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(idxContent);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Antigravity Jev Server ativo em http://localhost:${PORT}`);
  console.log(`👉 Ou use "npm run dev" para Vite Dev Server`);
  console.log(`==================================================\n`);
});
