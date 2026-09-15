import Link from "next/link";
import { getClientSession } from "@/lib/auth/dal";

// Signed-in visitors already have real, personalized access to the catalog
// on their dashboard — send them there instead of the marketing anchor.
export async function CatalogNavLink({ className }: { className?: string }) {
  const session = await getClientSession();
  return (
    <Link href={session ? "/dashboard" : "/#catalog"} className={className}>
      API catalog
    </Link>
  );
}
