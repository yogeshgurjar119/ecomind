/**
 * Decorative side rails for wide screens.
 *
 * The app is a centred 1100px column, leaving empty gutters left and right
 * on large monitors. This fills that space with slowly-rising, fading
 * carbon-related formulas — a subtle "lab notebook" ambiance behind the UI.
 *
 * Purely decorative: aria-hidden, pointer-events:none, hidden on smaller
 * screens, and frozen for users who prefer reduced motion (see styles.css).
 */

// Trusted static strings (may include simple markup like <sub>/<small>).
const FORMULAS = [
  'CO<sub>2</sub> = D × EF',
  'E = Σ Q<sub>i</sub>·EF<sub>i</sub>',
  't = kg ÷ 1000',
  'annual = daily × 365',
  'elec = kWh × grid',
  'petrol → 0.171<small>kg/km</small>',
  'beef → 6.61<small>kg</small>',
  'train → 0.041<small>kg/km</small>',
  '🌳 ≈ 21<small>kg/yr</small>',
  'milk 1L → 3.15<small>kg</small>',
  'Δ = you − goal',
  'O = C = O',
  'veg → 0.28<small>kg</small>',
  'flight → 0.25<small>kg/km</small>',
];

// Mix of flow directions — mostly rising (like bubbles), with sway, diagonal
// drift and the occasional falling chip for variety.
const DIRS = ['up', 'sway', 'diag', 'up', 'down', 'sway', 'up', 'diag'];

// Wavy "current" lines that flow behind the formulas.
function buildFlow() {
  return `<svg class="amb-flow" viewBox="0 0 170 1000" preserveAspectRatio="none" aria-hidden="true">
      <path class="flow-line a" d="M55 -20 C90 100 20 200 55 320 C90 440 20 540 55 660 C90 780 20 880 55 1020"/>
      <path class="flow-line b" d="M115 -20 C80 110 150 210 115 330 C80 450 150 550 115 670 C80 790 150 890 115 1020"/>
    </svg>`;
}

function fill(rail, seed) {
  const n = FORMULAS.length;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span');
    const dir = DIRS[(i + seed) % DIRS.length];
    el.className = `amb-formula ${dir}`;
    el.innerHTML = FORMULAS[(i + seed * 3) % n];

    const dur = 22 + ((i * 5 + seed * 7) % 16); // 22–38s travel
    const delay = -((i * dur) / n).toFixed(1); // stagger across the column
    const left = 6 + ((i * 23 + seed * 13) % 46); // px from the outer edge
    const size = 12 + ((i + seed) % 3); // 12–14px
    const peak = (0.32 + (((i * 7 + seed * 5) % 30) / 100)).toFixed(2); // 0.32–0.61
    el.style.cssText =
      `left:${left}px;font-size:${size}px;--peak:${peak};` +
      `animation-duration:${dur}s;animation-delay:${delay}s;`;
    rail.appendChild(el);
  }
}

export function initAmbience() {
  if (document.getElementById('ambience')) return; // run once
  const wrap = document.createElement('div');
  wrap.id = 'ambience';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<div class="amb-rail left"></div><div class="amb-rail right"></div>';
  document.body.appendChild(wrap);

  [
    [wrap.querySelector('.amb-rail.left'), 0],
    [wrap.querySelector('.amb-rail.right'), 1],
  ].forEach(([rail, seed]) => {
    rail.innerHTML = buildFlow(); // flow lines first → behind the chips
    fill(rail, seed);
  });
}
