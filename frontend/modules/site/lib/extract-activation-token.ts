// The admin QR now encodes a full URL (site origin + `activation_token`
// query param) rather than a bare token, so scanning it with a generic
// camera app deep-links straight into the site. This pulls the token back
// out for the in-app scanner, which still needs the bare value to POST.
export function extractActivationToken(value: string): string | null {
  try {
    return new URL(value).searchParams.get("activation_token");
  } catch {
    return null;
  }
}
