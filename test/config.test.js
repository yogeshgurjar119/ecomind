/**
 * Tests for the static configuration in public/js/config.js.
 * These guard against the country tables drifting out of sync — e.g. adding
 * a country to COUNTRY_FACTORS but forgetting its weather coords or ISO code.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const {
  EMISSION_FACTORS, COUNTRY_FACTORS, COUNTRY_WEATHER, COUNTRY_ISO,
  CATEGORY_META, BENCHMARKS, KNOWN_ACTIVITIES,
} = await import('../public/js/config.js');

test('every country has matching grid factor, weather coords and ISO code', () => {
  const countries = Object.keys(COUNTRY_FACTORS);
  for (const c of countries) {
    assert.ok(COUNTRY_WEATHER[c], `${c} is missing a COUNTRY_WEATHER entry`);
    assert.ok(COUNTRY_ISO[c], `${c} is missing a COUNTRY_ISO entry`);
  }
  assert.equal(Object.keys(COUNTRY_WEATHER).length, countries.length);
  assert.equal(Object.keys(COUNTRY_ISO).length, countries.length);
});

test('ISO codes are 3 uppercase letters', () => {
  for (const code of Object.values(COUNTRY_ISO)) {
    assert.match(code, /^[A-Z]{3}$/);
  }
});

test('weather coordinates are valid lat/lon with a city name', () => {
  for (const [country, w] of Object.entries(COUNTRY_WEATHER)) {
    assert.equal(typeof w.city, 'string', `${country} city`);
    assert.ok(w.lat >= -90 && w.lat <= 90, `${country} lat`);
    assert.ok(w.lon >= -180 && w.lon <= 180, `${country} lon`);
  }
});

test('every emission factor has a unit, label and numeric (or null) factor', () => {
  for (const [cat, activities] of Object.entries(EMISSION_FACTORS)) {
    assert.ok(CATEGORY_META[cat], `CATEGORY_META missing "${cat}"`);
    for (const [name, ef] of Object.entries(activities)) {
      assert.equal(typeof ef.unit, 'string', `${cat}/${name} unit`);
      assert.equal(typeof ef.label, 'string', `${cat}/${name} label`);
      assert.ok(ef.factor === null || typeof ef.factor === 'number', `${cat}/${name} factor`);
    }
  }
});

test('KNOWN_ACTIVITIES mirrors the emission factor keys', () => {
  for (const cat of Object.keys(EMISSION_FACTORS)) {
    assert.deepEqual(KNOWN_ACTIVITIES[cat], Object.keys(EMISSION_FACTORS[cat]));
  }
});

test('benchmarks are named with positive tonnage', () => {
  assert.ok(BENCHMARKS.length > 0);
  for (const b of BENCHMARKS) {
    assert.equal(typeof b.name, 'string');
    assert.ok(b.tonnes > 0, `${b.name} tonnes`);
  }
});
