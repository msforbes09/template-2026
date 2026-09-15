import { NextResponse } from "next/server";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";

// Backs the assistant's "which API do you want to test?" picker.
//
// Deliberately the PUBLIC list and unauthenticated: it's the same set the
// landing page and catalog index already show anyone, and the picker needs it
// before the user has committed to anything. The things that actually require
// a session — reading a credential, running a request — are gated where they
// happen, not here.
export async function GET() {
  try {
    const catalogs = await getPublicApiCatalogs();
    return NextResponse.json({
      catalogs: catalogs.map((catalog) => ({
        identifier: catalog.identifier,
        name: catalog.name,
        description: catalog.description,
      })),
    });
  } catch {
    // getPublicApiCatalogs already swallows its own failures and returns [],
    // so reaching here means something unexpected — the picker degrades to an
    // empty list and says so rather than breaking the chat.
    return NextResponse.json({ catalogs: [] });
  }
}
