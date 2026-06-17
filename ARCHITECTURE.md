# Architecture

A short map of how EcoMind is structured and the conventions that keep it
maintainable. (User-facing overview lives in the [README](README.md).)

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Views (per tab)   dashboard · log · insights · coach ·      │
│                    settings · onboarding                     │
├─────────────────────────────────────────────────────────────┤
│  Cross-cutting     ui.js (tabs/toasts)  ·  dom.js (helpers)  │
├─────────────────────────────────────────────────────────────┤
│  Domain logic      utils.js (CO₂ math, stats, dates, md)     │
├─────────────────────────────────────────────────────────────┤
│  Data access       storage.js (localStorage + migrations)    │
│  External clients  api.js · weather.js · worldbank.js        │
├─────────────────────────────────────────────────────────────┤
│  Config (no logic) config.js (factors, country tables)       │
└─────────────────────────────────────────────────────────────┘
            server.js — static host + NVIDIA proxy
```

Dependencies point **downward** only: views use domain/data/clients; nothing
lower imports a view (except the explicit `renderDashboard` refresh after a
data change). This keeps modules independently testable.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `app.js` | Bootstrap: run migrations, wire tabs, first-run, demo helper |
| `dom.js` | Shared DOM helpers (`$`, `emptyState`) — no duplication across views |
| `ui.js` | Tab switching, toasts, button loading state |
| `config.js` | Static data only: emission factors, country/weather/ISO tables |
| `storage.js` | All `localStorage` reads/writes + forward-compatible migrations |
| `utils.js` | Pure functions: CO₂ calc, stats, dates, Markdown rendering |
| `api.js` | Client for the local `/api` proxy (AI status + chat) |
| `weather.js` | Live weather + AQI (Open-Meteo), with caching |
| `worldbank.js` | Live per-country CO₂ (World Bank), with caching |
| `server.js` | Serves `public/`, proxies AI so the key stays server-side |

## Key conventions

- **No build step** — native ES modules in the browser; nothing to compile.
- **Pure where possible** — `utils.js` has no side effects, so it's unit-tested
  directly; storage-backed helpers read through `storage.js`.
- **Single source of truth for DOM helpers** — `dom.js` (added to remove the
  `$` helper that used to be copy-pasted into every view).
- **Data safety** — storage keys are stable; schema changes go through
  `migrateStorage()` so a new deploy never wipes a user's data.
- **Security** — the AI key lives only in the server `.env`; all AI/Markdown
  output is HTML-escaped before rendering (`esc` / `mdToHtml`).
- **Testing** — `npm test` (Node's built-in runner); `npm run lint` (ESLint).
  Both run in CI on every push.
