import assert from 'node:assert/strict';
import test from 'node:test';

function node() {
  const attributes = new Map(); const classes = new Set(); const handlers = new Map();
  return { dataset: {}, hidden: true, handlers,
    classList: { toggle(name, value) { if (value) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); } },
    setAttribute(name, value) { attributes.set(name, String(value)); }, getAttribute(name) { return attributes.get(name); },
    addEventListener(name, callback) { handlers.set(name, [...(handlers.get(name) || []), callback]); },
    click() { for (const callback of handlers.get('click') || []) callback(); },
  };
}
test('duplicate module URLs and explicit reinitialization bind each shell control once', async () => {
  const priorDocument = globalThis.document;
  const catalogButton = node(), catalogPanel = node(), searchButton = node(), searchRegion = node(), root = node(), mobile = node();
  let focusCount = 0;
  catalogButton.querySelector = () => ({ textContent: '' });
  searchRegion.querySelector = () => ({ focus() { focusCount++; } });
  const nodes = new Map([['[data-catalog-toggle]', catalogButton], ['[data-catalog-panel]', catalogPanel], ['[data-search-toggle]', searchButton], ['[data-search-region]', searchRegion], ['.mobile-home', mobile]]);
  globalThis.document = { querySelector: selector => nodes.get(selector), documentElement: root };
  try {
    const first = await import('../v3/js/shell.js?acceptance-first');
    await import('../v3/js/shell.js?acceptance-second');
    first.initShell();
    assert.equal(searchButton.handlers.get('click').length, 1);
    assert.equal(catalogButton.handlers.get('click').length, 1);
    searchButton.click();
    assert.equal(searchRegion.hidden, false);
    assert.equal(searchButton.getAttribute('aria-expanded'), 'true');
    assert.equal(focusCount, 1);
    searchButton.click();
    assert.equal(searchRegion.hidden, true);
    catalogButton.click();
    assert.equal(catalogPanel.classList.contains('is-open'), true);
    assert.equal(catalogButton.getAttribute('aria-expanded'), 'true');
    catalogButton.click();
    assert.equal(catalogPanel.classList.contains('is-open'), false);
  } finally { globalThis.document = priorDocument; }
});
