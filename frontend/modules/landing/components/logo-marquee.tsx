// Ported from design-study/light.html "LOGO MARQUEE". Pure-CSS seamless scroll
// (see the `marquee` keyframes in globals.css); pauses under reduced-motion.
const agencies = [
  "DICT",
  "PhilSys",
  "PSA",
  "LTO",
  "PhilHealth",
  "BIR",
  "PAG-IBIG",
  "GSIS",
  "DTI",
  "BSP",
];

function AgencyRow({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-16 pr-16 text-lg font-semibold uppercase tracking-[0.06em] text-muted-foreground/70"
    >
      {agencies.map((agency) => (
        <span key={agency} className="whitespace-nowrap">
          {agency}
        </span>
      ))}
    </div>
  );
}

export function LogoMarquee() {
  return (
    <section className="border-t border-border bg-background px-6 py-20 sm:px-9 lg:px-16 lg:py-24">
      <div className="mx-auto max-w-[1600px]">
        <p className="text-center text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
          Integrated across national government
        </p>
        <div
          className="relative mt-8 overflow-hidden"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            maskImage:
              "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div
            className="marquee-track flex w-max items-center"
            style={{ animation: "marquee 40s linear infinite" }}
          >
            <AgencyRow />
            <AgencyRow hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
