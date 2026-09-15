import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/client-auth/components/auth-card";
import { ClientLoginForm } from "@/modules/client-auth/components/client-login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your eGov API Developer Portal account with your email and password.",
  alternates: { canonical: "/login" },
  openGraph: {
    type: "website",
    url: "/login",
    title: "Log in",
    description: "Sign in to your eGov API Developer Portal account with your email and password.",
  },
  twitter: {
    card: "summary",
    title: "Log in",
    description: "Sign in to your eGov API Developer Portal account.",
  },
};

export default function LoginPage() {

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Enter your details to access your developer account."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </>
      }
    >
      <ClientLoginForm />
    </AuthCard>
  );
}
