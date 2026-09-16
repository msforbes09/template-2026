import type { Metadata } from "next";
import { AdminLoginShell } from "@/modules/admin/components/admin-login-shell";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginShell />;
}
