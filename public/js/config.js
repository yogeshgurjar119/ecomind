/**
 * Static configuration — emission factors and country grid factors.
 * These never change at runtime.
 */

export const APP_VERSION = '1.0.0';

export const EMISSION_FACTORS = {
  transport: {
    'Car (petrol)': { factor: 0.171, unit: 'km', label: 'km driven' },
    'Car (diesel)': { factor: 0.168, unit: 'km', label: 'km driven' },
    'Car (electric)': { factor: 0.053, unit: 'km', label: 'km driven' },
    Motorbike: { factor: 0.114, unit: 'km', label: 'km driven' },
    Bus: { factor: 0.089, unit: 'km', label: 'km traveled' },
    Train: { factor: 0.041, unit: 'km', label: 'km traveled' },
    'Auto rickshaw': { factor: 0.058, unit: 'km', label: 'km traveled' },
    'Flight (short)': { factor: 0.255, unit: 'km', label: 'km flown' },
    'Flight (long)': { factor: 0.195, unit: 'km', label: 'km flown' },
  },
  food: {
    'Beef meal': { factor: 6.61, unit: 'serving', label: 'servings' },
    'Lamb meal': { factor: 5.84, unit: 'serving', label: 'servings' },
    'Pork meal': { factor: 1.72, unit: 'serving', label: 'servings' },
    'Chicken meal': { factor: 0.97, unit: 'serving', label: 'servings' },
    'Fish meal': { factor: 0.61, unit: 'serving', label: 'servings' },
    'Vegetarian meal': { factor: 0.28, unit: 'serving', label: 'servings' },
    'Vegan meal': { factor: 0.15, unit: 'serving', label: 'servings' },
    'Dairy (milk 1L)': { factor: 3.15, unit: 'litre', label: 'litres' },
    'Eggs (6 pack)': { factor: 1.08, unit: 'pack', label: 'packs' },
  },
  energy: {
    Electricity: { factor: null, unit: 'kWh', label: 'kWh used', note: 'uses country factor' },
    'Natural gas': { factor: 0.203, unit: 'kWh', label: 'kWh used' },
    'LPG cooking': { factor: 1.51, unit: 'kg', label: 'kg used' },
    'Oil heating': { factor: 0.298, unit: 'kWh', label: 'kWh used' },
  },
  shopping: {
    'Clothing item': { factor: 22.7, unit: 'item', label: 'items' },
    'Electronics (small)': { factor: 38.0, unit: 'item', label: 'items' },
    'Electronics (large)': { factor: 270.0, unit: 'item', label: 'items' },
    'Online order': { factor: 0.5, unit: 'order', label: 'orders' },
    'Furniture item': { factor: 48.0, unit: 'item', label: 'items' },
  },
};

export const COUNTRY_FACTORS = {
  India: { electricity_kg_kwh: 0.708, currency: 'INR' },
  USA: { electricity_kg_kwh: 0.386, currency: 'USD' },
  UK: { electricity_kg_kwh: 0.233, currency: 'GBP' },
  Germany: { electricity_kg_kwh: 0.385, currency: 'EUR' },
  Australia: { electricity_kg_kwh: 0.656, currency: 'AUD' },
  China: { electricity_kg_kwh: 0.581, currency: 'CNY' },
  Brazil: { electricity_kg_kwh: 0.074, currency: 'BRL' },
  France: { electricity_kg_kwh: 0.056, currency: 'EUR' },
  Norway: { electricity_kg_kwh: 0.026, currency: 'NOK' },
  Poland: { electricity_kg_kwh: 0.773, currency: 'PLN' },
  Canada: { electricity_kg_kwh: 0.12, currency: 'CAD' },
  Japan: { electricity_kg_kwh: 0.474, currency: 'JPY' },
  'South Korea': { electricity_kg_kwh: 0.415, currency: 'KRW' },
  'South Africa': { electricity_kg_kwh: 0.928, currency: 'ZAR' },
};

/**
 * Representative location (capital city) per supported country, used to
 * fetch live weather from the free, key-less Open-Meteo API.
 * Keys must match COUNTRY_FACTORS above.
 */
export const COUNTRY_WEATHER = {
  India: { city: 'New Delhi', lat: 28.6139, lon: 77.209 },
  USA: { city: 'Washington, D.C.', lat: 38.9072, lon: -77.0369 },
  UK: { city: 'London', lat: 51.5074, lon: -0.1278 },
  Germany: { city: 'Berlin', lat: 52.52, lon: 13.405 },
  Australia: { city: 'Canberra', lat: -35.2809, lon: 149.13 },
  China: { city: 'Beijing', lat: 39.9042, lon: 116.4074 },
  Brazil: { city: 'Brasília', lat: -15.7939, lon: -47.8828 },
  France: { city: 'Paris', lat: 48.8566, lon: 2.3522 },
  Norway: { city: 'Oslo', lat: 59.9139, lon: 10.7522 },
  Poland: { city: 'Warsaw', lat: 52.2297, lon: 21.0122 },
  Canada: { city: 'Ottawa', lat: 45.4215, lon: -75.6972 },
  Japan: { city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  'South Korea': { city: 'Seoul', lat: 37.5665, lon: 126.978 },
  'South Africa': { city: 'Pretoria', lat: -25.7479, lon: 28.2293 },
};

/**
 * ISO 3166-1 alpha-3 codes, used to query the free World Bank Open Data API
 * for each country's real CO₂-per-capita figure. Keys match COUNTRY_FACTORS.
 */
export const COUNTRY_ISO = {
  India: 'IND',
  USA: 'USA',
  UK: 'GBR',
  Germany: 'DEU',
  Australia: 'AUS',
  China: 'CHN',
  Brazil: 'BRA',
  France: 'FRA',
  Norway: 'NOR',
  Poland: 'POL',
  Canada: 'CAN',
  Japan: 'JPN',
  'South Korea': 'KOR',
  'South Africa': 'ZAF',
};

export const CATEGORY_META = {
  transport: { icon: 'ti-car', color: 'transport' },
  food: { icon: 'ti-meat', color: 'food' },
  energy: { icon: 'ti-bolt', color: 'energy' },
  shopping: { icon: 'ti-shopping-bag', color: 'shopping' },
};

/** Annual per-capita benchmarks, in tonnes CO₂e. */
export const BENCHMARKS = [
  { name: 'Paris 1.5°C target', tonnes: 0.91 },
  { name: 'India average', tonnes: 1.8 },
  { name: 'Global average', tonnes: 4.8 },
  { name: 'UK average', tonnes: 5.1 },
  { name: 'US average', tonnes: 14.9 },
];

export const QUICK_PROMPTS = [
  'Analyze my footprint and give me a reduction plan',
  'What are my top 3 changes for maximum impact?',
  'Compare my footprint to the average person in my country',
  'Give me a 7-day eco challenge based on my habits',
  'Explain the climate impact of my food choices',
];

/** Allowed activity names per category, for validating AI output. */
export const KNOWN_ACTIVITIES = Object.fromEntries(
  Object.entries(EMISSION_FACTORS).map(([cat, acts]) => [cat, Object.keys(acts)])
);
