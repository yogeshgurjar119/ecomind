/**
 * Log Activity tab: AI quick-log, manual form and reference table.
 */

import { EMISSION_FACTORS, KNOWN_ACTIVITIES } from './config.js';
import { loadLogs, saveLogs, loadSettings, generateId } from './storage.js';
import { callAI, parseJSONArray, isAIEnabled } from './api.js';
import { calcCO2, today, currentTime, esc } from './utils.js';
import { showToast, setLoading, shake, showTab } from './ui.js';
import { renderDashboard } from './dashboard.js';

const $ = (sel, root = document) => root.querySelector(sel);
let pendingAIEntries = [];

export function renderLog() {
  const panel = document.getElementById('tab-log');
  const aiOn = isAIEnabled();

  panel.innerHTML = `
    <h1 class="panel-title">Log activity</h1>
    <p class="panel-sub">Describe your day to the AI, or add an entry manually.</p>

    ${
      aiOn
        ? `<div class="card">
            <h3 class="section-title" style="margin-top:0"><i class="ti ti-sparkles"></i>Quick AI log</h3>
            <div class="field">
              <textarea id="ai-text" rows="3"
                placeholder="e.g. drove 25km to office, had chicken for lunch, ordered clothes online"></textarea>
            </div>
            <button class="btn btn-primary" id="ai-log-btn"><i class="ti ti-wand"></i> Auto-log with AI</button>
            <div id="ai-preview" style="margin-top:12px"></div>
          </div>`
        : `<div class="banner">
            <i class="ti ti-info-circle"></i>
            <span>Add your NVIDIA key to <code>.env</code> to unlock AI auto-logging. Manual logging works without it.</span>
          </div>`
    }

    <div class="card" style="margin-top:16px">
      <h3 class="section-title" style="margin-top:0"><i class="ti ti-edit"></i>Manual log</h3>
      <div class="form-row">
        <div class="field">
          <label>Category</label>
          <select id="m-category">
            ${Object.keys(EMISSION_FACTORS)
              .map((c) => `<option value="${c}" style="text-transform:capitalize">${c}</option>`)
              .join('')}
          </select>
        </div>
        <div class="field">
          <label>Activity</label>
          <select id="m-activity"></select>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label id="m-qty-label">Quantity</label>
          <input type="number" id="m-qty" min="0" step="0.1" placeholder="0" />
          <div class="field-error hidden" id="m-qty-err">Enter a quantity greater than 0</div>
        </div>
        <div class="field">
          <label>Preview</label>
          <div style="padding:9px 0"><span class="preview-co2" id="m-preview">= 0.00 kg CO₂e</span></div>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Date</label><input type="date" id="m-date" value="${today()}" /></div>
        <div class="field"><label>Time</label><input type="time" id="m-time" value="${currentTime()}" /></div>
      </div>
      <button class="btn btn-primary" id="m-log-btn"><i class="ti ti-plus"></i> Log activity</button>
    </div>

    <div class="card" style="margin-top:16px">
      <details class="ref-table" id="ref-table"></details>
    </div>
  `;

  initManualForm();
  initRefTable();
  if (aiOn) $('#ai-log-btn').addEventListener('click', handleAILog);
}

/* ── Manual form ────────────────────────────────────────── */
function initManualForm() {
  const catSel = $('#m-category');
  catSel.addEventListener('change', () => {
    updateActivityDropdown(catSel.value);
    initRefTable();
  });
  $('#m-activity').addEventListener('change', updateCO2Preview);
  $('#m-qty').addEventListener('input', updateCO2Preview);
  $('#m-log-btn').addEventListener('click', handleManualLog);
  updateActivityDropdown(catSel.value);
}

function updateActivityDropdown(category) {
  const sel = $('#m-activity');
  sel.innerHTML = Object.keys(EMISSION_FACTORS[category])
    .map((a) => `<option value="${esc(a)}">${esc(a)}</option>`)
    .join('');
  updateCO2Preview();
}

function updateCO2Preview() {
  const cat = $('#m-category').value;
  const act = $('#m-activity').value;
  const ef = EMISSION_FACTORS[cat]?.[act];
  if (ef) $('#m-qty-label').textContent = `Quantity (${ef.label})`;
  const qty = parseFloat($('#m-qty').value) || 0;
  const co2 = calcCO2(cat, act, qty, loadSettings().country);
  $('#m-preview').textContent = `= ${co2.toFixed(2)} kg CO₂e`;
}

function handleManualLog() {
  const qtyInput = $('#m-qty');
  const qty = parseFloat(qtyInput.value);
  if (!qty || qty <= 0) {
    qtyInput.classList.add('input-error');
    $('#m-qty-err').classList.remove('hidden');
    shake(qtyInput);
    return;
  }
  qtyInput.classList.remove('input-error');
  $('#m-qty-err').classList.add('hidden');

  const cat = $('#m-category').value;
  const act = $('#m-activity').value;
  addLog({
    category: cat,
    activity: act,
    quantity: qty,
    date: $('#m-date').value || today(),
    time: $('#m-time').value || currentTime(),
  });

  qtyInput.value = '';
  updateCO2Preview();
  showToast('Activity logged');
}

/** Build and persist a full log entry from a partial. */
function addLog({ category, activity, quantity, date, time }) {
  const ef = EMISSION_FACTORS[category]?.[activity];
  if (!ef) return false;
  const settings = loadSettings();
  const entry = {
    id: generateId(),
    date: date || today(),
    time: time || currentTime(),
    category,
    activity,
    quantity: Number(quantity),
    unit: ef.unit,
    co2_kg: calcCO2(category, activity, Number(quantity), settings.country),
    source: 'manual',
  };
  const logs = loadLogs();
  logs.push(entry);
  saveLogs(logs);
  sessionStorage.removeItem('eco_insight');
  return true;
}

/* ── AI quick log ───────────────────────────────────────── */
async function handleAILog() {
  const text = $('#ai-text').value.trim();
  if (!text) {
    showToast('Describe your day first', 'warning');
    return;
  }
  const btn = $('#ai-log-btn');
  setLoading(btn, true);

  const known = Object.entries(KNOWN_ACTIVITIES)
    .map(([cat, acts]) => `${cat}: ${acts.join(', ')}`)
    .join('\n');

  try {
    const raw = await callAI(
      [
        {
          role: 'system',
          content: `You are a carbon footprint assistant. Extract activities from the user's text and return ONLY a valid JSON array. No explanation, no markdown.
Rules:
- category must be one of: transport, food, energy, shopping
- activity must exactly match one of the known activities below
- quantity must be a positive number; estimate reasonably if unsure
Known activities:
${known}
Return format: [{"category":"transport","activity":"Car (petrol)","quantity":25}]`,
        },
        { role: 'user', content: text },
      ],
      400
    );

    const items = parseJSONArray(raw).filter(
      (it) =>
        it &&
        KNOWN_ACTIVITIES[it.category]?.includes(it.activity) &&
        Number(it.quantity) > 0
    );

    if (!items.length) {
      showToast('Could not understand AI response — please try again', 'error');
      $('#ai-preview').innerHTML = '';
      return;
    }
    pendingAIEntries = items;
    showAIPreview(items);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

function showAIPreview(items) {
  const country = loadSettings().country;
  const slot = $('#ai-preview');
  slot.innerHTML = `
    <div class="card" style="background:var(--surface)">
      <strong>Found ${items.length} ${items.length === 1 ? 'activity' : 'activities'} — log all?</strong>
      <div style="margin:8px 0">
        ${items
          .map((it) => {
            const co2 = calcCO2(it.category, it.activity, Number(it.quantity), country);
            const ef = EMISSION_FACTORS[it.category][it.activity];
            return `<div class="ai-detect-item">
              <span>${esc(it.activity)} · ${it.quantity} ${esc(ef.label)}</span>
              <span class="mono">${co2.toFixed(2)} kg</span>
            </div>`;
          })
          .join('')}
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="ai-confirm">Confirm</button>
        <button class="btn btn-secondary" id="ai-cancel">Cancel</button>
      </div>
    </div>`;

  $('#ai-confirm').addEventListener('click', () => {
    pendingAIEntries.forEach((it) =>
      addLog({ category: it.category, activity: it.activity, quantity: it.quantity })
    );
    // mark AI source on the just-added entries
    const logs = loadLogs();
    logs.slice(-pendingAIEntries.length).forEach((l) => (l.source = 'ai'));
    saveLogs(logs);

    showToast(`Logged ${pendingAIEntries.length} activities`);
    pendingAIEntries = [];
    $('#ai-text').value = '';
    slot.innerHTML = '';
    renderDashboard();
    showTab('dashboard');
  });
  $('#ai-cancel').addEventListener('click', () => {
    pendingAIEntries = [];
    slot.innerHTML = '';
  });
}

/* ── Reference table ────────────────────────────────────── */
function initRefTable() {
  const cat = $('#m-category').value;
  const country = loadSettings().country;
  const rows = Object.entries(EMISSION_FACTORS[cat])
    .map(([act, ef]) => {
      const isElec = cat === 'energy' && act === 'Electricity';
      const factor = isElec
        ? '(varies by country)'
        : `${ef.factor} kg/${ef.unit}`;
      return `<tr><td>${esc(act)}</td><td class="num">${factor}</td></tr>`;
    })
    .join('');
  $('#ref-table').innerHTML = `
    <summary>Emission factors — ${cat}</summary>
    <table class="factors">
      <thead><tr><th>Activity</th><th style="text-align:right">Factor</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${cat === 'energy' ? `<div class="info-box">Electricity uses your country's grid factor (currently <strong>${country}</strong>).</div>` : ''}
  `;
}
