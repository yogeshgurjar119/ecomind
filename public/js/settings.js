/**
 * Settings tab: profile, AI status, data management and about.
 * The NVIDIA key now lives in the server's .env, so this tab
 * reports AI status rather than storing a key in the browser.
 */

import { COUNTRY_FACTORS, APP_VERSION } from './config.js';
import { loadLogs, saveLogs, loadSettings, saveSettings, clearAllData } from './storage.js';
import { callAI, isAIEnabled, refreshAIStatus } from './api.js';
import { esc } from './utils.js';
import { showToast, setLoading } from './ui.js';
import { renderDashboard } from './dashboard.js';

const $ = (sel, root = document) => root.querySelector(sel);

export function renderSettings() {
  const panel = document.getElementById('tab-settings');
  const s = loadSettings();
  const logs = loadLogs();
  const days = new Set(logs.map((l) => l.date)).size;
  const aiOn = isAIEnabled();

  panel.innerHTML = `
    <h1 class="panel-title">Settings</h1>

    <div class="settings-grid">
      <!-- Profile -->
      <div class="card">
        <h3 class="section-title" style="margin-top:0"><i class="ti ti-user"></i>Profile</h3>
        <div class="field"><label>Name</label><input id="s-name" value="${esc(s.name)}" /></div>
        <div class="field">
          <label>Country (sets electricity grid factor)</label>
          <select id="s-country">
            ${Object.keys(COUNTRY_FACTORS)
              .map((c) => `<option ${c === s.country ? 'selected' : ''}>${c}</option>`)
              .join('')}
          </select>
        </div>
        <div class="field">
          <label>Daily CO₂ goal</label>
          <div class="slider-row">
            <input type="range" id="s-goal" min="5" max="30" step="1" value="${s.daily_goal_kg}" />
            <span class="slider-val" id="s-goal-val">${s.daily_goal_kg} kg</span>
          </div>
        </div>
        <button class="btn btn-primary" id="s-save"><i class="ti ti-device-floppy"></i> Save profile</button>
      </div>

      <!-- AI -->
      <div class="card">
        <h3 class="section-title" style="margin-top:0"><i class="ti ti-brain"></i>EcoMind AI</h3>
        <p style="margin:0 0 10px">
          Status:
          <span class="badge ${aiOn ? 'badge-green' : 'badge-gray'}">
            ${aiOn ? 'Connected ✓' : 'Not configured'}
          </span>
        </p>
        <div class="btn-group">
          <button class="btn btn-secondary" id="s-test"><i class="ti ti-plug"></i> Test connection</button>
        </div>
        <div class="info-box">
          The API key is stored securely on the server in <code>.env</code> as
          <code>NVIDIA_API_KEY</code>, never in your browser. Get a free key at
          <strong>build.nvidia.com</strong> — 1000 free calls/month, no credit card.
        </div>
      </div>

      <!-- Data -->
      <div class="card">
        <h3 class="section-title" style="margin-top:0"><i class="ti ti-database"></i>Data management</h3>
        <p class="panel-sub">${logs.length} total activities logged across ${days} ${days === 1 ? 'day' : 'days'}.</p>
        <div class="btn-group">
          <button class="btn btn-secondary" id="s-export"><i class="ti ti-download"></i> Export JSON</button>
          <button class="btn btn-secondary" id="s-import"><i class="ti ti-upload"></i> Import JSON</button>
          <button class="btn btn-danger" id="s-clear"><i class="ti ti-trash"></i> Clear all data</button>
        </div>
        <input type="file" id="s-file" accept="application/json" class="hidden" />
      </div>

      <!-- About -->
      <div class="card">
        <h3 class="section-title" style="margin-top:0"><i class="ti ti-info-circle"></i>About</h3>
        <div class="about-list">
          <div><strong>EcoMind</strong> — v${APP_VERSION}</div>
          <div>Emission factors from IPCC, IEA, Our World in Data</div>
          <div>Built by <strong>Yogesh Gurjar</strong></div>
        </div>
      </div>
    </div>
  `;

  wireProfile();
  wireAI();
  wireData(logs);
}

function wireProfile() {
  const goal = $('#s-goal');
  goal.addEventListener('input', () => ($('#s-goal-val').textContent = `${goal.value} kg`));
  $('#s-save').addEventListener('click', () => {
    const s = loadSettings();
    s.name = $('#s-name').value.trim() || 'User';
    s.country = $('#s-country').value;
    s.daily_goal_kg = parseInt(goal.value, 10);
    saveSettings(s);
    showToast('Settings saved');
    renderDashboard();
  });
}

function wireAI() {
  $('#s-test').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    setLoading(btn, true);
    try {
      await refreshAIStatus();
      if (!isAIEnabled()) {
        showToast('No key configured on the server', 'warning');
        return;
      }
      await callAI([{ role: 'user', content: 'Reply with the single word: ok' }], 5);
      showToast('Connection successful ✓');
      renderSettings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

function wireData(logs) {
  $('#s-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecomind-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  });

  const fileInput = $('#s-file');
  $('#s-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error('not an array');
        const existing = loadLogs();
        const ids = new Set(existing.map((l) => l.id));
        const merged = [...existing, ...imported.filter((l) => l && l.id && !ids.has(l.id))];
        saveLogs(merged);
        showToast(`Imported ${merged.length - existing.length} new activities`);
        renderSettings();
        renderDashboard();
      } catch {
        showToast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  $('#s-clear').addEventListener('click', () => {
    if (!confirm(`Are you sure? This deletes all ${logs.length} logs and resets the app.`)) return;
    clearAllData();
    sessionStorage.removeItem('eco_insight');
    showToast('All data cleared');
    location.reload();
  });
}
