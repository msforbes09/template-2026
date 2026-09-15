// Ported from design-study/light.html (the mega footer, ~lines 1012–1147).
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background pt-0 pb-0 pl-0 pr-0 sm:px-10 lg:pt-0 lg:pb-0 lg:pl-0 lg:pr-0">
      <div className="overflow-hidden border border-border bg-gradient-to-br from-card via-muted to-primary/10">
        {/* Top Bento Grid */}
        <div className="grid border-b border-border lg:grid-cols-[1.1fr_1.25fr_1.1fr]">
          {/* Newsletter / CTA */}
          <div className="border-b border-border p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <Reveal>
              <div className="mb-8 flex items-center gap-2.5">
                <svg
                  width="118"
                  height="34"
                  viewBox="0 0 136 39"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-[26px] w-auto"
                >
                  <path
                    d="M0.18 24.65C-1.32 15.6 6.82 7.8 15.56 9.89C21.05 11.21 24.8 15.99 24.8 22.13C24.8 23.31 23.86 24.26 22.71 24.26H5.83C5.55 24.26 5.34 24.54 5.42 24.82C6.35 27.98 8.94 30.04 12.66 30.04C14.99 30.04 16.91 29.1 18.21 27.53C19 26.57 20.37 26.36 21.44 26.98C22.85 27.82 23.17 29.77 22.08 31.01C19.9 33.49 16.78 35.02 12.66 35.02C5.96 35.02 1.17 30.59 0.18 24.65ZM6.18 19.54H18.62C18.9 19.54 19.11 19.25 19.02 18.98C18.07 16.04 15.7 14.51 12.46 14.51C9.21 14.51 6.9 16.26 5.79 18.94C5.67 19.22 5.88 19.54 6.18 19.54Z"
                    fill="#0040E7"
                  />
                  <path
                    d="M26.4 19.49C26.4 10.89 32.84 3.98 41.7 3.98C46.54 3.98 50.57 5.92 53.32 8.93C54.53 10.26 54.22 12.38 52.69 13.31C51.55 13.99 49.92 13.72 49.07 12.7C47.25 10.52 44.82 9.44 41.74 9.44C36.16 9.44 31.94 14.03 31.94 19.49C31.94 24.95 36.12 29.54 41.95 29.54C45.98 29.54 48.8 27.53 50.15 24.3C50.41 23.69 49.97 23.01 49.3 23.01H43.71C42.24 23.01 41.05 21.8 41.05 20.32C41.05 18.83 42.24 17.63 43.71 17.63H54.38C55.6 17.63 56.59 18.63 56.59 19.86C56.59 28.01 50.93 35 41.95 35C32.96 35 26.4 27.88 26.4 19.49Z"
                    fill="#0040E7"
                  />
                  <path
                    d="M90.79 4.78H90.79C91.99 4.78 93.06 5.54 93.43 6.67L99.33 24.34C99.55 25 100.49 25 100.71 24.34L106.57 6.67C106.95 5.54 108.01 4.78 109.21 4.78C111.12 4.78 112.46 6.63 111.85 8.42L103.77 32.33C103.23 33.94 101.71 35.02 100 35.02C98.29 35.02 96.77 33.94 96.23 32.33L88.15 8.42C87.54 6.63 88.88 4.78 90.79 4.78Z"
                    fill="#0040E7"
                  />
                  <mask
                    id="mflag3"
                    style={{ maskType: "alpha" }}
                    maskUnits="userSpaceOnUse"
                    x="57"
                    y="4"
                    width="32"
                    height="32"
                  >
                    <path
                      d="M57.83 19.6C57.83 10.99 64.64 4.01 73.21 4.01C81.79 4.01 88.63 10.99 88.63 19.6C88.63 28.2 81.79 35.18 73.21 35.18C64.64 35.18 57.83 28.24 57.83 19.6ZM83.07 19.6C83.07 14.07 78.7 9.58 73.21 9.58C67.73 9.58 63.4 14.07 63.4 19.6C63.4 25.12 67.73 29.61 73.21 29.61C78.7 29.61 83.07 25.12 83.07 19.6Z"
                      fill="black"
                    />
                  </mask>
                  <g mask="url(#mflag3)">
                    <path
                      d="M61.9 3.98L76.74 19.49L59.05 34.58L57.2 23.91L57.99 9.52L61.9 3.98Z"
                      fill="#F2C500"
                    />
                    <path
                      d="M93.31 19.5H76.62L60.75 2.77L72.23 0.06L86.5 0.85L93.31 19.5Z"
                      fill="#0040E7"
                    />
                    <path
                      d="M92 19.5L76.62 19.36L58.03 35.22L72.23 39.06L86.5 38.27L92 19.5Z"
                      fill="#A60C0C"
                    />
                  </g>
                  <path
                    d="M112 21.31C112 20.53 112.67 19.9 113.48 19.9H117.46C120.76 19.9 123.2 22.3 123.2 25.28C123.2 28.27 120.75 30.69 117.44 30.69H116.45C115.64 30.69 114.97 31.32 114.97 32.1V33.61C114.97 34.39 114.31 35.02 113.49 35.02C112.67 35.02 112 34.39 112 33.61V21.31ZM114.97 23.08V27.51C114.97 27.82 115.24 28.08 115.57 28.08H117.24C118.99 28.08 120.21 26.84 120.21 25.28C120.21 23.73 118.99 22.51 117.24 22.51H115.57C115.24 22.51 114.97 22.76 114.97 23.08Z"
                    fill="#0040E7"
                  />
                  <path
                    d="M132.85 28.78H127.95C127.74 28.78 127.56 28.96 127.56 29.18V33.61C127.56 34.39 126.94 35.02 126.18 35.02C125.42 35.02 124.8 34.39 124.8 33.61V21.31C124.8 20.53 125.42 19.9 126.18 19.9C126.94 19.9 127.56 20.53 127.56 21.31V25.69C127.56 25.91 127.74 26.09 127.95 26.09H132.85C133.07 26.09 133.24 25.91 133.24 25.69V21.31C133.24 20.53 133.86 19.9 134.62 19.9C135.38 19.9 136 20.53 136 21.31V33.61C136 34.39 135.38 35.02 134.62 35.02C133.86 35.02 133.24 34.39 133.24 33.61V29.18C133.24 28.96 133.07 28.78 132.85 28.78Z"
                    fill="#0040E7"
                  />
                </svg>
              </div>

              <span className="inline-flex border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
                Updates
              </span>

              <h3 className="mt-6 max-w-[420px] text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
                eGov API Marketplace
              </h3>

              <p className="mt-5 max-w-[380px] text-base leading-7 text-muted-foreground">
                The developer platform for national government services, operated
                by DICT.
              </p>
            </Reveal>
          </div>

          {/* Large Brand Mark */}
          <div className="relative flex min-h-[320px] items-center justify-center border-b border-border p-10 lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(226,232,240,0.7)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.7)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50" />
            <div className="relative grid grid-cols-3 gap-3">
              <span className="h-10 w-10 bg-primary shadow-[0_14px_30px_rgba(29,78,216,0.22)]" />
              <span className="h-10 w-10 bg-primary/20" />
              <span className="h-10 w-10 bg-primary/20" />
              <span className="h-10 w-10 bg-primary/20" />
              <span className="h-10 w-10 bg-primary shadow-[0_14px_30px_rgba(29,78,216,0.22)]" />
              <span className="h-10 w-10 bg-primary/20" />
              <span className="h-10 w-10 bg-primary/20" />
              <span className="h-10 w-10 bg-primary/20" />
              <span className="h-10 w-10 bg-primary shadow-[0_14px_30px_rgba(29,78,216,0.22)]" />
            </div>
          </div>

          {/* Link Columns */}
          <div className="grid sm:grid-cols-2">
            <div className="border-b border-border p-8 sm:border-r sm:p-10">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
                Platform
              </h4>
              <ul className="mt-7 space-y-4 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    Overview
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#catalog"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    The catalog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#access"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    How access works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faqs"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>
            <div className="border-b border-border p-8 sm:p-10">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                  <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
                  <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
                </svg>
                Services
              </h4>
              <ul className="mt-7 space-y-4 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/api-catalogs/everify"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    eVerify
                  </Link>
                </li>
                <li>
                  <Link
                    href="/api-catalogs/egov-sso"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    eGov SSO
                  </Link>
                </li>
                <li>
                  <Link
                    href="/api-catalogs/egovpay"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    eGovPay
                  </Link>
                </li>
                <li>
                  <Link
                    href="/api-catalogs/emessage"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    eMessage
                  </Link>
                </li>
              </ul>
            </div>
            <div className="p-8 sm:col-span-2 sm:p-10">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 12h4" />
                  <path d="M10 8h4" />
                  <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
                  <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
                  <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
                </svg>
                Governance
              </h4>
              <ul className="mt-7 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                <li>
                  <a
                    href="https://dict.gov.ph"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    About DICT
                  </a>
                </li>
                <li>
                  <Link
                    href="/privacy-policy"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-of-service"
                    className="group flex items-center transition hover:text-primary"
                  >
                    <span className="mr-2 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary">
                      ›
                    </span>
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* Bottom Row — legal/brand marks: always visible, never animated (see fade guard) */}
        <div
          data-no-reveal
          className="flex flex-col gap-6 px-8 py-7 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12"
        >
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Image
              src="/ph-seal.png"
              alt="Seal of the Republic of the Philippines"
              width={320}
              height={352}
              className="h-10 w-auto shrink-0"
            />
            <p>
              © 2026 eGov Philippines. An official service of the Republic of the
              Philippines.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="transition hover:text-primary">
              Privacy
            </Link>
            <div className="h-4 w-px bg-border" />
            <Link href="/terms-of-service" className="transition hover:text-primary">
              Terms
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <span className="text-xs">Developed by</span>
              <Image
                src="/dict-logo.png"
                alt="Department of Information and Communications Technology"
                width={1400}
                height={692}
                className="h-8 w-auto shrink-0 opacity-90"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
