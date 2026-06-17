/**
 * Insights tab: benchmarks, 14-day trend, category analysis,
 * and an on-demand AI deep-analysis report.
 */

import { BENCHMARKS, CATEGORY_META } from './config.js';
import { loadLogs, loadSettings } from './storage.js';
import { callAI, isAIEnabled } from './api.js';
import { fetchCountryCO2 } from './worldbank.js';
import {
  daysAgo,
  today,
  dailyTotals,
  getLogsForDateRange,
  getCategoryTotals,
  weekdayLabel,
  esc,
  mdToHtml,
} from './utils.js';
import { showToast, setLoading } from './ui.js';
import { $, emptyState } from './dom.js';

const CATEGORY_TIPS = {
  transport: 'Combine trips, carpool, or swap one car journey a week for public transport or cycling.',
  food: 'Replace two red-meat meals a week with chicken, fish or plant-based options.',
  energy: 'Switch to LED bulbs and unplug idle devices — small loads add up over a month.',
  shopping: 'Buy fewer, longer-lasting items and repair before replacing.',
};

export function renderInsights() {
  const panel = document.getElementById('tab-insights');
  const logs = loadLogs();
  const settings = loadSettings();

  if (!logs.length) {
    panel.innerHTML = `
      <h1 class="panel-title">Insights</h1>
      <div class="card">${emptyState(
        'ti-chart-dots',
        'Log a few activities to unlock benchmarks, trends and analysis.'
      )}</div>`;
    return;
  }

  const weekLogs = getLogsForDateRange(daysAgo(6), today());
  const weeklyTotal = weekLogs.reduce((s, l) => s + l.co2_kg, 0);
  const annualTonnes = (weeklyTotal / 7) * 365 / 1000;

  panel.innerHTML = `
    <h1 class="panel-title">Insights</h1>
    <p class="panel-sub">How you compare, and where to focus.</p>

    <div class="card">
      <h2 class="section-title" style="margin-top:0"><i class="ti ti-scale" aria-hidden="true"></i>Benchmarks</h2>
      <div id="benchmarks"></div>
    </div>

    <div class="card" style="margin-top:16px">
      <h2 class="section-title" style="margin-top:0"><i class="ti ti-timeline" aria-hidden="true"></i>Last 14 days</h2>
      <div id="trend"></div>
    </div>

    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <h2 class="section-title" style="margin-top:0"><i class="ti ti-chart-pie-2" aria-hidden="true"></i>Category split</h2>
        <div id="cat-analysis"></div>
      </div>
      <div class="card">
        <h2 class="section-title" style="margin-top:0"><i class="ti ti-trophy" aria-hidden="true"></i>Biggest single entries</h2>
        <div id="top-entries"></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h2 class="section-title" style="margin-top:0"><i class="ti ti-bulb" aria-hidden="true"></i>Focus this week</h2>
      <div id="worst-cat"></div>
    </div>

    <div class="card" style="margin-top:16px">
      <h2 class="section-title" style="margin-top:0"><i class="ti ti-sparkles" aria-hidden="true"></i>AI deep analysis</h2>
      ${
        isAIEnabled()
          ? `<button class="btn btn-primary" id="report-btn"><i class="ti ti-report" aria-hidden="true"></i> Generate personalized report</button>
             <div id="report-out" style="margin-top:12px"></div>`
          : `<p class="panel-sub" style="margin:0">Add your NVIDIA key to <code>.env</code> to generate a personalized report.</p>`
      }
    </div>
  `;

  renderBenchmarks(annualTonnes, settings);
  renderTrend(settings.daily_goal_kg);
  renderCategoryAnalysis(weekLogs, weeklyTotal);
  renderTopEntries(logs);
  renderWorstCategory(weekLogs);

  if (isAIEnabled()) {
    $('#report-btn').addEventListener('click', () =>
      handleAIReport(annualTonnes, weeklyTotal, weekLogs, settings)
    );
  }
}

async function renderBenchmarks(annualTonnes, settings) {
  const slot = $('#benchmarks');

  // Fixed benchmark names that the live country figure should replace.
  const fixedFor = { India: 'India average', UK: 'UK average', USA: 'US average' };

  const draw = (live, pending) => {
    const benches = live
      ? BENCHMARKS.filter((b) => b.name !== fixedFor[settings.country]).concat({
          name: `${settings.country} average`,
          tonnes: live.tonnes,
          live: true,
          year: live.year,
        })
      : [...BENCHMARKS];

    const max = Math.max(annualTonnes, ...benches.map((b) => b.tonnes));

    const rows = [{ name: 'You', tonnes: annualTonnes, you: true }, ...benches]
      .map((b) => {
        const pct = (b.tonnes / max) * 100;
        let badge = '';
        if (!b.you) {
          if (annualTonnes < b.tonnes * 0.9) badge = `<span class="badge badge-green">Below</span>`;
          else if (annualTonnes > b.tonnes * 1.1) badge = `<span class="badge badge-red">Above</span>`;
          else badge = `<span class="badge badge-amber">~Equal</span>`;
        }
        const color = b.you ? 'var(--accent)' : b.live ? 'var(--accent2)' : 'var(--text3)';
        const tag = b.live ? ` <span class="badge badge-gray">live · ${b.year}</span>` : '';
        return `<div class="bench-row">
            <div class="bench-head">
              <span>${b.you ? '<strong>You</strong>' : esc(b.name)}${tag} ${badge}</span>
              <span class="mono">${b.tonnes.toFixed(2)} t</span>
            </div>
            <div class="bench-track" aria-hidden="true"><div class="bench-inner" style="width:${pct}%;background:${color}"></div></div>
          </div>`;
      })
      .join('');

    // Base the headline comparison on the user's real country figure when we have it.
    const baseTonnes = live ? live.tonnes : BENCHMARKS.find((b) => b.name === 'India average').tonnes;
    const baseLabel = live ? `${esc(settings.country)} average` : 'India average';
    const diffPct = Math.round(((annualTonnes - baseTonnes) / baseTonnes) * 100);

    const note = pending
      ? `<div class="panel-sub" style="margin-top:8px">Fetching ${esc(
          settings.country
        )}'s latest figure…</div>`
      : live
        ? `<div class="panel-sub" style="margin-top:8px;font-size:12px">Source: World Bank Open Data (${live.year}).</div>`
        : '';

    slot.innerHTML =
      rows +
      `<div class="info-box">You are <strong>${Math.abs(diffPct)}% ${
        diffPct >= 0 ? 'above' : 'below'
      }</strong> the ${baseLabel}.</div>` +
      note;
  };

  draw(null, true);
  const live = await fetchCountryCO2(settings.country);
  draw(live, false);
}

function renderTrend(goal) {
  const data = dailyTotals(14);
  const max = Math.max(...data.map((d) => d.total), goal, 0.001);
  const W = 700;
  const H = 160;
  const stepX = W / (data.length - 1);
  const y = (v) => H - (v / max) * H;

  const points = data.map((d, i) => `${i * stepX},${y(d.total).toFixed(1)}`).join(' ');
  const goalY = y(goal).toFixed(1);

  const dots = data
    .map((d, i) => {
      const color =
        d.total === 0 ? 'var(--text3)' : d.total > goal ? 'var(--danger)' : 'var(--success)';
      return `<circle cx="${i * stepX}" cy="${y(d.total)}" r="3.5" fill="${color}" />`;
    })
    .join('');

  const labels = data
    .map((d, i) =>
      i % 2 === 0
        ? `<text x="${i * stepX}" y="${H + 16}" font-size="10" fill="var(--text3)" text-anchor="middle">${weekdayLabel(
            d.date
          )}</text>`
        : ''
    )
    .join('');

  const overCount = data.filter((d) => d.total > goal).length;
  const summary = data
    .map((d) => `${weekdayLabel(d.date)} ${d.total.toFixed(1)} kg${d.total > goal ? ' (over goal)' : ''}`)
    .join(', ');

  $('#trend').innerHTML = `
    <div class="trend-chart">
      <svg class="trend-svg" viewBox="0 0 ${W} ${H + 24}" preserveAspectRatio="none"
        role="img" aria-label="14-day CO₂e trend against a daily goal of ${goal} kg. ${summary}.">
        <line x1="0" y1="${goalY}" x2="${W}" y2="${goalY}" stroke="var(--warning)" stroke-width="1.5" stroke-dasharray="5 4" />
        <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="2" />
        ${dots}${labels}
      </svg>
    </div>
    <div class="info-box">Dashed line = your daily goal of ${goal} kg. ${overCount} of ${data.length} days were over goal.</div>`;
}

function renderCategoryAnalysis(weekLogs, weeklyTotal) {
  const slot = $('#cat-analysis');
  const totals = getCategoryTotals(weekLogs);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    slot.innerHTML = emptyState('ti-chart-pie-off', 'No data this week.');
    return;
  }

  const colorVar = (cat) => `var(--${CATEGORY_META[cat]?.color || 'transport'})`;
  let acc = 0;
  const segments = entries.map(([cat, kg]) => {
    const start = (acc / weeklyTotal) * 100;
    acc += kg;
    const end = (acc / weeklyTotal) * 100;
    return `${colorVar(cat)} ${start}% ${end}%`;
  });

  const legend = entries
    .map(
      ([cat, kg]) =>
        `<div class="item"><span class="dot" style="background:${colorVar(cat)}" aria-hidden="true"></span>
          <span style="text-transform:capitalize">${cat}</span>
          <span class="mono" style="margin-left:auto">${((kg / weeklyTotal) * 100).toFixed(0)}%</span></div>`
    )
    .join('');

  // The pie is decorative; the legend beside it carries the same data as text.
  slot.innerHTML = `<div class="pie-wrap">
      <div class="pie" style="background:conic-gradient(${segments.join(',')})" aria-hidden="true"></div>
      <div class="pie-legend">${legend}</div>
    </div>`;
}

function renderTopEntries(logs) {
  const slot = $('#top-entries');
  const top = [...logs].sort((a, b) => b.co2_kg - a.co2_kg).slice(0, 3);
  slot.innerHTML = top
    .map(
      (l, i) =>
        `<div class="top-entry">
          <span>${i + 1}. ${esc(l.activity)} <span style="color:var(--text3)">(${l.quantity} ${esc(l.unit)})</span></span>
          <span class="mono">${l.co2_kg.toFixed(2)} kg</span>
        </div>`
    )
    .join('');
}

function renderWorstCategory(weekLogs) {
  const totals = getCategoryTotals(weekLogs);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    $('#worst-cat').innerHTML = `<p class="panel-sub" style="margin:0">No activity this week yet.</p>`;
    return;
  }
  const [cat, kg] = entries[0];
  $('#worst-cat').innerHTML = `
    <p style="margin:0 0 8px">Your biggest source this week is
      <strong class="c-${CATEGORY_META[cat]?.color}" style="text-transform:capitalize">${cat}</strong>
      at <span class="mono">${kg.toFixed(1)} kg CO₂e</span>.</p>
    <div class="info-box">💡 ${CATEGORY_TIPS[cat]}</div>`;
}

async function handleAIReport(annualTonnes, weeklyTotal, weekLogs, settings) {
  const btn = $('#report-btn');
  const out = $('#report-out');
  setLoading(btn, true);
  const totals = getCategoryTotals(weekLogs);

  try {
    const text = await callAI(
      [
        {
          role: 'system',
          content:
            'You are an expert carbon-footprint analyst. Write a warm, specific 3-paragraph analysis. Reference the actual numbers, identify the main driver, and give concrete next steps with estimated savings.',
        },
        {
          role: 'user',
          content: `Country: ${settings.country}. Daily goal: ${settings.daily_goal_kg} kg. Weekly total: ${weeklyTotal.toFixed(
            1
          )} kg. Annual estimate: ${annualTonnes.toFixed(2)} tonnes. Category breakdown: ${JSON.stringify(
            Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, +v.toFixed(1)]))
          )}.`,
        },
      ],
      650
    );
    out.innerHTML = `<div class="card ai-insight"><div class="md">${mdToHtml(text)}</div></div>
      <button class="btn btn-secondary" id="report-regen" style="margin-top:10px"><i class="ti ti-refresh" aria-hidden="true"></i> Regenerate</button>`;
    $('#report-regen').addEventListener('click', () =>
      handleAIReport(annualTonnes, weeklyTotal, weekLogs, settings)
    );
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}
