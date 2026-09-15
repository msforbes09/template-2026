import type { GatewayCredits } from "@/types/gateway-log";

// Response shape from the User API's GET /profile and POST /logout
// (UserProfile schema).
export type ClientUserPhoto = {
  uuid: string;
  url: string | null;
  original_name: string | null;
  mime_type: string | null;
  size: number | null;
};

// A named region/division reference (address components), e.g.
// { code: "1300000000", name: "National Capital Region (NCR)" }.
export type ClientUserAddressPart = { code: string; name: string } | null;

export type ClientUserAddress = {
  country: ClientUserAddressPart;
  region: ClientUserAddressPart;
  province: ClientUserAddressPart;
  municipality: ClientUserAddressPart;
  barangay: ClientUserAddressPart;
  line_one: string | null;
  line_two: string | null;
  postal_code: string | null;
};

// Response shape from the User API's GET /egov/test-accounts — public shape
// of an eGov test account usable with generate-exchange-code (email + name
// only; the backing uniqid is never exposed).
export type EgovTestAccount = {
  email: string;
  name: string;
};

export type ClientAccountType = "basic" | "developer";

export type ClientUserProfile = {
  // Public id — the internal numeric id is never exposed. Also the citizen's
  // private broadcast channel key: `private-user.{uuid}` (see
  // modules/gateway-logs/lib/use-gateway-log-feed.ts).
  uuid: string;
  email: string | null;
  // Addable/verifiable via /add-contact + /verify-contact when null — a
  // citizen always has exactly one of email/mobile_number set (whichever
  // they registered with) and can add the other as a secondary contact.
  mobile_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix_name: string | null;
  company_name: string | null;
  display_name: string;
  birth_date: string | null;
  gender: string | null;
  citizenship: ClientUserAddressPart;
  // Where the account sits in its lifecycle. A closed set now — see
  // modules/client-auth/lib/account.ts for what each one permits.
  //
  // Kept as `string | null` rather than the union so an unrecognised value
  // from an older or newer backend degrades to "unknown" instead of throwing;
  // accountStatus() narrows it at the one place that cares.
  //
  // Approval status. Known values: "pending" (eGovPH-authenticated citizen
  // awaiting kiosk activation — see AccountActivationModal), "draft" and
  // "for_assessment" (self-registered citizen — see modules/client-auth's
  // CompleteProfileWizard), plus presumably an approved/active state once an
  // admin reviews a "for_assessment" account. Not a closed enum in the API
  // docs, hence the loose string type.
  status: string | null;
  // Why a "for_assessment" submission was rejected — set by an admin,
  // shown to the citizen so they know what to fix and resubmit.
  assessment_remarks: string | null;
  address: ClientUserAddress | null;
  photo: ClientUserPhoto | null;
  // Set once the account's API credentials have been generated (the backend
  // endpoint is allowed once ever).
  credentials_generated_at: string | null;
  // The citizen's partner-gateway usage allowances. Pools are created lazily
  // on first read, so the API returns them without the frontend initializing
  // anything — optional here only so an older backend build (which predates
  // the credits block) doesn't have to typecheck as a lie.
  //
  // BREAKING as of 2026-08-21: omitted for every account that is not an
  // approved developer. Absent now means "no allowance", not "old backend".
  //
  // BREAKING as of 2026-08-24: a LIST, one entry per API catalog, not a single
  // shared balance. An empty array is therefore truthy — check `.length`.
  // How many ACTIVE gateway credentials the account holds, one per catalog it
  // has minted a key for. Always sent by the API; optional here so the UI is
  // correct against a backend predating the field — an absent count says
  // nothing rather than implying "none".
  credentials_count?: number;
  credits?: GatewayCredits;

  // basic = may review once the profile is complete. developer = that plus
  // API credentials and creating projects, granted only by admin approval and
  // lost on demotion or suspension.
  type?: ClientAccountType;
  // Stamped by POST /profile/complete. Completion unlocks reviewing and
  // starts both edit-cooldown clocks.
  profile_completed_at?: string | null;
  // When the 30-day edit cooldowns lift. null means editable right now.
  // Details and photo run on SEPARATE clocks, which is why there are two.
  // Never computed on the frontend — the API is the authority.
  details_editable_at?: string | null;
  photo_editable_at?: string | null;
  last_login_at: string | null;
};
