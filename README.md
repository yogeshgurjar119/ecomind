# 🌿 EcoMind — Carbon Footprint Tracker

Track your daily carbon footprint, visualize trends, compare against global
benchmarks, and get **AI-powered coaching** to reduce it — all running locally
on your machine.

## About

**EcoMind** turns everyday actions — your commute, your meals, your electricity
use, your shopping — into a clear picture of your carbon footprint, and then
helps you shrink it. Log activities in seconds (type them in plain English and
let the AI do the rest, or use the quick manual form), and EcoMind instantly
calculates the CO₂ impact using emission factors from the IPCC, IEA and Our
World in Data, adjusted for your country's electricity grid.

A live dashboard shows your daily, weekly and projected-annual emissions plus an
eco score, while the Insights tab benchmarks you against the global average and
the Paris 1.5°C target and pinpoints where to cut back. The built-in **EcoCoach**
is an AI advisor that reads your real data and gives concrete, numbers-backed
advice — like a personal sustainability mentor in your pocket.

It's a small, dependency-light web app: your activity data never leaves your
browser's `localStorage`, and the only outbound calls are to NVIDIA's NIM API
for the optional AI features — proxied through a tiny local server so your API
key is never exposed to the browser. Private by default, free to run, and works
fully offline except for the AI extras.

---

## 🎯 Chosen vertical

**Sustainability & Personal Climate Action** — persona: *the everyday individual
who wants to cut their carbon footprint but finds carbon accounting confusing,
scattered and intimidating.*

EcoMind is their **pocket sustainability mentor**: a smart, dynamic assistant
that turns ordinary daily habits (commute, meals, electricity, shopping) into
concrete CO₂ numbers and then coaches realistic, high-impact reductions —
personalised to *that user's* data, country and goals.

---

## 🧠 Approach & logic

The solution is built around **context-aware decision making** — every output is
derived from the individual user's situation, not generic averages:

- **Natural-language understanding** — the user types their day in plain English
  ("drove 25 km, had chicken for lunch"). The AI extracts structured activities,
  which are **validated against a known activity list** before being trusted.
- **Country-aware emissions** — electricity CO₂ uses the user's **own country's
  grid-intensity factor**, so the same kWh counts differently in Norway vs India.
- **Personalised benchmarking** — the Insights tab compares the user against
  their **own country's real per-capita CO₂** (pulled live from World Bank Open
  Data), plus the Paris 1.5 °C target — not a single hard-coded number.
- **Prioritised coaching** — EcoCoach reads the user's actual logged data,
  identifies their **top emission category**, and gives advice with estimated
  per-change CO₂ savings, focusing effort where it matters most.
- **Goal-relative scoring** — the eco-score is computed from the user's weekly
  total against *their* daily goal, so feedback adapts to each person.
- **Graceful degradation** — if no AI key is configured, the assistant features
  switch off cleanly and the core tracker still works fully offline.

---

## ⚙️ How the solution works

```
User → Log (AI or manual) → CO₂ engine → localStorage → Dashboard / Insights / Coach
                                  ↑                              ↑
                       emission factors +              live data (Open-Meteo,
                       country grid factor             World Bank) + NVIDIA AI
```

1. **Onboarding** captures the user's name, country and daily CO₂ goal.
2. **Logging** — either *Quick AI log* (NVIDIA NIM parses free text into
   structured activities) or a *manual form* with a live CO₂ preview.
3. **CO₂ engine** (`utils.js`) converts each activity using emission factors
   (IPCC / IEA / Our World in Data) and the per-country electricity grid factor.
4. **Storage** — everything is saved in the browser's `localStorage` (no backend,
   no account, no data leaves the device except AI prompts and live-data lookups).
5. **Dashboard** aggregates today / week / projected-annual totals, an eco-score,
   a 7-day chart, category breakdown, and live **weather + air-quality (AQI)** for
   the user's country (Open-Meteo, free, no key).
6. **Insights** benchmarks the user against live World Bank per-capita data and
   shows a 14-day trend against their goal.
7. **EcoCoach** is a chat assistant given the user's real data as context, so its
   advice is specific and numbers-backed.
8. **Security** — the NVIDIA API key lives only in server-side `.env`; the browser
   talks to a small Express proxy (`POST /api/chat`) and never sees the key. All
   AI/Markdown output is HTML-escaped before rendering (no injection).

---

## 📌 Assumptions

- Emission factors are **representative public averages** — figures are for
  *awareness and behaviour change*, not certified carbon accounting.
- **One user per browser** by design — privacy-first, so there is intentionally
  no multi-user backend or cloud database.
- Selecting a country sets the electricity grid factor; changing it affects
  **future** logs only — existing entries keep their stored value.
- Live **weather/AQI uses the country's capital** as a representative location.
- The **World Bank** per-capita CO₂ figure is the latest available year, which
  may lag the present by ~1–2 years.
- **AI features require an NVIDIA key** configured on the server; without it the
  app degrades gracefully (manual logging, dashboard and insights still work).
- Network access is needed only for AI and live weather/AQI/benchmarks — core
  tracking works offline.

---

## ✅ How this maps to the evaluation criteria

| Area | In this project |
| --- | --- |
| **Code Quality** | Small focused ES modules, JSDoc headers, no build step, `app` exported for testability, CI on every push |
| **Security** | API key server-side only (never in the browser); all AI/Markdown output HTML-escaped; API validates input and fails safe |
| **Efficiency** | Dependency-light (only `express` + `dotenv`); weather/AQI/World-Bank responses cached in `sessionStorage`; no framework/bundle |
| **Testing** | 28 unit + API tests via Node's built-in runner (`npm test`), run automatically in GitHub Actions |
| **Accessibility** | Semantic HTML, labelled controls, `aria-live` toasts, keyboard-friendly, respects `prefers-reduced-motion`, light/dark per OS |

---

## ✨ Features

| Tab | What it does |
| --- | --- |
| **Dashboard** | Today / weekly / annual CO₂, eco score, 7-day bar chart, category breakdown, recent activity, and a cached AI insight. |
| **Log** | Natural-language **AI auto-logging** ("drove 25km, had chicken for lunch"), a manual entry form with live CO₂ preview, and an emission-factor reference table. |
| **Insights** | Benchmarks vs. India / Global / UK / US / Paris targets, a 14-day trend chart with your goal line, a category pie, biggest single entries, and an on-demand AI deep-analysis report. |
| **AI Coach** | A chat assistant that knows your data, with quick-prompt suggestions. |
| **Settings** | Profile, country grid factor, daily goal, AI status, and JSON import/export/clear. |

Other niceties: first-run onboarding, light/dark mode (follows your OS), fully
responsive layout, toasts, loading states and friendly empty states.

---

## 🧱 Tech stack

- **Frontend:** vanilla HTML + CSS + ES6 modules (no framework, no build step)
- **Backend:** Node.js + Express — serves the app and proxies the NVIDIA API
- **Storage:** browser `localStorage` (JSON)
- **AI:** NVIDIA NIM API — `meta/llama-3.1-70b-instruct` (free tier)
- **Icons:** Tabler Icons (CDN)

---

## 📂 Project structure

```
ecomind/
├── .env.example          # copy to .env and add your key
├── .gitignore
├── package.json
├── server.js             # Express server + NVIDIA proxy (exports app)
├── README.md
├── .github/
│   └── workflows/
│       └── ci.yml        # runs `npm test` on every push / PR
├── test/                 # Node built-in test runner (no extra deps)
│   ├── utils.test.js     # CO₂ math, stats, Markdown renderer
│   ├── config.test.js    # country-table integrity
│   └── server.test.js    # API validation + routing
└── public/
    ├── index.html        # app shell
    ├── assets/
    │   ├── favicon.svg    # built-in CO₂ footprint mark
    │   └── logo.png       # ← drop your logo image here
    ├── css/
    │   └── styles.css
    └── js/
        ├── config.js     # emission factors, country/weather/ISO tables
        ├── storage.js    # localStorage helpers
        ├── utils.js      # date / CO₂ / stats / Markdown / format helpers
        ├── api.js        # client for the local /api proxy
        ├── ui.js         # toasts, tabs, loading state
        ├── weather.js    # live weather + AQI (Open-Meteo, no key)
        ├── worldbank.js  # live per-country CO₂ (World Bank, no key)
        ├── ambience.js   # animated formula side-rails
        ├── dashboard.js
        ├── log.js
        ├── insights.js
        ├── coach.js
        ├── settings.js
        ├── onboarding.js
        └── app.js        # bootstrap
```

---

## 🚀 Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your environment

Copy the example env file and add your NVIDIA key:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Then edit `.env`:

```env
NVIDIA_API_KEY=nvapi-your-real-key-here
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
PORT=3000
```

> 🔑 Get a **free** key at [build.nvidia.com](https://build.nvidia.com) —
> 1000 calls/month, no credit card required.

> The app runs perfectly **without** a key too — you just won't have the AI
> features (auto-logging, coach, AI reports).

### 3. Run

```bash
npm start
```

Open **http://localhost:3000** in your browser.

For auto-reload during development:

```bash
npm run dev
```

---

## 🧪 Tests

EcoMind ships with a unit-test suite for its core logic — CO₂ calculation,
date/stats helpers, the Markdown renderer and the country-config tables —
using Node's **built-in test runner** (no extra dependencies, nothing added to
the bundle). Run them with:

```bash
npm test
```

The suite also runs automatically on every push/PR via GitHub Actions
(`.github/workflows/ci.yml`). The config tests guard against the country
tables (grid factor, weather coords, ISO code) drifting out of sync, and the
renderer tests verify that all AI/Markdown output is HTML-escaped before
display (no injection).

---

## 🔐 Why a `.env` instead of a key field?

The original concept stored the API key in the browser. EcoMind improves on
that: the key lives only in `.env` on the server, and all AI calls are proxied
through `POST /api/chat`. The browser never sees the key, and `.env` is
git-ignored — so it can't be accidentally committed or leaked.

---

## 🖼️ Branding

Save your logo image as **`public/assets/logo.png`** — it's used for both the
header logo and the favicon. Until you add it, the app falls back to the
built-in `favicon.svg` CO₂-footprint mark, so nothing ever looks broken.

---

## 🧪 Demo data

Want to see the app populated? Open the browser console and run:

```js
__injectDemoData()
```

This loads 14 days of realistic activity for testing.

---

## 📊 Data & methodology

Emission factors are hardcoded from public sources (**IPCC, IEA, Our World in
Data**). Electricity uses a per-country grid intensity factor; changing your
country only affects **future** logs — existing entries keep their stored value.

All figures are estimates for awareness, not certified carbon accounting.

---

## 📤 Your data, your control

- Stored locally in `localStorage` — nothing is uploaded except AI prompts.
- Export everything to JSON, import it back, or clear it all from **Settings**.

---

## 📜 License

MIT

## 👤 Author

**Yogesh Gurjar**
