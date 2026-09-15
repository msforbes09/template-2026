import "server-only";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";
import { sortCatalogs } from "@/modules/api-catalog/lib/catalog-grid";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";

// What the two public catalog listings — the landing carousel (#catalog) and
// the /api-catalogs index — need in common: which catalogs to show, in what
// order, and where a card should point for whoever is looking.

// Shown only if the catalog read fails (getPublicApiCatalogs swallows errors
// and returns []). This is the marketing surface of the whole portal; an empty
// list baked into the static shell for hours is worse than a slightly stale
// one. Logos come from getCatalogLogo by identifier, so this carries text only.
//
// KEEP IN STEP WITH THE API. Names and descriptions below were copied from
// GET common/api-catalogs on 2026-08-27. The previous list had drifted — it
// still said eVerify checked "National ID" where the catalog says PhilSys, its
// Compass and eGovChain descriptions described different products, and it was
// missing face-liveness and ereport entirely, so a fallback render silently
// dropped two of the nine published services.
export const FALLBACK_CATALOGS: PublicApiCatalogItem[] = [
  {
    identifier: "egov-sso",
    name: "eGov SSO",
    description: "Single Sign-On integration for eGov partners.",
    meta: { title: "Single sign-on", icon: "KeyRound" },
  },
  {
    identifier: "everify",
    name: "eVerify",
    description:
      "Verify citizen identity against PhilSys in real time, with consent built into every check.",
    meta: { title: "Identity verification", icon: "ShieldCheck" },
  },
  {
    identifier: "emessage",
    name: "eMessage",
    description:
      "Deliver SMS, email and in-app notices to citizens through a single messaging API.",
    meta: { title: "Notifications", icon: "MessagesSquare" },
  },
  {
    identifier: "egov-ai",
    name: "eGov AI",
    description:
      "Document intelligence, translation and conversational endpoints tuned for government workloads.",
    meta: { title: "AI services", icon: "Sparkles" },
  },
  {
    identifier: "egovpay",
    name: "eGovPay",
    description:
      "Collect and reconcile government fees and charges through one gateway, with real-time settlement across accredited payment channels.",
    meta: { title: "Digital payments", icon: "Wallet" },
  },
  {
    identifier: "compass",
    name: "Compass",
    description:
      "Programmatic access to public DBM budget-execution data — SAAODB, NCA, SARO and LGSF records and dashboard summaries.",
    meta: { title: "Budget transparency", icon: "Compass" },
  },
  {
    identifier: "egovchain",
    name: "eGovChain",
    description:
      "Anchor records and run smart contracts on a zero-fee government blockchain over JSON-RPC, for tamper-evident, verifiable state.",
    meta: { title: "Blockchain", icon: "Blocks" },
  },
  {
    identifier: "face-liveness",
    name: "Face Liveness",
    description:
      "Confirm a live person is present during identity capture: create a liveness session, then fetch the verification result.",
    meta: { title: "Liveness detection", icon: "ScanFace" },
  },
  {
    identifier: "ereport",
    name: "eReport",
    description:
      "Let citizens file and track complaints and reports: submit a complaint, verify by OTP, then list and view status by case number.",
    meta: { title: "Citizen reports", icon: "Megaphone" },
  },
];

// The published catalog, flagships first, falling back to the list above when
// the Common API is unreachable. The read itself is "use cache"-tagged (see
// get-public-api-catalog.ts) and refreshes when an admin action revalidates
// "api-catalogs", so calling this from more than one place in a render costs
// one request at most.
export async function loadPublicCatalogs(): Promise<PublicApiCatalogItem[]> {
  const published = await getPublicApiCatalogs();
  return sortCatalogs(published.length ? published : FALLBACK_CATALOGS);
}

// The public read-only view, and the signed-in developer's twin of it.
const PUBLIC_BASE = "/api-catalogs";
const DASHBOARD_BASE = "/dashboard/api-catalogs";

// An APPROVED DEVELOPER goes to the dashboard twin; everyone else keeps the
// public page. Deliberately not "has a session": the dashboard route sits
// behind the backend's `user.approved` middleware (the whole api-catalogs
// prefix does), so sending a basic or pending account there would land them on
// "you don't have access to it" — a dead end on a page they can read perfectly
// well today. canCreateProjects() is the same predicate DeveloperAccess uses to
// decide whether the catalog is usable at all, and it excludes suspended
// accounts too.
//
// getClientProfile() returns null without a session cookie WITHOUT calling the
// API, so the anonymous visitor — nearly all of this traffic — pays a cookie
// read and nothing more. That cookie read is why both surfaces put their card
// list inside <Suspense> rather than the prerendered shell.
export async function resolveCatalogBasePath(): Promise<string> {
  const profile = await getClientProfile();
  return profile && canCreateProjects(profile) ? DASHBOARD_BASE : PUBLIC_BASE;
}
