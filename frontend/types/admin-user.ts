import type {
  ClientAccountType,
  ClientUserAddress,
  ClientUserPhoto,
} from "@/types/client-user";
import type { GatewayCredits } from "@/types/gateway-log";

// Loose "who did this" reference on assessment/approval fields — the Admin
// API's OpenAPI doc declares these as a bare `"type": "object"` with no
// property schema or example, so the exact shape (id/name vs uuid/name etc.)
// isn't documented; treat as opaque and only read fields defensively.
export type AdminUserAssessor = Record<string, unknown> | null;

// Response shape from the Admin API's GET /users and GET /users/{uuid}
// (User schema) — a read-only lookup into portal end-user accounts, distinct
// from the Administrator resource (uuid-keyed). `citizenship` and the
// `*_by` assessor fields are only populated on the show response; the list
// response omits them. Mutated via POST /users/{uuid}/toggle-assessment,
// /approve, /reject (modules/users/actions/user-actions.ts) — status
// transitions draft -> for_assessment (citizen-initiated, see
// modules/client-auth) -> approved | rejected (admin-initiated). Shares its
// photo/address shapes with ClientUserProfile since both describe the same
// underlying portal user record.
export type AdminUser = {
  uuid: string;
  email: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix_name: string | null;
  company_name: string | null;
  display_name: string;
  // Which contact channel the account registered/authenticates with.
  authentication_channel?: "email" | "sms" | null;
  mobile_number: string | null;
  birth_date: string | null;
  gender: string | null;
  citizenship: { code: string; name: string } | null;
  address: ClientUserAddress | null;
  photo: ClientUserPhoto | null;
  status: string | null;
  // basic | developer. Developer is granted only by approval and lost on
  // demotion or suspension.
  type?: ClientAccountType;
  profile_completed_at?: string | null;
  // Set when the account was suspended. The REASON is not a field: it is the
  // newest "[Suspended YYYY-MM-DD] …" line of assessment_remarks.
  suspended_at?: string | null;
  is_active: 0 | 1;
  // Whether ANY admin currently owns this user's assessment — required
  // before approve/reject are allowed (see /toggle-assessment's doc:
  // "Claims the assessment if unclaimed, releases it if you own it. The
  // user must be `for_assessment`.").
  is_assessment_started: 0 | 1;
  assessment_started_by: AdminUserAssessor;
  // Bare id of the claiming admin — on the LIST too (unlike the object
  // above), so the table can hide claim-gated actions for non-owners.
  // Optional: absent on backend builds predating egov-api-ws#285.
  assessment_started_by_id?: number | null;
  assessment_started_at: string | null;
  // Set by POST /users/{uuid}/reject — the reason shown back to the citizen.
  assessment_remarks: string | null;
  approved_by: AdminUserAssessor;
  approved_at: string | null;
  // The citizen's partner-gateway usage allowances — a LIST since 2026-08-24,
  // one entry per API catalog, not a single shared balance. Present on the
  // show (GET /users/{uuid}) and on the top-up response (PATCH
  // .../gateway-quota), which both load the quota relation — never on the
  // list, which is why TopUpQuotaModal fetches the user when it opens.
  credits?: GatewayCredits;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
