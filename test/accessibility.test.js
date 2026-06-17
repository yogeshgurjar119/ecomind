/**
 * Accessibility regression tests for the static shell (index.html).
 * These guard the structural ARIA that the audit added so it can't silently
 * regress: the tabs pattern, skip link, focusable main, and live regions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('document declares a language', () => {
  assert.match(html, /<html[^>]*\blang="en"/);
});

test('a skip-to-content link targets the main region', () => {
  assert.match(html, /class="skip-link"[^>]*href="#app-main"/);
  assert.match(html, /<main id="app-main"[^>]*tabindex="-1"/);
});

test('navigation uses the ARIA tabs pattern', () => {
  assert.match(html, /role="tablist"/);
  // five tabs, each with aria-selected and aria-controls
  assert.equal((html.match(/role="tab"/g) || []).length, 5);
  assert.equal((html.match(/aria-selected=/g) || []).length, 5);
  assert.equal((html.match(/aria-controls="tab-/g) || []).length, 5);
});

test('each panel is a labelled tabpanel', () => {
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 5);
  assert.equal((html.match(/aria-labelledby="tab-btn-/g) || []).length, 5);
});

test('toasts use separate polite and assertive live regions', () => {
  assert.match(html, /id="toast-polite"[^>]*aria-live="polite"/);
  assert.match(html, /id="toast-assertive"[^>]*aria-live="assertive"/);
});

test('decorative nav icons are hidden from assistive tech', () => {
  // every Tabler icon in the shell is marked aria-hidden
  const icons = html.match(/<i class="ti [^>]*>/g) || [];
  assert.ok(icons.length > 0);
  for (const i of icons) assert.match(i, /aria-hidden="true"/);
});
