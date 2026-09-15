import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/client-auth/components/auth-card";
import { ForgotPasswordForm } from "@/modules/client-auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset code."
      footer={
        <>
          Remembered it after all?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
