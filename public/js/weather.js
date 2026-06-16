/**
 * Live weather for the user's selected country.
 *
 * Uses the Open-Meteo API — completely free, no API key and no sign-up
 * required (https://open-meteo.com). Calls go straight from the browser
 * since there's no secret to protect, so this works fully client-side.
 *
 * The country → capital-city coordinates live in config.js (COUNTRY_WEATHER).
 */

import { COUNTRY_WEATHER } from './config.js';
import { loadSettings } from './storage.js';
import { esc } from './utils.js';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const AQI_ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** US AQI value → category label + colour. */
function aqiCategory(aqi) {
  if (aqi <= 50) return { label: 'Good', color: '#2ecc71' };
  if (aqi <= 100) return { label: 'Moderate', color: '#d4a017' };
  if (aqi <= 150) return { label: 'Unhealthy (sensitive)', color: '#e67e22' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#e74c3c' };
  if (aqi <= 300) return { label: 'Very unhealthy', color: '#9b59b6' };
  return { label: 'Hazardous', color: '#9b1d1d' };
}

/** WMO weather-interpretation codes → label + Tabler icon. */
const WMO = {
  0: { label: 'Clear sky', day: 'ti-sun', night: 'ti-moon-stars' },
  1: { label: 'Mainly clear', day: 'ti-sun', night: 'ti-moon-stars' },
  2: { label: 'Partly cloudy', day: 'ti-cloud-sun', night: 'ti-cloud-moon' },
  3: { label: 'Overcast', day: 'ti-cloud', night: 'ti-cloud' },
  45: { label: 'Fog', day: 'ti-mist', night: 'ti-mist' },
  48: { label: 'Rime fog', day: 'ti-mist', night: 'ti-mist' },
  51: { label: 'Light drizzle', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  53: { label: 'Drizzle', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  55: { label: 'Dense drizzle', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  56: { label: 'Freezing drizzle', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  57: { label: 'Freezing drizzle', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  61: { label: 'Light rain', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  63: { label: 'Rain', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  65: { label: 'Heavy rain', day: 'ti-cloud-storm', night: 'ti-cloud-storm' },
  66: { label: 'Freezing rain', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  67: { label: 'Freezing rain', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  71: { label: 'Light snow', day: 'ti-snowflake', night: 'ti-snowflake' },
  73: { label: 'Snow', day: 'ti-snowflake', night: 'ti-snowflake' },
  75: { label: 'Heavy snow', day: 'ti-snowflake', night: 'ti-snowflake' },
  77: { label: 'Snow grains', day: 'ti-snowflake', night: 'ti-snowflake' },
  80: { label: 'Rain showers', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  81: { label: 'Rain showers', day: 'ti-cloud-rain', night: 'ti-cloud-rain' },
  82: { label: 'Violent showers', day: 'ti-cloud-storm', night: 'ti-cloud-storm' },
  85: { label: 'Snow showers', day: 'ti-snowflake', night: 'ti-snowflake' },
  86: { label: 'Snow showers', day: 'ti-snowflake', night: 'ti-snowflake' },
  95: { label: 'Thunderstorm', day: 'ti-cloud-bolt', night: 'ti-cloud-bolt' },
  96: { label: 'Thunderstorm, hail', day: 'ti-cloud-bolt', night: 'ti-cloud-bolt' },
  99: { label: 'Thunderstorm, hail', day: 'ti-cloud-bolt', night: 'ti-cloud-bolt' },
};

/** Group a WMO code into a visual scene for the animated sky. */
function codeToScene(code) {
  if ([0, 1].includes(code)) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  return 'cloudy';
}

function describe(code, isDay) {
  const w = WMO[code] || { label: 'Unknown', day: 'ti-cloud', night: 'ti-cloud' };
  return { label: w.label, icon: isDay ? w.day : w.night, scene: codeToScene(code) };
}

/* ── Animated SVG sky scene ─────────────────────────────────── */

const RAYS = `
  <line x1="84" y1="46" x2="94" y2="46"/><line x1="77" y1="63" x2="84" y2="70"/>
  <line x1="60" y1="70" x2="60" y2="80"/><line x1="43" y1="63" x2="36" y2="70"/>
  <line x1="36" y1="46" x2="26" y2="46"/><line x1="43" y1="29" x2="36" y2="22"/>
  <line x1="60" y1="22" x2="60" y2="12"/><line x1="77" y1="29" x2="84" y2="22"/>`;

const sun = (cx, cy, r, rays = false) =>
  `${rays ? `<g class="wx-rays">${RAYS}</g>` : ''}<circle class="wx-sun" cx="${cx}" cy="${cy}" r="${r}"/>`;

const moon = (cx, cy, r, stars = false) =>
  `<circle class="wx-moon" cx="${cx}" cy="${cy}" r="${r}"/>` +
  (stars
    ? `<circle class="wx-star s1" cx="28" cy="24" r="2"/>
       <circle class="wx-star s2" cx="92" cy="30" r="1.7"/>
       <circle class="wx-star s3" cx="34" cy="66" r="1.6"/>
       <circle class="wx-star s4" cx="88" cy="62" r="2"/>`
    : '');

const cloud = (cx, cy) =>
  `<g class="wx-cloud">
     <circle cx="${cx - 16}" cy="${cy}" r="13"/>
     <circle cx="${cx}" cy="${cy - 12}" r="16"/>
     <circle cx="${cx + 16}" cy="${cy}" r="13"/>
     <rect x="${cx - 29}" y="${cy}" width="58" height="16" rx="8"/>
   </g>`;

const rain = (cx, cy) =>
  [0, 1, 2]
    .map(
      (i) =>
        `<line class="wx-drop d${i}" x1="${cx - 14 + i * 14}" y1="${cy}" x2="${cx - 16 + i * 14}" y2="${cy + 7}"/>`
    )
    .join('');

const snow = (cx, cy) =>
  [0, 1, 2]
    .map((i) => `<circle class="wx-flake f${i}" cx="${cx - 14 + i * 14}" cy="${cy}" r="2.4"/>`)
    .join('');

const bolt = (cx, cy) =>
  `<path class="wx-bolt" d="M${cx + 2} ${cy} l-8 11 h7 l-4 12 13 -16 h-7 z"/>`;

const fog = (cx, cy) =>
  [0, 1, 2]
    .map((i) => `<line class="wx-fogline" x1="${cx - 22}" y1="${cy + i * 7}" x2="${cx + 22}" y2="${cy + i * 7}"/>`)
    .join('');

/** Build the inline animated SVG for a scene. */
function buildScene(scene, isDay) {
  let inner;
  switch (scene) {
    case 'clear':
      inner = isDay ? sun(60, 46, 18, true) : moon(60, 46, 17, true);
      break;
    case 'partly':
      inner = (isDay ? sun(44, 32, 13) : moon(44, 32, 12)) + cloud(66, 54);
      break;
    case 'fog':
      inner = cloud(60, 36) + fog(60, 60);
      break;
    case 'rain':
      inner = cloud(60, 36) + rain(60, 58);
      break;
    case 'snow':
      inner = cloud(60, 36) + snow(60, 60);
      break;
    case 'storm':
      inner = cloud(60, 34) + bolt(58, 54);
      break;
    case 'cloudy':
    default:
      inner = cloud(60, 46);
  }
  return `<svg class="weather-scene" viewBox="0 0 120 96" aria-hidden="true">${inner}</svg>`;
}

/** Fetch current weather for a lat/lon. Throws on network/HTTP error. */
async function fetchWeather(lat, lon) {
  const url =
    `${ENDPOINT}?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m' +
    '&timezone=auto';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error ${res.status}`);
  const data = await res.json();
  const c = data.current;
  if (!c) throw new Error('No weather data returned');

  return {
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    wind: Math.round(c.wind_speed_10m),
    isDay: c.is_day === 1,
    ...describe(c.weather_code, c.is_day === 1),
  };
}

/** Fetch current US AQI + PM2.5 for a lat/lon. Throws on error. */
async function fetchAQI(lat, lon) {
  const url =
    `${AQI_ENDPOINT}?latitude=${lat}&longitude=${lon}` +
    '&current=us_aqi,pm2_5&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AQI API error ${res.status}`);
  const c = (await res.json()).current;
  if (!c || c.us_aqi == null) throw new Error('No AQI data');
  return { aqi: Math.round(c.us_aqi), pm25: Math.round(c.pm2_5) };
}

/**
 * Render the weather widget into `slot` for the currently selected country.
 * Caches results in sessionStorage for 10 min, keyed by country.
 */
export async function renderWeather(slot) {
  if (!slot) return;
  const country = loadSettings().country;
  const place = COUNTRY_WEATHER[country];

  if (!place) {
    slot.innerHTML = '';
    return;
  }

  // Serve from cache when fresh.
  const cacheKey = `eco_weather_${country}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      slot.innerHTML = weatherCard(country, place, cached.data);
      return;
    }
  } catch {
    /* ignore corrupt cache */
  }

  slot.innerHTML = loadingCard(country, place);

  try {
    // Weather is required; air quality is best-effort (chip hidden if it fails).
    const [data, air] = await Promise.all([
      fetchWeather(place.lat, place.lon),
      fetchAQI(place.lat, place.lon).catch(() => null),
    ]);
    data.air = air;
    sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data }));
    slot.innerHTML = weatherCard(country, place, data);
  } catch {
    slot.innerHTML = errorCard(country, place);
  }
}

/** AQI pill, or empty string when air-quality data is unavailable. */
function aqiChip(air) {
  if (!air) return '';
  const cat = aqiCategory(air.aqi);
  return `<span class="aqi-chip" title="US Air Quality Index · PM2.5 ${air.pm25} µg/m³"
       style="--aqi:${cat.color}">
       <span class="aqi-dot"></span>AQI ${air.aqi} · ${cat.label}
     </span>`;
}

function header(country, place) {
  return `<div class="weather-place">
      <i class="ti ti-map-pin"></i>
      <span>${esc(place.city)}, ${esc(country)}</span>
    </div>`;
}

function weatherCard(country, place, d) {
  return `<div class="card weather-card ${d.isDay ? 'is-day' : 'is-night'}">
      <div class="weather-main">
        ${buildScene(d.scene, d.isDay)}
        <div class="weather-temp">
          <span class="weather-deg">${d.temp}°<span class="unit">C</span></span>
          <span class="weather-cond">${esc(d.label)}</span>
        </div>
      </div>
      <div class="weather-side">
        ${header(country, place)}
        <div class="weather-stats">
          <span title="Feels like"><i class="ti ti-temperature"></i> ${d.feels}°</span>
          <span title="Humidity"><i class="ti ti-droplet"></i> ${d.humidity}%</span>
          <span title="Wind speed"><i class="ti ti-wind"></i> ${d.wind} km/h</span>
        </div>
        ${aqiChip(d.air)}
      </div>
    </div>`;
}

function loadingCard(country, place) {
  return `<div class="card weather-card">
      <div class="weather-main">
        <span class="spinner spinner-dark"></span>
        <div class="weather-temp">
          <span class="weather-cond">Loading live weather…</span>
        </div>
      </div>
      <div class="weather-side">${header(country, place)}</div>
    </div>`;
}

function errorCard(country, place) {
  return `<div class="card weather-card">
      <div class="weather-main">
        <i class="ti ti-cloud-off weather-icon"></i>
        <div class="weather-temp">
          <span class="weather-cond">Weather unavailable</span>
        </div>
      </div>
      <div class="weather-side">${header(country, place)}</div>
    </div>`;
}
