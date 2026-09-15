# Accessibility

Read when building any interactive component (combobox, modal/dialog, toast, confirm, data table, menus) or when a request mentions a11y, keyboard, screen reader, or focus. Practical rules below; these are house rules, not a formal audit checklist.

## Core principle: don't strip what shadcn/Base UI gives you

shadcn components are built on Base UI primitives that already handle most of the hard parts — focus trap and restore, `aria-modal`, `role` wiring, escape-to-close, arrow-key navigation, `aria-live` regions. **The default failure mode is breaking that, not lacking it.** So:

- Don't replace a shadcn `Dialog`/`Combobox`/`Toast` with a hand-rolled `div` — you lose the built-in a11y.
- Don't remove focus rings, `aria-*` props, or the visually-hidden labels these components ship with.
- Do supply the parts only you can know: **accessible names** (labels, `aria-label`), loading/empty announcements, and correct heading/landmark structure.

## Per-component rules

**Combobox / autocomplete** (the async `useSWR` one in `data-fetching.md`):
- The input needs an accessible name (`aria-label` or a visible `<label>`).
- Convey loading and result state to screen readers, not just visually — the listbox region should be an `aria-live="polite"` area (or use the shadcn Command component, which wires `role="listbox"`/`role="option"` and `aria-expanded` for you). Announce "no matches" / "searching" as text, not only a spinner.
- Keyboard: up/down moves options, Enter selects, Escape closes — Base UI's Command handles this; don't intercept those keys.

**Modal / dialog** (`modals.md`):
- Every modal needs an accessible title wired to the dialog (shadcn `DialogTitle` does this via `aria-labelledby`); if the title is visual-only, still render `DialogTitle` (visually hidden if needed) so the dialog is named.
- Focus must move into the dialog on open and return to the trigger on close — Base UI does this; don't disable it. Don't set `autoFocus` on a destructive control.
- The loading **skeleton inside the modal must keep the dialog's accessible name** present while content streams (the title is on the shell, not the body, so this is automatic with the `ResourceModal` pattern).

**Toast** (mounted in the root layout, `structure.md`):
- Toasts must be in an `aria-live` region so they're announced without stealing focus — the shadcn `Toaster` provides this. Use `role="status"`/`aria-live="polite"` for success/info and `aria-live="assertive"` only for errors that need immediate attention.
- Never put the only copy of critical information in a toast that auto-dismisses; give an alternative (inline error, the `FormRootError`).

**Confirm dialog** (`ConfirmDialog`, `ui-primitives.md`):
- It's a dialog — same naming/focus rules. The destructive action should be clearly labeled ("Delete user", not "OK"); don't auto-focus it.

**Data table** (`DataTable`):
- Use real `<table>` semantics (TanStack + shadcn render a semantic table). Icon-only row actions need `aria-label` ("Edit user", "Delete user"). Sortable headers should expose sort state (`aria-sort`).
- Pagination controls are buttons with labels ("Previous page", "Next page") and a disabled state at the bounds — see the pagination component in `crud-blueprint.md`.

## Baseline (every page)

- **One `<h1>` per page**, headings in order (don't skip levels for styling). Use the visually-hidden `<h1 className="sr-only">` pattern when the design has no visible title.
- **Landmarks:** one `<main>`, plus `<nav>`/`<header>`/`<footer>` and `aria-label` on `<section>`s used as regions (as in the dashboard slots).
- **Images** have `alt` (empty `alt=""` for purely decorative ones); **icon-only buttons** have `aria-label`.
- **Visible focus:** never remove focus outlines without replacing them — keep a `focus-visible` style on all interactive elements.
- **Color isn't the only signal** — pair color with text/icon for status (`StatusBadge` should have a label, not just a hue).
- **Reduced motion:** gate non-essential animation behind `prefers-reduced-motion` (Tailwind's `motion-reduce:` variants).
- **Forms:** `AppFormField` already associates label, hint, and error to the input — keep using it so every field is programmatically labeled and errors are announced.

> Quick check before shipping an interactive feature: can you reach and operate it with the keyboard alone, does each control have a name a screen reader would read, and does state (loading, selected, error, sort) reach assistive tech as text — not only as a visual cue?
