/**
 * Integration tests for the Express server in server.js.
 *
 * The app is mounted on an ephemeral port — no real NVIDIA calls are made.
 * A fake key is set so the AI route passes the key check and we can verify
 * request *validation* (which happens before any upstream fetch).
 */
process.env.NVIDIA_API_KEY = 'nvapi-test-key-not-real';

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

const { app } = await import('../server.js');

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const postChat = (body) =>
  fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('GET /api/health reports AI status and model', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.aiEnabled, true);
  assert.equal(typeof body.model, 'string');
});

test('POST /api/chat rejects an empty messages array', async () => {
  const res = await postChat({ messages: [] });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /messages/i);
});

test('POST /api/chat rejects a missing messages field', async () => {
  const res = await postChat({});
  assert.equal(res.status, 400);
});

test('POST /api/chat rejects a non-array messages value', async () => {
  const res = await postChat({ messages: 'hello' });
  assert.equal(res.status, 400);
});

test('requests for missing static files return 404', async () => {
  const res = await fetch(`${base}/assets/does-not-exist.png`);
  assert.equal(res.status, 404);
});

test('unknown routes return 404 (no SPA catch-all)', async () => {
  const res = await fetch(`${base}/insights`);
  assert.equal(res.status, 404);
});

test('arbitrary deep paths return 404', async () => {
  const res = await fetch(`${base}/admin/secret`);
  assert.equal(res.status, 404);
});

test('the home page is served', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /EcoMind/);
});
