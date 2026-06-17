/**
 * Tests for the storage layer — in particular that a schema migration
 * upgrades the version WITHOUT wiping a user's existing data, which is what
 * protects logs/settings across new deploys.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

class MemStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
globalThis.localStorage = new MemStorage();

const { migrateStorage, saveLogs, loadLogs, saveSettings, loadSettings, clearAllData } =
  await import('../public/js/storage.js');

test('migrateStorage stamps the schema version but preserves existing data', () => {
  saveLogs([{ id: 'a', date: '2024-01-01', category: 'food', co2_kg: 1 }]);
  migrateStorage();
  assert.equal(localStorage.getItem('eco_schema_version'), '1');
  assert.equal(loadLogs().length, 1); // data kept, not reset
});

test('migrateStorage is idempotent across repeated deploys', () => {
  migrateStorage();
  migrateStorage();
  assert.equal(localStorage.getItem('eco_schema_version'), '1');
  assert.equal(loadLogs().length, 1);
});

test('loadSettings merges stored values over defaults', () => {
  saveSettings({ name: 'Yogesh', country: 'India', daily_goal_kg: 8, onboarded: true });
  const s = loadSettings();
  assert.equal(s.name, 'Yogesh');
  assert.equal(s.daily_goal_kg, 8);
  assert.equal(s.onboarded, true);
});

test('clearAllData removes every key, including the schema marker', () => {
  clearAllData();
  assert.equal(localStorage.getItem('eco_logs'), null);
  assert.equal(localStorage.getItem('eco_settings'), null);
  assert.equal(localStorage.getItem('eco_country_factors'), null);
  assert.equal(localStorage.getItem('eco_schema_version'), null);
});
