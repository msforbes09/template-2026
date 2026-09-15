export type Permission = {
  id: number;
  name: string;
  group_id: number | null;
};

export type PermissionGroup = {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
};

export type Role = {
  id: number;
  name: string;
  description: string | null;
  // List endpoint only (whenCounted on the WS): administrators holding the
  // role — deleted admins excluded, deactivated ones included.
  admins_count?: number;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
};
