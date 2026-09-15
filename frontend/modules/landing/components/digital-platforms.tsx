import Image from "next/image";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { Stagger, StaggerItem, CountUp } from "@/components/ui/motion";
import { PlatformsExpander } from "@/modules/landing/components/platforms-expander";

// The eGov ecosystem (#platforms): the full catalog of 28 citizen-facing
// platforms that ride the same API foundation shown above.
//
// Two-part composition:
//   1. FEATURED BAND — the six flagship platforms the business wants front and
//      centre, each carrying a headline transaction metric. Laid out two-up
//      (2 columns × 3 rows) so every column holds exactly two. All six share the
//      same light "featured" stat card.
//   2. BENTO — the remaining 22 platforms as a logo mosaic; cells that have an
//      official "at a glance" figure carry a compact headline metric. Two
//      cells span two columns (`wide`) to give the grid its bento rhythm.
//      Collapsed by default behind a "Show all 28 platforms" disclosure
//      (<PlatformsExpander>, the client leaf that owns the toggle + reveal
//      animation); the cards are still rendered HERE, server-side, so the full
//      roster stays in the HTML for SEO.
//
// Alignment is deterministic (the section must never leave an orphan row):
//   • Featured band = 6 cells → flush at 1 and 2 columns.
//   • Bento = 22 cells + 2 wide cells = 24 track-units. 24 is divisible by 6, so
//     it tiles flush at BOTH sm (2-col) and lg (3-col). The array is written as
//     complete 3-col rows (each block sums to 3 units) so grid-flow-row-dense
//     packs it in source order with no holes and the wide cells alternate
//     left/right. Change the platform or wide count → re-balance to a multiple
//     of 6 before shipping.
//
// Logos: a wordmark PNG already carries the name, so <PlatformLockup> renders the
// image instead of a "monogram chip + name". Every platform here has a logo in
// public/platforms/, pre-trimmed to its visible content (no transparent padding),
// so the declared w/h below are the true content dimensions.
// scale: optional optical correction on top of the equal-area normalization —
// dense wordmarks that fill their bounding box (eLGU, eGovPH…) read bigger than
// airy marks at the same bbox area, so they get a slight down-scale (<1).
type PlatformLogoAsset = { src: string; w: number; h: number; scale?: number };
type PlatformStat = { value: number; suffix: string; label: string };
type Platform = {
  name: string;
  short: string; // 2–3 char monogram fallback for the brand chip
  description: string;
  logo?: PlatformLogoAsset;
  stat?: PlatformStat; // headline metric — large on featured cards, compact on bento cells
  wide?: boolean; // bento cell spans two columns (ignored in the featured band)
};

// Official brand figure — now matched 1:1 by the roster (6 featured + 22 bento).
const PLATFORM_COUNT = 28;

// 1) FEATURED BAND — six flagships with transaction data, two per row:
//      eGov PH | eGovDX
//      eTravel | Digital National ID
//      eReport | eGov AI
const featured: Platform[] = [
  {
    name: "eGov PH",
    short: "PH",
    logo: { src: "/platforms/logo-eGovPH.png", w: 365, h: 84, scale: 0.9 },
    stat: { value: 60, suffix: "M+", label: "Downloads" },
    description:
      "The one-stop super app for local and national government services.",
  },
  {
    name: "eGovDX",
    short: "DX",
    logo: { src: "/platforms/logo-egovdx.png", w: 322, h: 61, scale: 0.9 },
    stat: { value: 950, suffix: "M+", label: "eGovDX Transactions" },
    description:
      "eGovernment Data Exchange — streamlines integration and solidifies the foundation of digital government.",
  },
  {
    name: "eTravel",
    short: "TVL",
    logo: { src: "/platforms/logo-etravel.png", w: 273, h: 68, scale: 0.9 },
    stat: { value: 73, suffix: "M+", label: "passengers served" },
    description:
      "Unified border and travel processing, with DOT, BI, DOTr, BOC, BOQ and DOH.",
  },
  {
    name: "Digital National ID",
    short: "ID",
    logo: { src: "/platforms/logo-digitalnationalid.png", w: 384, h: 81 },
    stat: { value: 92, suffix: "M+", label: "Digital National IDs" },
    description: "The foundational national digital identity, with PSA.",
  },
  {
    name: "eReport",
    short: "RPT",
    logo: { src: "/platforms/logo-ereport.png", w: 308, h: 95 },
    stat: { value: 200, suffix: "k+", label: "Citizen Reports" },
    description:
      "Centralized reporting system, in collaboration with PNP, BFP, OWWA, CWC, PCW, DOTr, ARTA, DTI and CICC.",
  },
  {
    name: "eGov AI",
    short: "AI",
    logo: { src: "/platforms/logo-egovai.png", w: 931, h: 264 },
    stat: { value: 200, suffix: "M+", label: "Transactions" },
    description:
      "eGovernment artificial intelligence for the automation of processes and transactions.",
  },
];

// 2) BENTO — the remaining 22 platforms; cells with an official "at a glance"
// figure carry a compact stat. Ordered as complete 3-col rows; the two `wide`
// cells alternate c1/c2 for the mosaic.
const rest: Platform[] = [
  // row 1 — three singles
  {
    name: "eLGU",
    short: "LGU",
    logo: { src: "/platforms/logo-elgu.png", w: 216, h: 63, scale: 0.9 },
    stat: { value: 1058, suffix: "", label: "LGUs" },
    description:
      "Local government digitalization, in collaboration with DILG and ARTA.",
  },
  {
    name: "eNGA",
    short: "NGA",
    logo: { src: "/platforms/logo-eNGA.png", w: 244, h: 73, scale: 0.9 },
    stat: { value: 100, suffix: "+", label: "NGAs integrated" },
    description:
      "National government digitalization for agencies across the executive branch.",
  },
  {
    name: "eKYC",
    short: "KYC",
    logo: { src: "/platforms/logo-ekyc.png", w: 239, h: 78, scale: 0.9 },
    stat: { value: 250, suffix: "M", label: "Verifications" },
    description:
      "Advanced identity verification, in collaboration with PSA, PhilHealth and GSIS.",
  },
  // row 2 — wide + single
  {
    name: "eGov Pay",
    short: "PAY",
    wide: true,
    logo: { src: "/platforms/logo-eGovPay.png", w: 349, h: 78 },
    stat: { value: 400, suffix: "+", label: "Systems integrated" },
    description:
      "Secured government payment gateway, in collaboration with DOF-BTr and Landbank.",
  },
  {
    name: "eGov Wallet",
    short: "WAL",
    logo: { src: "/platforms/logo-egov-wallet.png", w: 448, h: 77 },
    description:
      "An e-wallet built into the eGovPH super app for everyday citizen payments.",
  },
  // row 3 — three singles
  {
    name: "eGov Cloud",
    short: "CLD",
    logo: { src: "/platforms/logo-egovcloud.png", w: 341, h: 62 },
    stat: { value: 100, suffix: "K+", label: "Servers" },
    description:
      "Government cloud infrastructure hosting agency systems and citizen-facing services.",
  },
  {
    name: "eGov Crypt",
    short: "CRY",
    logo: { src: "/platforms/logo-egovcrypt.png", w: 339, h: 73 },
    stat: { value: 100, suffix: "M+", label: "Data encrypted" },
    description:
      "Cryptographic and encryption services safeguarding sensitive government data.",
  },
  {
    name: "eJobs",
    short: "JOB",
    logo: { src: "/platforms/logo-ejobs.png", w: 242, h: 64, scale: 0.9 },
    stat: { value: 50, suffix: "K+", label: "Employment" },
    description:
      "A public-sector employment portal connecting citizens to government job opportunities.",
  },
  // row 4 — three singles
  {
    name: "eVisa PH",
    short: "VIS",
    logo: { src: "/platforms/logo-evisaph.png", w: 261, h: 65, scale: 0.9 },
    stat: { value: 100, suffix: "K+", label: "eVisa Generated" },
    description:
      "The Philippines' first easy, convenient way to process a visa online.",
  },
  {
    name: "eVerify",
    short: "eV",
    logo: { src: "/platforms/logo-everify.png", w: 220, h: 92 },
    stat: { value: 290, suffix: "M+", label: "Transactions" },
    description:
      "National identity verification against PhilSys, in collaboration with PSA.",
  },
  {
    name: "eMessage",
    short: "MSG",
    logo: { src: "/platforms/logo-eMessage.png", w: 285, h: 52 },
    stat: { value: 100, suffix: "M+", label: "Notifications" },
    description:
      "Government SMS notification and blasting system for citizen alerts.",
  },
  // row 5 — three singles
  {
    name: "eGovChain",
    short: "CHN",
    logo: { src: "/platforms/logo-egovchain.png", w: 261, h: 47 },
    stat: { value: 3, suffix: "", label: "Nodes" },
    description:
      "A government-run decentralized, distributed ledger for document authenticity.",
  },
  {
    name: "eHealth",
    short: "H+",
    logo: { src: "/platforms/logo-eHealth.png", w: 280, h: 58, scale: 0.9 },
    stat: { value: 100, suffix: "K+", label: "Transactions" },
    description:
      "5M+ vaccination certificates and records, with DOH and PhilHealth.",
  },
  {
    name: "eGovDocs",
    short: "DOC",
    logo: { src: "/platforms/logo-egovdocs.png", w: 304, h: 46 },
    stat: { value: 25, suffix: "K+", label: "Singed Document" },
    description:
      "Modernizes document handling for the Philippine government and its citizens.",
  },
  // row 6 — single + wide
  {
    name: "eReceipt",
    short: "RCP",
    logo: { src: "/platforms/logo-ereceipt.png", w: 303, h: 85 },
    stat: { value: 50, suffix: "M+", label: "Generated eReceipt" },
    description:
      "Electronic receipt generation, in collaboration with DOF and NPO.",
  },
  {
    name: "Green Lanes",
    short: "GL",
    wide: true,
    stat: { value: 25, suffix: "K+", label: "Approved Investors" },
    logo: { src: "/platforms/logo-greenlanes.png", w: 316, h: 71 },
    description:
      "Green Lanes for Strategic Investments — an expedited approval pathway for priority investors.",
  },
  // row 7 — three singles
  {
    name: "eSignature",
    short: "SIG",
    logo: { src: "/platforms/logo-esignature.png", w: 285, h: 103 },
    stat: { value: 48, suffix: "M+", label: "Signatures" },
    description:
      "Legally-recognized electronic signatures for government forms and transactions.",
  },
  {
    name: "eNews",
    short: "NWS",
    logo: { src: "/platforms/logo-enews.png", w: 252, h: 60, scale: 0.9 },
    stat: { value: 50, suffix: "K+", label: "News Posted" },
    description:
      "An advanced news platform integrated with the eGovPH app, in collaboration with PCO.",
  },
  {
    name: "eTourism",
    short: "TUR",
    stat: { value: 10, suffix: "K+", label: "Visit" },
    logo: { src: "/platforms/logo-etourism.png", w: 330, h: 58, scale: 0.9 },
    description:
      "A dedicated tourism module for the Philippine travel experience.",
  },
  // row 8 — three singles
  {
    name: "Serbisyo Hub",
    short: "HUB",
    logo: { src: "/platforms/logo-serbisyohub.png", w: 276, h: 58 },
    stat: { value: 250, suffix: "K+", label: "Serve onsite" },
    description:
      "A one-stop hub for citizen services inside the eGovPH super app.",
  },
  {
    name: "DigitalFolder",
    short: "DF",
    logo: { src: "/platforms/logo-digital-folder.png", w: 365, h: 83 },
    stat: { value: 90, suffix: "M+", label: "Documents" },
    description:
      "A system that collates the digital documents of every eGovPH Filipino citizen.",
  },
  {
    name: "PH Startup",
    short: "SUP",
    logo: { src: "/platforms/logo-phstartup.png", w: 273, h: 108 },
    stat: { value: 10, suffix: "K+", label: "Start Up" },
    description:
      "Startup development program, in collaboration with DOST and DTI.",
  },
];

// Optical size normalization: aspect ratios in this set run 2.39:1 (eVerify) to
// 6.61:1 (eGovDocs), so any single fixed dimension misreads — fixed height makes
// wide wordmarks look huge, fixed width makes compact marks look huge. Instead
// every logo renders at the same visual AREA (height = √(AREA / aspect)), the
// standard logo-wall treatment, so each mark carries equal weight. Heights are
// clamped to the h-11 slot; only works because the PNGs are trimmed to their
// visible content (baked-in padding would count toward the area).
const LOGO_AREA = 4000; // px² per logo — ≈ a 132×30 mid-aspect wordmark
const LOGO_MIN_H = 24;
const LOGO_MAX_H = 40;

function logoBox({ w, h, scale = 1 }: PlatformLogoAsset) {
  const aspect = w / h;
  const height =
    Math.min(Math.max(Math.sqrt(LOGO_AREA / aspect), LOGO_MIN_H), LOGO_MAX_H) *
    scale;
  return { width: Math.round(height * aspect), height: Math.round(height) };
}

// Platform lockup: the real wordmark when we have it (it already carries the
// name), otherwise a monogram chip + the platform name.
function PlatformLockup({
  platform,
  nameClassName = "text-[15px] leading-tight",
}: {
  platform: Platform;
  nameClassName?: string;
}) {
  if (platform.logo) {
    // Equal-area box from logoBox(); max-w-full + object-contain scale a very
    // wide mark down (never squash it) if it meets a narrow card on small
    // viewports. The h-11 slot centers every mark on the same midline.
    const box = logoBox(platform.logo);
    return (
      <div className="flex h-11 items-center">
        <Image
          src={platform.logo.src}
          alt={platform.name}
          width={platform.logo.w}
          height={platform.logo.h}
          className="max-w-full object-contain object-left"
          style={{ width: box.width, height: box.height }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-border bg-secondary transition-colors duration-300 group-hover:border-primary group-hover:bg-primary"
      >
        <span className="font-mono text-[10px] font-semibold uppercase leading-none tracking-tight text-primary transition-colors duration-300 group-hover:text-primary-foreground">
          {platform.short}
        </span>
      </span>
      <h3
        className={cn(
          "font-semibold tracking-tight text-foreground",
          nameClassName,
        )}
      >
        {platform.name}
      </h3>
    </div>
  );
}

// Featured cell — a flagship platform with its headline metric on the right.
function FeaturedCard({ platform }: { platform: Platform }) {
  const stat = platform.stat!;
  return (
    <div className="group flex h-full flex-col justify-between gap-5 rounded-[20px] border border-border bg-card/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.035)] backdrop-blur transition-shadow duration-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.07)] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <PlatformLockup
          platform={platform}
          nameClassName="text-base leading-tight"
        />
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold leading-none tracking-tight text-foreground sm:text-3xl">
            <CountUp value={stat.value} suffix={stat.suffix} />
          </div>
          <div className="mt-1.5 text-xs font-medium text-muted-foreground">
            {stat.label}
          </div>
        </div>
      </div>
      <p className="max-w-[62ch] text-sm leading-6 text-muted-foreground/90">
        {platform.description}
      </p>
    </div>
  );
}

// Compact metric for bento cells — same anatomy as the featured stat block
// (value over label, right-aligned) one size down, so the mosaic reads as the
// same UI at a smaller scale.
function CompactStat({ stat }: { stat: PlatformStat }) {
  return (
    <div className="shrink-0 text-right">
      <div className="text-xl font-semibold leading-none tracking-tight text-foreground">
        <CountUp value={stat.value} suffix={stat.suffix} />
      </div>
      <div className="mt-1 text-[11px] font-medium text-muted-foreground">
        {stat.label}
      </div>
    </div>
  );
}

// Compact bento cell — the base unit of the mosaic. Logo/name + description,
// plus the compact metric top-right when the platform has one.
function StandardCard({ platform }: { platform: Platform }) {
  return (
    <div className="group flex h-full flex-col rounded-[20px] border border-border bg-card/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.035)] backdrop-blur transition-shadow duration-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <PlatformLockup platform={platform} />
        {platform.stat && <CompactStat stat={platform.stat} />}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground/90">
        {platform.description}
      </p>
    </div>
  );
}

// Wide bento cell — spans two columns; goes side-by-side at sm+ so the extra
// width reads as intentional (logo/name left, description middle, metric
// right). Below sm the metric joins the lockup row, like StandardCard.
function WideCard({ platform }: { platform: Platform }) {
  return (
    <div className="group flex h-full flex-col gap-4 rounded-[20px] border border-border bg-card/80 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.035)] backdrop-blur transition-shadow duration-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center sm:gap-8 sm:p-7">
      <div className="flex items-start justify-between gap-4 sm:block sm:w-[200px] sm:shrink-0">
        <PlatformLockup platform={platform} />
        {platform.stat && (
          <div className="sm:hidden">
            <CompactStat stat={platform.stat} />
          </div>
        )}
      </div>
      <p className="text-sm leading-6 text-muted-foreground/90 sm:max-w-[48ch]">
        {platform.description}
      </p>
      {platform.stat && (
        <div className="hidden sm:ml-auto sm:block">
          <CompactStat stat={platform.stat} />
        </div>
      )}
    </div>
  );
}

// Bento dispatch — the featured band renders <FeaturedCard> directly, so a
// stat here only ever means the compact treatment.
function PlatformCard({ platform }: { platform: Platform }) {
  if (platform.wide) return <WideCard platform={platform} />;
  return <StandardCard platform={platform} />;
}

export function DigitalPlatforms() {
  return (
    <section id="platforms" className="scroll-mt-24 bg-background">
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-20 pt-20 sm:px-9 sm:pt-24 lg:px-16 lg:pb-28 lg:pt-28">
        {/* Section header — echoes the "One platform. Every agency." rhythm above */}
        <Reveal className="grid gap-8 pb-14 md:grid-cols-[1fr_0.72fr] md:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.04em] text-primary">
              <span
                aria-hidden
                className="h-px w-8 bg-gradient-to-r from-primary via-destructive to-sun"
              />
              The eGov ecosystem
            </div>
            <h2 className="max-w-[640px] text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              <CountUp value={PLATFORM_COUNT} className="tabular-nums" />{" "}
              platforms. <span className="text-primary">Every service.</span>
            </h2>
          </div>
          <p className="max-w-[430px] text-base leading-7 text-muted-foreground md:justify-self-end">
            From national ID and payments to health, travel and business — the
            services citizens use every day, each a governed integration on the
            same eGov platform.
          </p>
        </Reveal>

        {/* Featured band — six flagships with transaction data, two per row so
            each column holds exactly two. */}
        <Stagger
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          stagger={0.05}
          amount={0.12}
        >
          {featured.map((platform) => (
            <StaggerItem key={platform.name} lift className="h-full">
              <FeaturedCard platform={platform} />
            </StaggerItem>
          ))}
        </Stagger>

        {/* Bento — the remaining 22 platforms (compact metrics where official
            figures exist), collapsed behind the "Show all" disclosure. Ordered
            as full 3-col rows so dense flow packs it with no holes; 22 + 2 wide
            = 24 units tiles flush at both 2 and 3 columns. Cards render here
            (server) for SEO; the client leaf only toggles and animates them. */}
        <PlatformsExpander
          total={PLATFORM_COUNT}
          items={rest.map((platform) => ({
            key: platform.name,
            wide: platform.wide,
            card: <PlatformCard platform={platform} />,
          }))}
        />
      </div>
    </section>
  );
}
