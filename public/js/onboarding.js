/**
 * First-run onboarding modal (3 steps).
 * The NVIDIA key is configured server-side via .env, so the final
 * step explains that rather than collecting a key in the browser.
 */

import { COUNTRY_FACTORS } from './config.js';
import { loadSettings, saveSettings } from './storage.js';
import { isAIEnabled } from './api.js';

const $ = (sel, root = document) => root.querySelector(sel);
const draft = {};
let step = 1;

export function checkOnboarding(onComplete) {
  const overlay = document.getElementById('onboarding-overlay');
  const settings = loadSettings();
  if (settings.onboarded) {
    overlay.classList.add('hidden');
    return false;
  }
  draft.name = settings.name === 'User' ? '' : settings.name;
  draft.country = settings.country;
  draft.daily_goal_kg = settings.daily_goal_kg;
  step = 1;
  overlay.classList.remove('hidden');
  renderStep(onComplete);
  return true;
}

function renderStep(onComplete) {
  const overlay = document.getElementById('onboarding-overlay');
  const dots = [1, 2, 3].map((n) => `<span class="dot ${n <= step ? 'on' : ''}"></span>`).join('');

  let body = '';
  if (step === 1) {
    body = `
      <h2>Welcome to EcoMind 🌿</h2>
      <p>Track your carbon footprint and get AI-powered tips to reduce it — completely free.</p>
      <div class="field"><label>Your name</label><input id="onb-name" value="${draft.name}" placeholder="e.g. Yogesh" /></div>
      <div class="field"><label>Country</label>
        <select id="onb-country">
          ${Object.keys(COUNTRY_FACTORS)
            .map((c) => `<option ${c === draft.country ? 'selected' : ''}>${c}</option>`)
            .join('')}
        </select>
      </div>`;
  } else if (step === 2) {
    body = `
      <h2>Set your daily CO₂ goal</h2>
      <p>The global average is ~13 kg/day. The Paris 1.5°C target is ~2.5 kg/day. Start where you are.</p>
      <div class="slider-row">
        <input type="range" id="onb-goal" min="5" max="30" step="1" value="${draft.daily_goal_kg}" />
        <span class="slider-val" id="onb-goal-val">${draft.daily_goal_kg} kg</span>
      </div>`;
  } else {
    body = `
      <h2>AI superpowers</h2>
      <p>AI activity extraction and personalized coaching are powered by NVIDIA NIM.
      They turn on automatically once <code>NVIDIA_API_KEY</code> is set in the server's
      <code>.env</code> file.</p>
      <div class="info-box">AI is currently <strong>${
        isAIEnabled() ? 'enabled ✓' : 'disabled'
      }</strong>. You can start logging right away either way.</div>`;
  }

  overlay.innerHTML = `
    <div class="onb-card">
      <div class="onb-steps">${dots}</div>
      ${body}
      <div class="onb-actions">
        <button class="btn btn-primary" id="onb-next">
          ${step < 3 ? 'Next →' : 'Get started →'}
        </button>
      </div>
    </div>`;

  if (step === 2) {
    const g = $('#onb-goal');
    g.addEventListener('input', () => ($('#onb-goal-val').textContent = `${g.value} kg`));
  }

  $('#onb-next').addEventListener('click', () => {
    if (step === 1) {
      const name = $('#onb-name').value.trim();
      if (!name) {
        $('#onb-name').classList.add('input-error');
        $('#onb-name').focus();
        return;
      }
      draft.name = name;
      draft.country = $('#onb-country').value;
    } else if (step === 2) {
      draft.daily_goal_kg = parseInt($('#onb-goal').value, 10);
    }

    if (step < 3) {
      step += 1;
      renderStep(onComplete);
    } else {
      saveSettings({ ...loadSettings(), ...draft, onboarded: true });
      overlay.classList.add('hidden');
      onComplete?.();
    }
  });
}
