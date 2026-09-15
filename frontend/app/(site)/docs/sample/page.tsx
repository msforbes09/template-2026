import type { Metadata } from "next";
import collectionJson from "@/api-schemas/egov-sso-collection.json";
import { CollectionViewer } from "@/modules/api-docs/components/collection-viewer";
import type { PostmanCollection } from "@/modules/api-docs/types";

const collection = collectionJson as unknown as PostmanCollection;

export const metadata: Metadata = {
  title: `${collection.info.name} · API reference (sample)`,
  description:
    "Sample interactive API documentation rendered from a Postman Collection v2.1 export.",
  // Demo page — keep it out of search indexes until real docs pages ship.
  robots: { index: false, follow: false },
};

export default function SampleApiDocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {collection.info.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive API reference rendered from the Postman collection. Browse the
          documentation, or open the Test tab to call the API directly.
        </p>
      </div>
      <CollectionViewer collection={collection} />
    </div>
  );
}
