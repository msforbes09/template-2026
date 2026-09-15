import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api-client";
import { getClientSession } from "@/lib/auth/dal";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import {
  hasMetaExtension,
  EXCHANGE_CODE_GENERATOR_EXTENSION,
  FACE_LIVENESS_SESSION_GENERATOR_EXTENSION,
} from "@/lib/catalog-meta";
import type { UserApiCatalog } from "@/types/user-api-catalog";
import { safeErrorMessage } from "@/lib/safe-error-message";

// Backs the assistant's test-request card, which has to resolve a proposed
// request client-side: it needs the collection (to find the named request) and
// the credential's base URL (which the spec deliberately omits — see
// modules/api-docs/lib/base-url.ts).
//
// Proxied here rather than fetched from the browser so the citizen's Bearer
// token never reaches client JS — the same reason /api/galleries exists. This
// returns only what the signed-in citizen can already see on the catalog page.
export async function GET(req: Request) {
  // getClientSession, not requireClientSession: route handlers return 401
  // rather than redirecting (see app/api/galleries/route.ts).
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const identifier = new URL(req.url).searchParams.get("identifier");
  if (!identifier) {
    return NextResponse.json({ message: "identifier is required." }, { status: 400 });
  }

  try {
    const { data } = await apiFetch<{ data: UserApiCatalog }>(
      `/api-catalogs/${encodeURIComponent(identifier)}`,
      { next: { tags: ["api-catalogs"] } },
      "client",
    );

    // Only the fields the tester needs. Notably NOT credential.secret_hint —
    // it's masked and useless here, and there's no reason to put credential
    // material into a response that exists to run one request.
    //
    // `prerequisite` mirrors what getApiCatalog reports to the model, so the
    // prepare card and the model agree on what an API needs. Resolved from the
    // same meta.extensions entries the docs page uses to decide which
    // generator widget to render.
    const prerequisite = hasMetaExtension(data.meta, EXCHANGE_CODE_GENERATOR_EXTENSION)
      ? { kind: "exchange-code" as const }
      : hasMetaExtension(data.meta, FACE_LIVENESS_SESSION_GENERATOR_EXTENSION)
        ? { kind: "face-liveness" as const }
        : null;

    return NextResponse.json({
      identifier: data.identifier,
      name: data.name,
      spec: data.spec,
      baseUrl: data.credential?.public?.base_url ?? null,
      // Every NON-secret field the credential carries — base_url plus things
      // like eVerify's public_api_key. Named `public` by the API precisely
      // because none of it is secret; secret_hint is still excluded, being
      // both masked and useless here. Lets the assistant fill a blank
      // {{public_api_key}} the way it already fills a blank base URL.
      publicExtras: data.credential?.public ?? {},
      hasCredential: Boolean(data.credential),
      prerequisite,
    });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ message: safeErrorMessage(err) }, { status: err.status });
    }
    await logError(err, { where: "GET /api/assistant/catalog", audience: "client" });
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
