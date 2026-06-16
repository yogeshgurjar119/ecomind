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
carbon_footprint/
├── .env.example          # copy to .env and add your key
├── .gitignore
├── package.json
├── server.js             # Express server + NVIDIA proxy (reads .env)
├── README.md
└── public/
    ├── index.html        # app shell
    ├── assets/
    │   ├── favicon.svg    # built-in CO₂ footprint mark
    │   └── logo.png       # ← drop your logo image here
    ├── css/
    │   └── styles.css
    └── js/
        ├── config.js     # emission factors, country factors, constants
        ├── storage.js    # localStorage helpers
        ├── utils.js      # date / CO₂ / stats / format helpers
        ├── api.js        # client for the local /api proxy
        ├── ui.js         # toasts, tabs, loading state
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
