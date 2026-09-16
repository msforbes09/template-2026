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

export type ClientUserProfile = {
  // Public id — the internal numeric id is never exposed. Also the user's
  // private broadcast channel key: `private-user.{uuid}`.
  uuid: string;
  email: string | null;
  // A plain contact field edited on the profile form — never verified.
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
  // Where the account sits in its lifecycle: `draft` until the profile is
  // marked complete, then `completed`.
  //
  // Kept as `string | null` rather than the union so an unrecognised value
  // from an older or newer backend degrades to "unknown" instead of throwing;
  // accountStatus() narrows it at the one place that cares.
  status: string | null;
  address: ClientUserAddress | null;
  photo: ClientUserPhoto | null;
  // Stamped by POST /profile/complete. Completion starts both edit-cooldown
  // clocks.
  profile_completed_at?: string | null;
  // When the 30-day edit cooldowns lift. null means editable right now.
  // Details and photo run on SEPARATE clocks, which is why there are two.
  // Never computed on the frontend — the API is the authority.
  details_editable_at?: string | null;
  photo_editable_at?: string | null;
  last_login_at: string | null;
  // The server's sliding session window. IdleSessionWatcher counts
  // `session_inactivity_minutes` down from the render that read it;
  // `token_expires_at` is informational (API timezone).
  session_inactivity_minutes?: number;
  token_expires_at?: string | null;
};
