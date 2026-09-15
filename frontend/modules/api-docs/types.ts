// Postman Collection Format v2.1 — the subset this viewer renders.
// Kept deliberately looser than the official schema where real exports
// diverge from it (e.g. header values arrive as numbers, previewlanguage
// is null), so a valid-in-practice export never fails to render.

export type PostmanDescription = string | { content?: string; type?: string } | null;

export type PostmanVariable = {
  id?: string;
  key?: string;
  value?: unknown;
  type?: string;
  name?: string;
  description?: PostmanDescription;
  disabled?: boolean;
};

export type PostmanQueryParam = {
  key?: string | null;
  value?: string | null;
  disabled?: boolean;
  description?: PostmanDescription;
};

export type PostmanUrl =
  | string
  | {
      raw?: string;
      protocol?: string;
      host?: string | string[];
      path?: string | (string | { type?: string; value?: string })[];
      port?: string;
      query?: PostmanQueryParam[];
      variable?: PostmanVariable[];
      hash?: string;
    };

export type PostmanHeader = {
  key: string;
  value: string | number;
  disabled?: boolean;
  description?: PostmanDescription;
};

export type PostmanAuthAttribute = { key: string; value?: unknown; type?: string };

export type PostmanAuth = {
  type: string;
} & Record<string, PostmanAuthAttribute[] | string | undefined>;

export type PostmanBody = {
  mode?: "raw" | "urlencoded" | "formdata" | "file" | "graphql";
  raw?: string;
  urlencoded?: {
    key: string;
    value?: string;
    disabled?: boolean;
    description?: PostmanDescription;
  }[];
  formdata?: {
    key: string;
    value?: string;
    src?: unknown;
    type?: string;
    disabled?: boolean;
    description?: PostmanDescription;
  }[];
  graphql?: { query?: string; variables?: string };
  options?: unknown;
  disabled?: boolean;
} | null;

export type PostmanRequest =
  | string
  | {
      method?: string;
      url?: PostmanUrl;
      header?: PostmanHeader[] | string;
      body?: PostmanBody;
      auth?: PostmanAuth | null;
      description?: PostmanDescription;
    };

export type PostmanResponse = {
  id?: string;
  name?: string;
  status?: string;
  code?: number;
  header?: (PostmanHeader | string)[] | string | null;
  body?: string | null;
  originalRequest?: PostmanRequest;
};

export type PostmanItem = {
  id?: string;
  name?: string;
  description?: PostmanDescription;
  request: PostmanRequest;
  response?: PostmanResponse[];
};

export type PostmanItemGroup = {
  name?: string;
  description?: PostmanDescription;
  item: (PostmanItem | PostmanItemGroup)[];
  auth?: PostmanAuth | null;
};

export type PostmanCollection = {
  info: {
    name: string;
    _postman_id?: string;
    description?: PostmanDescription;
    schema: string;
    version?: unknown;
  };
  item: (PostmanItem | PostmanItemGroup)[];
  variable?: PostmanVariable[];
  auth?: PostmanAuth | null;
};
