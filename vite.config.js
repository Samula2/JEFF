// vite.config.js - Configuração do Vite com middleware nativo de APIs
import { defineConfig } from 'vite';
import { executeJevDecision, streamLLMResponse, loadConfig, saveConfig } from './api-handler.js';

function apiMiddleware() {
  return {
    name: 'antigravity-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost:5173');

        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // POST /api/jev/decision
        if (req.method === 'POST' && url.pathname === '/api/jev/decision') {
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
        if (req.method === 'POST' && url.pathname === '/api/llm/chat') {
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
        if (url.pathname === '/api/config') {
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

        next();
      });
    }
  };
}

export default defineConfig({
  root: './',
  publicDir: 'public',
  plugins: [apiMiddleware()],
  server: {
    port: 5173,
    open: true
  }
});
