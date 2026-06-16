/**
 * Shared UI helpers: toasts, tab switching, button loading state.
 */

const tabRenderers = {};

/** Register a render function fired whenever a tab becomes active. */
export function registerTab(name, renderFn) {
  tabRenderers[name] = renderFn;
}

export function showTab(name) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById(`tab-${name}`)?.classList.remove('hidden');

  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
  });

  tabRenderers[name]?.();
}

export function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon =
    type === 'error' ? 'ti-alert-circle' : type === 'warning' ? 'ti-alert-triangle' : 'ti-check';
  el.innerHTML = `<i class="ti ${icon}"></i><span></span>`;
  el.querySelector('span').textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

/** Toggle a button into a spinner + disabled state. */
export function setLoading(btn, isLoading, idleHTML) {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.idle = idleHTML ?? btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Working…`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.idle ?? idleHTML ?? btn.innerHTML;
  }
}

export function shake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth; // restart animation
  el.classList.add('shake');
}
