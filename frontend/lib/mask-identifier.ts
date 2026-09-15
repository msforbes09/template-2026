// Masks a verified email for display (e.g. "Enter the code sent to ...") —
// the backend already has the full value, this is just to avoid showing it in
// full on screen.
export function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!domain) return value;

  const maskedLocal =
    local.length <= 2 ? `${local[0] ?? ""}*` : `${local.slice(0, 2)}${"*".repeat(local.length - 2)}`;

  const [domainName, ...tld] = domain.split(".");
  const maskedDomain =
    domainName.length <= 1 ? domainName : `${domainName[0]}${"*".repeat(domainName.length - 1)}`;

  return `${maskedLocal}@${maskedDomain}${tld.length ? `.${tld.join(".")}` : ""}`;
}
