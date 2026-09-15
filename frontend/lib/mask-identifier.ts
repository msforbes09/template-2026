// Masks a verified identifier for display (e.g. "Enter the code sent to
// ...") — the backend already has the full value, this is just to avoid
// showing it in full on screen.
export function maskMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return value;
  const countryCode = digits.slice(0, 2);
  const areaCode = digits.slice(2, 5);
  const last2 = digits.slice(-2);
  return `+${countryCode} ${areaCode} *** **${last2}`;
}

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
