/**
 * First-run onboarding modal (3 steps).
 * The NVIDIA key is configured server-side via .env, so the final
 * step explains that rather than collecting a key in the browser.
 *
 * Implemented as an accessible dialog: role=dialog/aria-modal, focus is moved
 * in on open, trapped while open, and restored to the trigger on close; the
 * rest of the app is made inert so it's unreachable by keyboard/AT.
 */

import { COUNTRY_FACTORS } from './config.js';
import { loadSettings, saveSettings } from './storage.js';
import { isAIEnabled } from './api.js';
import { $ } from './dom.js';

const draft = {};
let step = 1;
let prevFocus = null;

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
  prevFocus = document.activeElement;
  openModal(overlay);
  renderStep(onComplete);
  return true;
}

function openModal(overlay) {
  overlay.classList.remove('hidden');
  const app = document.getElementById('app');
  app?.setAttribute('aria-hidden', 'true');
  app?.setAttribute('inert', '');
  overlay.addEventListener('keydown', trapFocus);
}

function closeModal(overlay) {
  overlay.classList.add('hidden');
  overlay.removeEventListener('keydown', trapFocus);
  const app = document.getElementById('app');
  app?.removeAttribute('aria-hidden');
  app?.removeAttribute('inert');
  prevFocus?.focus?.();
}

function focusables(root) {
  return [
    ...root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ];
}

/** Keep Tab focus inside the dialog while it's open. */
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const overlay = document.getElementById('onboarding-overlay');
  const items = focusables(overlay);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function renderStep(onComplete) {
  const overlay = document.getElementById('onboarding-overlay');
  const dots = [1, 2, 3].map((n) => `<span class="dot ${n <= step ? 'on' : ''}"></span>`).join('');

  let body;
  if (step === 1) {
    body = `
      <h2 id="onb-title">Welcome to EcoMind 🌿</h2>
      <p>Track your carbon footprint and get AI-powered tips to reduce it — completely free.</p>
      <div class="field">
        <label for="onb-name">Your name</label>
        <input id="onb-name" value="${draft.name}" placeholder="e.g. Yogesh" required aria-required="true" autocomplete="name" />
      </div>
      <div class="field">
        <label for="onb-country">Country</label>
        <select id="onb-country">
          ${Object.keys(COUNTRY_FACTORS)
            .map((c) => `<option ${c === draft.country ? 'selected' : ''}>${c}</option>`)
            .join('')}
        </select>
      </div>`;
  } else if (step === 2) {
    body = `
      <h2 id="onb-title">Set your daily CO₂ goal</h2>
      <p>The global average is ~13 kg/day. The Paris 1.5°C target is ~2.5 kg/day. Start where you are.</p>
      <div class="field">
        <label for="onb-goal">Daily CO₂ goal</label>
        <div class="slider-row">
          <input type="range" id="onb-goal" min="5" max="30" step="1" value="${draft.daily_goal_kg}"
            aria-valuetext="${draft.daily_goal_kg} kg" aria-describedby="onb-goal-val" />
          <span class="slider-val" id="onb-goal-val">${draft.daily_goal_kg} kg</span>
        </div>
      </div>`;
  } else {
    body = `
      <h2 id="onb-title">AI superpowers</h2>
      <p>AI activity extraction and personalized coaching are powered by NVIDIA NIM.
      They turn on automatically once <code>NVIDIA_API_KEY</code> is set in the server's
      <code>.env</code> file.</p>
      <div class="info-box">AI is currently <strong>${
        isAIEnabled() ? 'enabled ✓' : 'disabled'
      }</strong>. You can start logging right away either way.</div>`;
  }

  overlay.innerHTML = `
    <div class="onb-card" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <div class="onb-steps" aria-hidden="true">${dots}</div>
      ${body}
      <div class="onb-actions">
        <button class="btn btn-primary" id="onb-next">
          ${step < 3 ? 'Next →' : 'Get started →'}
        </button>
      </div>
    </div>`;

  if (step === 2) {
    const g = $('#onb-goal');
    g.addEventListener('input', () => {
      $('#onb-goal-val').textContent = `${g.value} kg`;
      g.setAttribute('aria-valuetext', `${g.value} kg`);
    });
  }

  // Move focus into the dialog (first field, or the action button on step 3).
  ($('#onb-name') || $('#onb-goal') || $('#onb-next'))?.focus();

  $('#onb-next').addEventListener('click', () => {
    if (step === 1) {
      const nameEl = $('#onb-name');
      const name = nameEl.value.trim();
      if (!name) {
        nameEl.classList.add('input-error');
        nameEl.setAttribute('aria-invalid', 'true');
        nameEl.focus();
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
      closeModal(overlay);
      onComplete?.();
    }
  });
}
