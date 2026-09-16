// body is keyed by locale (e.g. "en"); only "en" is documented/exercised by
// the admin API today, but the shape stays locale-keyed to match the wire format.
export type ContentBody = Record<string, string>;

export type ContentMeta = { title?: string } | null;

export type Content = {
  id: number;
  identifier: string;
  body: ContentBody;
  meta: ContentMeta;
  created_at: string | null;
  updated_at: string | null;
};
