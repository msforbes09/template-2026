/**
 * Card treatment for admin console surfaces.
 *
 * Mirrors the landing hero mockup's crisp, hairline-bordered cards
 * (`border border-border`) instead of the shared Card primitive's default
 * soft `ring-1 ring-foreground/10`. Applied per–call site via
 * `<Card className={consoleCardClassName}>`, so the shared primitive — and
 * every non-admin surface that uses it — stays untouched.
 *
 * `ring-0` cancels the primitive's ring (tailwind-merge keeps the last ring
 * width in the merged class list), leaving only the border.
 */
export const consoleCardClassName = "border border-border ring-0";
