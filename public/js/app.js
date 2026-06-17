/**
 * EcoMind — application bootstrap.
 * Wires tab navigation, registers renderers and handles first-run.
 *
 * Author: Yogesh Gurjar
 */

import { EMISSION_FACTORS } from './config.js';
import { saveLogs, loadSettings, generateId, migrateStorage } from './storage.js';
import { refreshAIStatus } from './api.js';
import { calcCO2, daysAgo } from './utils.js';
import { registerTab, showTab, showToast } from './ui.js';
import { renderDashboard } from './dashboard.js';
import { renderLog } from './log.js';
import { renderInsights } from './insights.js';
import { renderCoach } from './coach.js';
import { renderSettings } from './settings.js';
import { checkOnboarding } from './onboarding.js';
import { initAmbience } from './ambience.js';

function wireTabs() {
  const buttons = [...document.querySelectorAll('.tab-btn')];
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // ARIA tabs keyboard support: Left/Right move between tabs, Home/End jump
  // to first/last, moving focus and selection together (APG automatic activation).
  document.getElementById('tab-nav')?.addEventListener('keydown', (e) => {
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (current + 1) % buttons.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next === null) return;
    e.preventDefault();
    buttons[next].focus();
    showTab(buttons[next].dataset.tab);
  });

  registerTab('dashboard', renderDashboard);
  registerTab('log', renderLog);
  registerTab('insights', renderInsights);
  registerTab('coach', renderCoach);
  registerTab('settings', renderSettings);
}

async function init() {
  migrateStorage(); // keep stored data forward-compatible across deploys
  await refreshAIStatus();
  wireTabs();
  initAmbience();

  checkOnboarding(() => showTab('dashboard'));
  showTab('dashboard');
}

/* Developer helper: populate 14 days of realistic demo data. */
window.__injectDemoData = function () {
  const country = loadSettings().country;
  const out = [];
  const food = ['Chicken meal', 'Vegetarian meal', 'Fish meal', 'Beef meal', 'Vegan meal'];

  for (let d = 13; d >= 0; d--) {
    const date = daysAgo(d);
    const weekday = new Date(date + 'T12:00:00').getDay();
    const add = (category, activity, quantity, time) =>
      out.push({
        id: generateId(),
        date,
        time,
        category,
        activity,
        quantity,
        unit: EMISSION_FACTORS[category][activity].unit,
        co2_kg: calcCO2(category, activity, quantity, country),
        source: 'manual',
      });

    if (weekday >= 1 && weekday <= 5) add('transport', 'Car (petrol)', 25, '08:30');
    else add('transport', 'Bus', 12, '11:00');

    add('food', food[d % food.length], 1, '13:00');
    add('food', 'Vegetarian meal', 1, '20:00');
    add('energy', 'Electricity', 7 + (d % 4), '21:30');
    if (d % 5 === 0) add('shopping', 'Online order', 1, '17:00');
  }

  saveLogs(out);
  sessionStorage.removeItem('eco_insight');
  renderDashboard();
  showTab('dashboard');
  showToast(`Demo data loaded — ${out.length} activities`);
};

document.addEventListener('DOMContentLoaded', init);
