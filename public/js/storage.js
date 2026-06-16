/**
 * localStorage access layer.
 * Every read/write is wrapped so corrupted data resets to a safe default.
 */

import { COUNTRY_FACTORS } from './config.js';

const KEYS = {
  logs: 'eco_logs',
  settings: 'eco_settings',
  factors: 'eco_country_factors',
};

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
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
