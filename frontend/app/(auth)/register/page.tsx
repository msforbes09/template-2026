import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/client-auth/components/auth-card";
import { ClientRegisterForm } from "@/modules/client-auth/components/client-register-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a free account.",
  alternates: { canonical: "/register" },
  openGraph: {
    type: "website",
    url: "/register",
    title: "Register",
    description: "Create a free account.",
  },
  twitter: {
    card: "summary",
    title: "Register",
    description: "Create a free account.",
  },
};

export default function RegisterPage() {

  return (
    <AuthCard
      title="Create your account"
      subtitle="Register with your email to get started."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <ClientRegisterForm />
    </AuthCard>
  );
}
