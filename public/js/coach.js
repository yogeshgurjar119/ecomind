/**
 * AI Coach tab: chat interface backed by the NVIDIA proxy.
 * Chat history is kept in memory for the session.
 */

import { QUICK_PROMPTS } from './config.js';
import { loadSettings } from './storage.js';
import { callAI, isAIEnabled } from './api.js';
import {
  daysAgo,
  today,
  getLogsForDateRange,
  getCategoryTotals,
  esc,
  mdToHtml,
} from './utils.js';
import { showToast } from './ui.js';

const $ = (sel, root = document) => root.querySelector(sel);
let chatHistory = []; // {role, content}

export function renderCoach() {
  const panel = document.getElementById('tab-coach');
  const aiOn = isAIEnabled();

  panel.innerHTML = `
    <h1 class="panel-title">AI Coach</h1>
    <p class="panel-sub">Ask EcoCoach anything about your footprint.</p>

    <div class="card">
      <div class="coach-status">
        <span class="status-dot ${aiOn ? 'ok' : ''}"></span>
        <span>${aiOn ? 'Connected' : 'AI not configured — add NVIDIA_API_KEY to .env'}</span>
        <button class="btn btn-secondary" id="clear-chat" style="margin-left:auto;padding:5px 11px">
          <i class="ti ti-trash"></i> Clear
        </button>
      </div>

      <div class="chat-area" id="chat-area"></div>

      <div class="quick-prompts">
        ${QUICK_PROMPTS.map(
          (p) => `<button class="quick-prompt" data-prompt="${esc(p)}">${esc(p)}</button>`
        ).join('')}
      </div>

      <div class="chat-input-row">
        <input type="text" id="chat-input" placeholder="Type your message…" ${aiOn ? '' : 'disabled'} />
        <button class="btn btn-primary" id="chat-send" ${aiOn ? '' : 'disabled'}>
          <i class="ti ti-send"></i>
        </button>
      </div>
    </div>
  `;

  renderHistory();

  $('#clear-chat').addEventListener('click', () => {
    chatHistory = [];
    renderHistory();
  });

  if (!aiOn) return;

  const input = $('#chat-input');
  const send = () => {
    const text = input.value.trim();
    if (text) {
      input.value = '';
      sendCoachMessage(text);
    }
  };
  $('#chat-send').addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
  panel.querySelectorAll('.quick-prompt').forEach((b) =>
    b.addEventListener('click', () => sendCoachMessage(b.dataset.prompt))
  );
}

function renderHistory() {
  const area = $('#chat-area');
  if (!area) return;
  if (!chatHistory.length) {
    area.innerHTML = `<div class="empty-state">
      <i class="ti ti-message-chatbot"></i>
      <p>Start a conversation or tap a suggestion below.</p>
    </div>`;
    return;
  }
  area.innerHTML = chatHistory
    .map(
      (m) =>
        `<div class="chat-msg ${m.role}">${
          m.role === 'assistant' ? mdToHtml(m.content) : esc(m.content)
        }</div>`
    )
    .join('');
  area.scrollTop = area.scrollHeight;
}

async function sendCoachMessage(text) {
  appendChatMessage('user', text);

  const area = $('#chat-area');
  const typing = document.createElement('div');
  typing.className = 'chat-msg assistant';
  typing.innerHTML = `<span class="spinner spinner-dark"></span>`;
  area.appendChild(typing);
  area.scrollTop = area.scrollHeight;

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt() },
      ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
    ];
    const reply = await callAI(messages, 600);
    typing.remove();
    appendChatMessage('assistant', reply || '…');
  } catch (err) {
    typing.remove();
    showToast(err.message, 'error');
  }
}

function appendChatMessage(role, content) {
  chatHistory.push({ role, content });
  renderHistory();
}

function buildSystemPrompt() {
  const settings = loadSettings();
  const weekLogs = getLogsForDateRange(daysAgo(6), today());
  const weeklyTotal = weekLogs.reduce((s, l) => s + l.co2_kg, 0);
  const annualEstimate = ((weeklyTotal / 7) * 365 / 1000).toFixed(2);
  const totals = getCategoryTotals(weekLogs);

  const categoryBreakdown =
    Object.entries(totals)
      .map(([c, kg]) => `- ${c}: ${kg.toFixed(1)} kg`)
      .join('\n') || '- (no activity this week)';

  const recent =
    [...weekLogs]
      .reverse()
      .slice(0, 10)
      .map((l) => `- ${l.date} ${l.activity} (${l.quantity} ${l.unit}, ${l.co2_kg} kg)`)
      .join('\n') || '- (none)';

  return `You are EcoCoach, a friendly and expert carbon footprint advisor with access to the user's activity data.

User profile:
- Country: ${settings.country}
- Daily CO₂ goal: ${settings.daily_goal_kg} kg
- This week's total: ${weeklyTotal.toFixed(1)} kg CO₂e
- Annual estimate: ${annualEstimate} tonnes

This week's breakdown by category:
${categoryBreakdown}

Recent activities (last 10):
${recent}

Instructions:
- Be concise, warm, and specific — reference the user's actual data
- Give actionable advice with estimated CO₂ savings
- Keep responses to 2-4 sentences unless a detailed plan is requested
- Always mention at least one specific number from their data`;
}
