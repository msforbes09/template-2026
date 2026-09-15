export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      message: string;
      errors: Record<string, string[]>;
      // The API's machine-readable `error` slug (ApiError.code), when the
      // failure carries one — e.g. "review_already_exists", "invalid_status",
      // "assessment_not_owned". Optional because most actions don't branch on
      // it and pass only the message through; a caller that needs to react to
      // a specific failure keys on this rather than on the HTTP status, which
      // is shared by every business error the API returns.
      code?: string;
      // The API's `meta` block, when the failure carries one. Business errors
      // put their structured detail here rather than in the message —
      // `profile_incomplete` names the empty fields in `meta.missing[]`, and
      // `profile_change_cooldown` returns `meta.next_change_at`. Optional,
      // because most failures have nothing structured to add.
      meta?: Record<string, unknown>;
    };
