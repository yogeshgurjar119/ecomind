/**
 * EcoMind — local server & NVIDIA NIM proxy
 * --------------------------------------------------------------
 * Responsibilities:
 *   1. Serve the static frontend from /public.
 *   2. Proxy chat-completion requests to the NVIDIA NIM API so the
 *      API key never reaches the browser (read from .env only).
 *
 * Author: Yogesh Gurjar
 */

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
const NVIDIA_BASE_URL =
  process.env.NVIDIA_BASE_URL ||
  'https://integrate.api.nvidia.com/v1/chat/completions';

const hasKey = () => NVIDIA_API_KEY.startsWith('nvapi-');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * GET /api/health
 * Lightweight check the frontend uses to know whether AI is available.
 */
app.get('/api/health', (_req, res) => {
  res.json({ aiEnabled: hasKey(), model: NVIDIA_MODEL });
});

/**
 * POST /api/chat
 * Body: { messages: [...], maxTokens?: number, temperature?: number }
 * Proxies straight through to NVIDIA NIM.
 */
app.post('/api/chat', async (req, res) => {
  if (!hasKey()) {
    return res.status(503).json({
      error: 'AI is not configured. Add NVIDIA_API_KEY to your .env file.',
    });
  }

  const { messages, maxTokens = 500, temperature = 0.7 } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const upstream = await fetch(NVIDIA_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({
        error: detail.message || `NVIDIA API error ${upstream.status}`,
        status: upstream.status,
      });
    }

    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content || '';
    res.json({ content });
  } catch (err) {
    console.error('[NVIDIA proxy] request failed:', err.message);
    res.status(502).json({ error: 'Connection to NVIDIA failed. Try again.' });
  }
});

// Serve the app shell at the root only.
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Security: EcoMind is a single-page app with in-page tab navigation and no
// server-side sub-routes. Any URL not matched above (a real static asset, an
// API endpoint, or the root) is invalid and returns 404 — we never silently
// serve the app shell for arbitrary paths.
app.use((_req, res) => {
  res.status(404).send('Not found');
});

// Default export = the Express app, used as the handler on serverless
// platforms (e.g. Vercel). Named export is for tests that mount it on a port.
export default app;
export { app };

// Start listening only when run directly (`node server.js`), not when imported
// by a test or invoked as a serverless handler.
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  app.listen(PORT, () => {
    console.log(`\n  🌿 EcoMind running at  http://localhost:${PORT}`);
    console.log(
      `  AI features: ${hasKey() ? 'enabled ✓' : 'disabled (set NVIDIA_API_KEY in .env)'}\n`
    );
  });
}
