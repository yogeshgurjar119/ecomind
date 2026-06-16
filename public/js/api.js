/**
 * Frontend client for the local NVIDIA proxy (/api/*).
 * The real API key lives on the server (.env) — never in the browser.
 */

let _aiEnabled = false;

/** Probe the server once to learn whether AI is configured. */
export async function refreshAIStatus() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    _aiEnabled = !!data.aiEnabled;
  } catch {
    _aiEnabled = false;
  }
  return _aiEnabled;
}

export function isAIEnabled() {
  return _aiEnabled;
}

/**
 * Send chat messages to the proxy.
 * @param {Array<{role,content}>} messages
 * @returns {Promise<string>} assistant text
 */
export async function callAI(messages, maxTokens = 500) {
  let res;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, maxTokens }),
    });
  } catch {
    throw new Error('Connection failed — check your internet and try again');
  }

  if (res.status === 429) throw new Error('Rate limit reached — wait a minute and try again');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content || '';
}

/**
 * Strip markdown fences and parse a JSON array from AI output.
 * Returns [] on any failure.
 */
export function parseJSONArray(raw) {
  let text = String(raw).trim();
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
