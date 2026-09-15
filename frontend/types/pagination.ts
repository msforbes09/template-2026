// Laravel's standard paginator envelope, returned by `->paginate()` list
// endpoints (as opposed to the plain `{ data: [...] }` most of this API's
// list endpoints return). `from`/`to` are null on an empty page.
export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type PaginationLinks = {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
};

export type Paginated<T> = {
  data: T[];
  links: PaginationLinks;
  meta: PaginationMeta;
};
