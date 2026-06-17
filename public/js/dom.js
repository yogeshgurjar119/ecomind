/**
 * Tiny DOM helpers shared across all views, so each module doesn't
 * redefine its own. Keeps view code focused on rendering, not plumbing.
 */

/** querySelector shorthand, optionally scoped to a root element. */
export const $ = (sel, root = document) => root.querySelector(sel);

/**
 * Standard empty-state block used by panels with no data yet.
 * `icon` is a Tabler icon class; `msg` is trusted UI copy (not user input).
 */
export function emptyState(icon, msg) {
  return `<div class="empty-state"><i class="ti ${icon}" aria-hidden="true"></i><p>${msg}</p></div>`;
}
