import type { Role } from "@/types/access-control";
import type { UploadedFile } from "@/types/upload";

export type Administrator = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  photo: UploadedFile | null;
  is_active: 0 | 1;
  with_temporary_password: 0 | 1;
  last_login_at: string | null;
  // Password lifetime — returned by GET /profile only. `password_expires_at`
  // is null when ADMIN_PASSWORD_EXPIRY_DAYS is 0 on the backend;
  // `password_expiry_waives_remaining` counts the "remind me later"s left
  // before the console gates the admin behind a forced change.
  password_changed_at?: string | null;
  password_expires_at?: string | null;
  is_password_expired?: 0 | 1;
  password_expiry_waives_remaining?: number;
  auth_validated: string | null;
  created_at: string | null;
  updated_at: string | null;
  // The signed-in admin's own permission names, flat (e.g.
  // ["users-view", "gateway-logs-view"]) — returned by GET /profile only,
  // never by the administrators list/show, which return `roles` instead.
  // It's a snapshot of the token's abilities taken at login, so a role change
  // only lands after the admin signs in again (the backend deletes their
  // tokens on a role sync to force exactly that). See adminCan().
  permissions?: string[];
  // Returned by the administrators list/show, not by GET /profile.
  roles: Role[];
};
