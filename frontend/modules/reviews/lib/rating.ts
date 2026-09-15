// `rating_avg` is 0 for an unreviewed project, so the average alone cannot
// tell "nobody has rated this" from "everybody rated it zero" (which is not
// even possible — the scale starts at 1). `rating_count` is the field that
// decides whether there is anything to show.
//
// Both are read defensively: the backend that computes them is merged but not
// yet deployed, so an older API omits them entirely and every call site would
// otherwise render "0" stars on projects that simply have no ratings yet.
export type Rateable = { rating_avg?: number; rating_count?: number };

export function hasRating(project: Rateable): boolean {
  return (project.rating_count ?? 0) > 0;
}

export function ratingCount(project: Rateable): number {
  return project.rating_count ?? 0;
}

// One decimal is what a five-point scale can honestly carry ("4.5"), even
// though the API sends two.
export function ratingAverage(project: Rateable): number {
  return Math.round((project.rating_avg ?? 0) * 10) / 10;
}

export function formatRating(project: Rateable): string {
  return ratingAverage(project).toFixed(1);
}

// How much of each of the five stars is filled, as a 0..1 fraction, so a 4.5
// renders as four solid stars and one half. Clamped because a malformed
// average must not produce a sixth star or a negative width.
export function starFills(average: number, stars = 5): number[] {
  const clamped = Math.min(Math.max(average, 0), stars);
  return Array.from({ length: stars }, (_, index) => {
    const fill = Math.min(Math.max(clamped - index, 0), 1);
    // Rounded because the subtraction carries binary float noise (2.3 - 2 is
    // 0.2999999999999998) and this becomes a CSS width. Two decimals is finer
    // than a star is wide.
    return Math.round(fill * 100) / 100;
  });
}

// The accessible name for a rating, since the stars themselves are decorative.
export function ratingLabel(project: Rateable): string {
  const count = ratingCount(project);
  if (count === 0) return "No ratings yet";
  return `Rated ${formatRating(project)} out of 5, from ${count} ${count === 1 ? "review" : "reviews"}`;
}

// A review carries no "edited" flag: the handoff's rule is that it was edited
// iff updated_at is later than created_at. Both are the API's fixed
// `Y-m-d H:i:s`, which is zero-padded and big-endian, so string order IS
// chronological order — no parsing, and no timezone to get wrong.
export function wasEdited(createdAt: string, updatedAt: string): boolean {
  if (!createdAt || !updatedAt) return false;
  return updatedAt > createdAt;
}

// The per-star histogram, ordered 5 down to 1 the way people read it, with
// each bar's width as a fraction of the most common rating rather than of the
// total: scaling to the total makes every bar short as soon as the votes
// spread out, which reads as "few reviews" instead of "mixed reviews".
export type BreakdownRow = { stars: number; count: number; fraction: number };

export function breakdownRows(
  breakdown: Partial<Record<"1" | "2" | "3" | "4" | "5", number>> | undefined,
): BreakdownRow[] {
  const counts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: breakdown?.[String(stars) as "1" | "2" | "3" | "4" | "5"] ?? 0,
  }));
  const peak = Math.max(...counts.map((row) => row.count), 0);
  return counts.map((row) => ({
    ...row,
    fraction: peak > 0 ? Math.round((row.count / peak) * 100) / 100 : 0,
  }));
}

export function breakdownTotal(
  breakdown: Partial<Record<"1" | "2" | "3" | "4" | "5", number>> | undefined,
): number {
  return breakdownRows(breakdown).reduce((sum, row) => sum + row.count, 0);
}
