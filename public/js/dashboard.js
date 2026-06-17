/**
 * Dashboard tab: metric cards, daily chart, category bars,
 * recent activity and a cached AI insight.
 */

import { CATEGORY_META } from './config.js';
import { loadLogs, loadSettings } from './storage.js';
import { callAI, isAIEnabled } from './api.js';
import { renderWeather } from './weather.js';
import {
  today,
  daysAgo,
  dailyTotals,
  getLogsForDateRange,
  getCategoryTotals,
  getEcoScore,
  getRelativeDay,
  weekdayLabel,
  co2Class,
  esc,
  mdToHtml,
} from './utils.js';
import { $, emptyState } from './dom.js';

export function renderDashboard() {
  const panel = document.getElementById('tab-dashboard');
  const logs = loadLogs();
  const settings = loadSettings();

  const todayTotal = logs
    .filter((l) => l.date === today())
    .reduce((s, l) => s + l.co2_kg, 0);
  const weekLogs = getLogsForDateRange(daysAgo(6), today());
  const weeklyTotal = weekLogs.reduce((s, l) => s + l.co2_kg, 0);
  const annualTonnes = (weeklyTotal / 7) * 365 / 1000;
  const ecoScore = getEcoScore(weeklyTotal, settings.daily_goal_kg);

  panel.innerHTML = `
    <h1 class="panel-title">Hi, ${esc(settings.name)} 👋</h1>
    <p class="panel-sub">Here's your carbon footprint at a glance.</p>

    <div id="weather-slot" style="margin-bottom:16px"></div>

    <div class="metric-grid">
      ${metricCard("Today's CO₂", todayTotal.toFixed(1), 'kg CO₂e')}
      ${metricCard('This week', weeklyTotal.toFixed(1), 'kg CO₂e')}
      ${metricCard('Annual estimate', annualTonnes.toFixed(1), 'tonnes CO₂e')}
      ${metricCard('Eco score', ecoScore, '/ 100')}
    </div>

    <h2 class="section-title"><i class="ti ti-chart-bar" aria-hidden="true"></i>Last 7 days</h2>
    <div class="card" id="daily-chart"></div>

    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <h2 class="section-title" style="margin-top:0"><i class="ti ti-chart-pie" aria-hidden="true"></i>By category</h2>
        <div id="cat-bars"></div>
      </div>
      <div class="card">
        <h2 class="section-title" style="margin-top:0"><i class="ti ti-history" aria-hidden="true"></i>Recent activity</h2>
        <div id="recent-logs"></div>
      </div>
    </div>

    <div id="ai-insight-slot" style="margin-top:16px"></div>
  `;

  renderWeather($('#weather-slot'));
  renderDailyChart();
  renderCategoryBars(weekLogs, weeklyTotal);
  renderRecentLogs(logs);
  renderAIInsight(weekLogs);
  animateMetrics();
}

/** Count metric values up from zero on render. */
function animateMetrics() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('#tab-dashboard .metric-card .value').forEach((el) => {
    const target = parseFloat(el.textContent);
    if (isNaN(target)) return;
    const decimals = (el.textContent.split('.')[1] || '').length;
    if (reduce) {
      el.textContent = target.toFixed(decimals);
      return;
    }
    const duration = 650;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals);
    };
    requestAnimationFrame(step);
  });
}

function metricCard(label, value, sub) {
  return `<div class="card metric-card">
      <span class="label">${label}</span>
      <span class="value">${value}</span>
      <span class="sub">${sub}</span>
    </div>`;
}

function renderDailyChart() {
  const data = dailyTotals(7);
  const max = Math.max(...data.map((d) => d.total), 0.001);
  const slot = $('#daily-chart');

  if (data.every((d) => d.total === 0)) {
    slot.innerHTML = emptyState('ti-chart-bar-off', 'No activity yet this week.');
    return;
  }

  const summary = data
    .map((d) => `${weekdayLabel(d.date)}: ${d.total.toFixed(1)} kg${d.date === today() ? ' (today)' : ''}`)
    .join(', ');

  slot.innerHTML = `<div class="bar-chart" role="img" aria-label="Daily CO₂e over the last 7 days. ${summary}.">${data
    .map((d) => {
      const pct = (d.total / max) * 100;
      const isToday = d.date === today();
      return `<div class="bar-col ${isToday ? 'today' : ''}" aria-hidden="true">
          <span class="bar-val">${d.total > 0 ? d.total.toFixed(1) : ''}</span>
          <div class="bar-fill" style="height:${pct}%"></div>
          <span class="bar-label">${weekdayLabel(d.date)}</span>
        </div>`;
    })
    .join('')}</div>`;
}

function renderCategoryBars(weekLogs, weeklyTotal) {
  const slot = $('#cat-bars');
  const totals = getCategoryTotals(weekLogs);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    slot.innerHTML = emptyState('ti-chart-pie-off', 'Log activities to see a breakdown.');
    return;
  }

  slot.innerHTML = entries
    .map(([cat, kg]) => {
      const pct = weeklyTotal ? (kg / weeklyTotal) * 100 : 0;
      return `<div class="cat-bar-row">
          <div class="cat-bar-head">
            <span style="text-transform:capitalize">${cat}</span>
            <span class="mono">${kg.toFixed(1)} kg · ${pct.toFixed(0)}%</span>
          </div>
          <div class="cat-bar-track" aria-hidden="true">
            <div class="cat-bar-inner bg-${CATEGORY_META[cat]?.color || 'transport'}" style="width:${pct}%"></div>
          </div>
        </div>`;
    })
    .join('');
}

function renderRecentLogs(logs) {
  const slot = $('#recent-logs');
  const recent = [...logs].reverse().slice(0, 5);

  if (!recent.length) {
    slot.innerHTML = emptyState('ti-clipboard-off', 'Nothing logged yet.');
    return;
  }

  slot.innerHTML = recent
    .map((l) => {
      const meta = CATEGORY_META[l.category] || {};
      return `<div class="log-row">
          <div class="log-icon bg-${meta.color || 'transport'}"><i class="ti ${meta.icon || 'ti-circle'}" aria-hidden="true"></i></div>
          <div class="log-meta">
            <div class="name">${esc(l.activity)}</div>
            <div class="detail">${l.quantity} ${esc(l.unit)} · ${getRelativeDay(l.date)}</div>
          </div>
          <span class="log-co2 ${co2Class(l.co2_kg)}">${l.co2_kg.toFixed(2)} kg</span>
        </div>`;
    })
    .join('');
}

async function renderAIInsight(weekLogs) {
  const slot = $('#ai-insight-slot');
  if (!isAIEnabled() || !weekLogs.length) {
    slot.innerHTML = '';
    return;
  }

  const cached = sessionStorage.getItem('eco_insight');
  if (cached) {
    slot.innerHTML = insightCard(cached);
    return;
  }

  slot.innerHTML = `<div class="card ai-insight">
      <div class="ai-head"><i class="ti ti-sparkles" aria-hidden="true"></i> AI insight</div>
      <div role="status"><span class="spinner spinner-dark" aria-hidden="true"></span> Analyzing your week…</div>
    </div>`;

  const totals = getCategoryTotals(weekLogs);
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];

  try {
    const text = await callAI(
      [
        {
          role: 'system',
          content:
            'You are a concise carbon-footprint assistant. Reply with ONE short, encouraging insight (max 2 sentences) about the user\'s top emission category, including one specific number.',
        },
        {
          role: 'user',
          content: `My top category this week is "${top[0]}" at ${top[1].toFixed(1)} kg CO₂e. Weekly category totals: ${JSON.stringify(
            Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, +v.toFixed(1)]))
          )}.`,
        },
      ],
      160
    );
    sessionStorage.setItem('eco_insight', text);
    slot.innerHTML = insightCard(text);
  } catch {
    slot.innerHTML = ''; // fail silently on the dashboard
  }
}

function insightCard(text) {
  return `<div class="card ai-insight">
      <div class="ai-head"><i class="ti ti-sparkles" aria-hidden="true"></i> AI insight</div>
      <div class="md">${mdToHtml(text)}</div>
    </div>`;
}

