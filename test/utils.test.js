/**
 * Unit tests for the pure logic in public/js/utils.js
 * Run with: npm test  (uses Node's built-in test runner — no dependencies)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage shim so storage-backed helpers run under Node.
class MemStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
globalThis.localStorage = new MemStorage();

// Import after the shim exists so storage-backed calls work.
const {
  toDateString, today, daysAgo, getRelativeDay, weekdayLabel,
  calcCO2, getCategoryTotals, getLogsForDateRange, dailyTotals,
  getEcoScore, fmtCO2, co2Class, esc, mdToHtml,
} = await import('../public/js/utils.js');

test('date helpers produce ISO date strings', () => {
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(daysAgo(0), today());
  assert.equal(toDateString(new Date('2024-01-15T10:00:00Z')), '2024-01-15');
});

test('getRelativeDay describes recent dates', () => {
  assert.equal(getRelativeDay(today()), 'Today');
  assert.equal(getRelativeDay(daysAgo(1)), 'Yesterday');
  assert.equal(getRelativeDay(daysAgo(5)), '5 days ago');
});

test('weekdayLabel returns the short weekday', () => {
  assert.equal(weekdayLabel('2024-01-01'), 'Mon');
});

test('calcCO2 multiplies quantity by the emission factor', () => {
  assert.equal(calcCO2('transport', 'Car (petrol)', 10, 'India'), 1.71);
  assert.equal(calcCO2('food', 'Beef meal', 2, 'India'), 13.22);
});

test('calcCO2 returns 0 for unknown activities', () => {
  assert.equal(calcCO2('transport', 'Spaceship', 5, 'India'), 0);
  assert.equal(calcCO2('nope', 'whatever', 5, 'India'), 0);
});

test('calcCO2 uses the country grid factor for electricity', () => {
  assert.equal(calcCO2('energy', 'Electricity', 5, 'India'), 3.54); // 0.708 * 5
  assert.equal(calcCO2('energy', 'Electricity', 2, 'Atlantis'), 1); // fallback 0.5 * 2
});

test('getCategoryTotals aggregates CO₂ per category', () => {
  const logs = [
    { category: 'food', co2_kg: 1 },
    { category: 'food', co2_kg: 2 },
    { category: 'transport', co2_kg: 3 },
  ];
  assert.deepEqual(getCategoryTotals(logs), { food: 3, transport: 3 });
});

test('getEcoScore is 0–100 and inversely tracks emissions', () => {
  assert.equal(getEcoScore(0, 10), 100);
  assert.equal(getEcoScore(35, 10), 75);
  assert.equal(getEcoScore(140, 10), 0); // clamped, never negative
});

test('fmtCO2 switches to tonnes past 1000 kg', () => {
  assert.equal(fmtCO2(0.5), '0.50 kg');
  assert.equal(fmtCO2(1500), '1.5 t');
});

test('co2Class buckets a value into low/mid/high', () => {
  assert.equal(co2Class(6), 'co2-high');
  assert.equal(co2Class(1), 'co2-mid');
  assert.equal(co2Class(0.5), 'co2-low');
});

test('esc escapes HTML-significant characters', () => {
  assert.equal(esc(`<b>"x"&'`), '&lt;b&gt;&quot;x&quot;&amp;&#39;');
});

test('mdToHtml renders basic markdown', () => {
  assert.equal(mdToHtml('**hi**'), '<p><strong>hi</strong></p>');
  assert.equal(mdToHtml('use `x`'), '<p>use <code>x</code></p>');
  assert.equal(mdToHtml('# Title'), '<h3>Title</h3>');
  assert.equal(mdToHtml('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
});

test('mdToHtml keeps a numbered list in ONE ordered list across blank lines', () => {
  const out = mdToHtml('1. one\n\n2. two\n\n3. three');
  assert.equal((out.match(/<ol>/g) || []).length, 1); // not reset to 1. each time
  assert.equal((out.match(/<li>/g) || []).length, 3);
  assert.equal(out, '<ol><li>one</li><li>two</li><li>three</li></ol>');
});

test('mdToHtml escapes HTML before formatting (no injection)', () => {
  const out = mdToHtml('<script>alert(1)</script>');
  assert.ok(!out.includes('<script>'));
  assert.ok(out.includes('&lt;script&gt;'));
});

test('getLogsForDateRange and dailyTotals read from storage', () => {
  localStorage.setItem('eco_logs', JSON.stringify([
    { date: daysAgo(0), category: 'food', co2_kg: 2 },
    { date: daysAgo(1), category: 'transport', co2_kg: 3 },
    { date: daysAgo(5), category: 'energy', co2_kg: 9 }, // outside the range below
  ]));

  const range = getLogsForDateRange(daysAgo(1), daysAgo(0));
  assert.equal(range.length, 2);

  const dt = dailyTotals(2); // oldest -> newest: [daysAgo(1), daysAgo(0)]
  assert.equal(dt.length, 2);
  assert.equal(dt[0].date, daysAgo(1));
  assert.equal(dt[0].total, 3);
  assert.equal(dt[1].total, 2);
});
