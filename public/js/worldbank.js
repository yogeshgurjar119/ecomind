/**
 * World Bank Open Data — real CO₂-per-capita figure for the user's country.
 *
 * Free, no API key, CORS-enabled. Indicator EN.GHG.CO2.PC.CE.AR5 =
 * "Carbon dioxide (CO2) emissions excluding LULUCF per capita (t CO2e/capita)".
 * `mrnev=1` returns the most recent non-empty value.
 */

import { COUNTRY_ISO } from './config.js';

const INDICATOR = 'EN.GHG.CO2.PC.CE.AR5';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // a day — this data barely changes

/**
 * Fetch a country's latest per-capita CO₂ emissions in tonnes.
 * Returns { tonnes, year } or null when unavailable.
 */
export async function fetchCountryCO2(country) {
  const iso = COUNTRY_ISO[country];
  if (!iso) return null;

  const cacheKey = `eco_wb_co2_${iso}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  } catch {
    /* ignore corrupt cache */
  }

  try {
    const url = `https://api.worldbank.org/v2/country/${iso}/indicator/${INDICATOR}?format=json&mrnev=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`World Bank API error ${res.status}`);
    const json = await res.json();
    const row = Array.isArray(json) && Array.isArray(json[1]) ? json[1][0] : null;
    if (!row || row.value == null) throw new Error('No data');

    const value = { tonnes: row.value, year: row.date };
    sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), value }));
    return value;
  } catch {
    return null;
  }
}
