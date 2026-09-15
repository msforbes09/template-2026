// Decides whether a URL-driven filter box should adopt the value now in the URL.
//
// Extracted from SearchFilterInput / LogFilterInput because it is the whole
// bug in one expression, and it is easy to get subtly wrong in either
// direction:
//
//   - Adopt too eagerly and the box fights the typist. Every keystroke pushes a
//     debounced value into the URL, which echoes back a beat later; adopting
//     that echo rewinds "juan" to the "ju" that was in flight.
//   - Adopt too rarely — which is what an uncontrolled `defaultValue` does, it
//     reads the URL exactly once — and the box keeps a term the list is no
//     longer filtered by, because something changed the query without
//     unmounting the toolbar (a sidebar status link that drops `q`, a "clear
//     filters" button, the back button).
//
// The rule: adopt when the URL has moved since we last looked, UNLESS it moved
// to the value we ourselves just pushed.
export function syncFilterText(
  // The value now in the URL.
  urlValue: string,
  // The URL value at the last render we reconciled.
  seen: string,
  // The last value this input pushed into the URL.
  lastPushed: string,
): { changed: boolean; adopt: boolean } {
  const changed = urlValue !== seen;
  return { changed, adopt: changed && urlValue !== lastPushed };
}
