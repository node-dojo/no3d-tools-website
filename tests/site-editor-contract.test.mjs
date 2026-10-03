import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const load = path => readFile(new URL(path, root), 'utf8');

test('Site Editor is opt-in and uses the existing product renderer', async () => {
  const [product, editor] = await Promise.all([load('v3/js/product.js'), load('v3/js/site-editor.js')]);
  assert.match(product, /get\('edit'\) === '1'/);
  assert.match(product, /import\('\.\/site-editor\.js/);
  assert.doesNotMatch(editor, /data-product-title[^\n]*replaceWith|product-layout[^\n]*replaceWith/);
});

test('idle content has no editor decorations and persistent state stays detached', async () => {
  const [editor, styles] = await Promise.all([load('v3/js/site-editor.js'), load('v3/styles/v3.css')]);
  assert.match(editor, /is-minimized/);
  assert.match(editor, /contenteditable', 'plaintext-only'/);
  assert.match(editor, /removeAttribute\('contenteditable'\)/);
  assert.match(styles, /\.solvet-site-editor\{position:fixed/);
  assert.match(styles, /\[data-product-lede\]\[contenteditable\]\{outline:0;background:inherit/);
  assert.doesNotMatch(styles, /\[data-product-lede\](?!\[contenteditable\])[^{}]*\{[^}]*outline/);
});

test('the floating utility is minimizable and mobile-safe without changing breakpoints', async () => {
  const [editor, styles] = await Promise.all([load('v3/js/site-editor.js'), load('v3/styles/v3.css')]);
  assert.match(editor, /data-editor-minimize/);
  assert.match(editor, /setExpanded\(ui, false\)/);
  assert.match(styles, /env\(safe-area-inset-right\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /@media\(max-width:650px\)\{\.solvet-site-editor/);
});
