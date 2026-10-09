/**
 * Test env shims for CodeMirror under jsdom.
 *
 * jsdom has no layout engine, so the geometry APIs CodeMirror uses to measure
 * text return nothing or are missing entirely. Without these stubs, CodeMirror's
 * DOMObserver throws from a requestAnimationFrame callback after a test has
 * unmounted its editor (and after the jsdom window is torn down).
 */

if (typeof globalThis.document === 'undefined' && typeof window !== 'undefined') {
  globalThis.document = window.document;
}

const emptyRect = () => ({
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  toJSON() {},
});

const emptyRectList = () => ({
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* iterate() {},
});

if (typeof Element !== 'undefined') {
  if (!Element.prototype.getClientRects) {
    Element.prototype.getClientRects = emptyRectList;
  }
  if (!Element.prototype.getBoundingClientRect) {
    Element.prototype.getBoundingClientRect = emptyRect;
  }
}

if (typeof Range !== 'undefined') {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = emptyRectList;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = emptyRect;
  }
}
