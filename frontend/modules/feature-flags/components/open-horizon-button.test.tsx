import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getHorizonAccessUrl, toastError } = vi.hoisted(() => ({
  getHorizonAccessUrl: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/modules/feature-flags/actions/horizon-actions", () => ({ getHorizonAccessUrl }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { OpenHorizonButton } from "@/modules/feature-flags/components/open-horizon-button";

describe("OpenHorizonButton", () => {
  const tab = { location: { href: "" }, close: vi.fn(), closed: false, opener: {} as unknown };

  beforeEach(() => {
    vi.clearAllMocks();
    tab.location.href = "";
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
  });
  afterEach(cleanup);

  it("opens a new tab on click and points it at the signed link", async () => {
    getHorizonAccessUrl.mockResolvedValue({ ok: true, data: { url: "https://horizon.test/horizon-access?s=1" } });

    render(<OpenHorizonButton />);
    fireEvent.click(screen.getByRole("button", { name: /open horizon/i }));

    // The tab is opened synchronously inside the click, before the await, so
    // popup blockers see a user gesture. It must NOT be opened with the
    // `noopener` feature: per spec window.open then returns null and the tab
    // could never be pointed at the link (it stayed on about:blank in
    // production). The opener link is severed by hand instead.
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.opener).toBeNull();
    await waitFor(() => expect(tab.location.href).toBe("https://horizon.test/horizon-access?s=1"));
  });

  it("closes the tab and reports the failure when no link comes back", async () => {
    getHorizonAccessUrl.mockResolvedValue({ ok: false, status: 500, message: "Something went wrong.", errors: {} });

    render(<OpenHorizonButton />);
    fireEvent.click(screen.getByRole("button", { name: /open horizon/i }));

    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("Something went wrong.");
  });
});
