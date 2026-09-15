// Shared list-item shape for the Common API's PSGC reference endpoints
// (/regions, /provinces, /municipalities, /barangays) and /countries — every
// resource returns at least `code`/`name`; countries' extra fields
// (alpha_3_code, nationality) aren't needed by the picker.
export type PsgcOption = { code: string; name: string };
