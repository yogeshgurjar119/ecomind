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

  // Reflect the selected tab programmatically (ARIA tabs pattern), not just
  // visually, and keep a roving tabindex so only the active tab is tabbable.
  document.querySelectorAll('.tab-btn').forEach((b) => {
    const selected = b.dataset.tab === name;
    b.classList.toggle('active', selected);
    b.setAttribute('aria-selected', selected ? 'true' : 'false');
    b.tabIndex = selected ? 0 : -1;
  });

  tabRenderers[name]?.();
}

export function showToast(msg, type = 'success') {
  // Errors go to the assertive live region (announced immediately); other
  // statuses go to the polite one so they don't interrupt the user.
  const container = document.getElementById(
    type === 'error' ? 'toast-assertive' : 'toast-polite'
  );
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon =
    type === 'error' ? 'ti-alert-circle' : type === 'warning' ? 'ti-alert-triangle' : 'ti-check';
  el.innerHTML = `<i class="ti ${icon}" aria-hidden="true"></i><span></span>`;
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
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Working…`;
  } else {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.innerHTML = btn.dataset.idle ?? idleHTML ?? btn.innerHTML;
  }
}

export function shake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth; // restart animation
  el.classList.add('shake');
}
