import type { ClientUserAddress, ClientUserPhoto } from "@/types/client-user";

// Response shape from the Admin API's GET /users and GET /users/{uuid}
// (User schema) — a read-only lookup into end-user accounts, distinct from
// the Administrator resource. `citizenship` and the unmasked contacts are
// only populated on the show response; the list masks contact PII. Shares its
// photo/address shapes with ClientUserProfile since both describe the same
// underlying user record.
export type AdminUser = {
  uuid: string;
  email: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix_name: string | null;
  company_name: string | null;
  display_name: string;
  mobile_number: string | null;
  birth_date: string | null;
  gender: string | null;
  citizenship: { code: string; name: string } | null;
  address: ClientUserAddress | null;
  photo: ClientUserPhoto | null;
  // `draft` | `completed`; loose so an unknown value renders rather than
  // throws (see modules/users/lib/user-status-label.ts).
  status: string | null;
  profile_completed_at?: string | null;
  is_active: 0 | 1;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
