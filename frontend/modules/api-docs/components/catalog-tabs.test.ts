import { describe, it, expect } from "vitest";
import {
  resolveCatalogTab,
  CATALOG_TABS,
  DEFAULT_CATALOG_TAB,
  type CatalogTab,
} from "@/modules/api-docs/components/catalog-tabs";

// What the anonymous page renders (no credential, no usage to show).
const PUBLIC: CatalogTab[] = ["documentation", "integration"];
// What the signed-in page renders for a catalog with an integration guide.
const DASHBOARD: CatalogTab[] = ["documentation", "integration", "credentials", "usage"];

describe("resolveCatalogTab", () => {
  it("returns the requested tab when the page renders it", () => {
    expect(resolveCatalogTab("usage", DASHBOARD)).toBe("usage");
    expect(resolveCatalogTab("credentials", DASHBOARD)).toBe("credentials");
    expect(resolveCatalogTab("integration", PUBLIC)).toBe("integration");
  });

  it("defaults to documentation when no tab is named", () => {
    expect(resolveCatalogTab(null, DASHBOARD)).toBe(DEFAULT_CATALOG_TAB);
    expect(resolveCatalogTab("", DASHBOARD)).toBe(DEFAULT_CATALOG_TAB);
  });

  it("falls back when the tab exists but this page doesn't render it", () => {
    // The case that would otherwise blank the page: ?tab=credentials pasted
    // onto the anonymous view, where no such panel exists, would leave the
    // Tabs root pointing at nothing.
    expect(resolveCatalogTab("credentials", PUBLIC)).toBe("documentation");
    expect(resolveCatalogTab("usage", PUBLIC)).toBe("documentation");
  });

  it("falls back when the catalog has no integration guide", () => {
    expect(resolveCatalogTab("integration", ["documentation"])).toBe("documentation");
  });

  it("ignores an unrecognised value rather than trusting the URL", () => {
    expect(resolveCatalogTab("../../etc", DASHBOARD)).toBe("documentation");
    expect(resolveCatalogTab("Documentation", DASHBOARD)).toBe("documentation");
    expect(resolveCatalogTab("usage ", DASHBOARD)).toBe("documentation");
  });

  it("covers every tab the view can render", () => {
    // Guards against a trigger being added to CatalogDocView without being
    // added here, which would make that tab unreachable by URL.
    for (const tab of CATALOG_TABS) {
      expect(resolveCatalogTab(tab, CATALOG_TABS)).toBe(tab);
    }
  });
});
