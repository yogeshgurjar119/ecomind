/**
 * Pure helpers: dates, CO₂ math, stats and formatting.
 */

import { EMISSION_FACTORS } from './config.js';
import { loadLogs, loadCountryFactors } from './storage.js';

/* ── Dates ──────────────────────────────────────────────── */
export function toDateString(date) {
  return date.toISOString().split('T')[0];
}
export function today() {
  return toDateString(new Date());
}
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}
export function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}
export function getRelativeDay(dateStr) {
  const diff = Math.round((new Date(today()) - new Date(dateStr)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 0) return 'Future';
  return `${diff} days ago`;
}
export function fmtDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}
/** Short weekday label, e.g. "Mon". */
export function weekdayLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

/* ── CO₂ calculation ────────────────────────────────────── */
export function calcCO2(category, activity, quantity, country) {
  const ef = EMISSION_FACTORS[category]?.[activity];
  if (!ef) return 0;
  if (category === 'energy' && activity === 'Electricity') {
    const factors = loadCountryFactors();
    const countryFactor = factors[country]?.electricity_kg_kwh || 0.5;
    return parseFloat((quantity * countryFactor).toFixed(3));
  }
  return parseFloat((quantity * ef.factor).toFixed(3));
}

/* ── Stats ──────────────────────────────────────────────── */
export function getLogsForDateRange(startDate, endDate) {
  return loadLogs().filter((l) => l.date >= startDate && l.date <= endDate);
}

export function getCategoryTotals(logs) {
  return logs.reduce((acc, l) => {
    acc[l.category] = (acc[l.category] || 0) + l.co2_kg;
    return acc;
  }, {});
}

/** Sum of CO₂ for each of the last `n` days (oldest → newest). */
export function dailyTotals(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) days.push(daysAgo(i));
  const logs = getLogsForDateRange(days[0], days[days.length - 1]);
  return days.map((date) => ({
    date,
    total: logs.filter((l) => l.date === date).reduce((s, l) => s + l.co2_kg, 0),
  }));
}

export function getEcoScore(weeklyTotal, dailyGoal) {
  return Math.max(0, Math.min(100, Math.round(100 - (weeklyTotal / (dailyGoal * 7)) * 50)));
}

/* ── Formatting ─────────────────────────────────────────── */
export function fmtCO2(kg) {
  if (kg >= 1000) return (kg / 1000).toFixed(1) + ' t';
  return kg.toFixed(2) + ' kg';
}

/** color class for a CO₂ value: red >5, amber 1–5, green <1 */
export function co2Class(kg) {
  if (kg > 5) return 'co2-high';
  if (kg >= 1) return 'co2-mid';
  return 'co2-low';
}

/** Escape user/AI text before inserting into innerHTML. */
export function esc(str) {
  return String(str ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/**
 * Render a safe subset of Markdown (as produced by the AI) to HTML.
 * The input is HTML-escaped FIRST, so no raw markup can be injected —
 * only the formatting tags we emit below are ever added.
 *
 * Supports: bold, italic (with asterisks or underscores), inline code,
 * "#" headings, ordered + unordered lists, and paragraph/line breaks.
 */
export function mdToHtml(str) {
  const lines = esc(String(str ?? '')).split('\n');
  let html = '';
  let listType = null; // 'ul' | 'ol' | null

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };

  const inline = (s) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      // Blank lines separate blocks but must NOT break an active list —
      // consecutive list items stay in one <ol>/<ul> so numbering (1,2,3…)
      // doesn't reset. A heading or paragraph below closes the list instead.
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 2, 6); // # -> h3
      html += `<h${level}>${inline(heading[2])}</h${level}>`;
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (listType !== 'ol') {
        closeList();
        html += '<ol>';
        listType = 'ol';
      }
      html += `<li>${inline(ordered[1])}</li>`;
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (listType !== 'ul') {
        closeList();
        html += '<ul>';
        listType = 'ul';
      }
      html += `<li>${inline(bullet[1])}</li>`;
      continue;
    }

    closeList();
    html += `<p>${inline(line)}</p>`;
  }

  closeList();
  return html;
}
