/**
 * localStorage access layer.
 * Every read/write is wrapped so corrupted data resets to a safe default.
 */

import { COUNTRY_FACTORS } from './config.js';

const KEYS = {
  logs: 'eco_logs',
  settings: 'eco_settings',
  factors: 'eco_country_factors',
  schema: 'eco_schema_version',
};

/** Bump when the stored data shape changes; add a migration step below. */
const SCHEMA_VERSION = 1;

/**
 * Run once at startup. Keeps a user's stored data forward-compatible across
 * deploys: a new build NEVER clears history — instead, future schema changes
 * add an explicit migration step here. Unset/older versions are upgraded
 * in place, preserving all existing logs and settings.
 */
export function migrateStorage() {
  const stored = parseInt(localStorage.getItem(KEYS.schema) || '0', 10);
  if (stored === SCHEMA_VERSION) return;

  // No transformations needed yet (v0 → v1 is a no-op that keeps all data).
  // Future example:
  //   if (stored < 2) { /* rewrite eco_logs entries in place, don't delete */ }

  localStorage.setItem(KEYS.schema, String(SCHEMA_VERSION));
}

const DEFAULT_SETTINGS = {
  country: 'India',
  name: 'User',
  daily_goal_kg: 10,
  onboarded: false,
};

export function loadLogs() {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.logs) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    localStorage.setItem(KEYS.logs, '[]');
    return [];
  }
}

export function saveLogs(logs) {
  localStorage.setItem(KEYS.logs, JSON.stringify(logs));
}

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEYS.settings) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export function loadCountryFactors() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.factors) || JSON.stringify(COUNTRY_FACTORS));
  } catch {
    return { ...COUNTRY_FACTORS };
  }
}

export function clearAllData() {
  localStorage.removeItem(KEYS.logs);
  localStorage.removeItem(KEYS.settings);
  localStorage.removeItem(KEYS.factors);
  localStorage.removeItem(KEYS.schema);
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
