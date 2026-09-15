import { CodeBlock } from "@/modules/api-docs/components/code-block";

// The read-only detail primitives every log viewer's modal body is built
// from — a labelled field, the grid they sit in, and a JSON blob block.
// Promoted out of modules/gateway-logs once connection, auth-attempt and
// audit details needed exactly the same treatment.

export function DetailField({
  label,
  children,
  span,
}: {
  label: string;
  children: React.ReactNode;
  // Lets a long value (a URL, a user agent) take the full width instead of
  // wrapping awkwardly inside a half-width cell.
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2 min-w-0" : "min-w-0"}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}

export function DetailGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>;
}

// Anything the API can send as a JSON object or array. Already masked
// server-side, so these render verbatim.
type Blob = Record<string, unknown> | unknown[] | null;

// An empty object/array is what the API sends for "nothing recorded" — the
// section is dropped rather than showing an empty `{}` block.
export function hasContent(blob: Blob): boolean {
  if (blob == null) return false;
  return Array.isArray(blob) ? blob.length > 0 : Object.keys(blob).length > 0;
}

export function JsonSection({ label, blob }: { label: string; blob: Blob }) {
  if (!hasContent(blob)) return null;
  return <CodeBlock label={label} code={JSON.stringify(blob, null, 2)} />;
}

// Renders an error/exception string as an alert. Shared because all four log
// types carry an optional failure message in the same shape.
export function ExceptionNotice({ exception }: { exception: string | null }) {
  if (!exception) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs break-words text-destructive"
    >
      {exception}
    </div>
  );
}
