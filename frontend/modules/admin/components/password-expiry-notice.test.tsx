import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above these declarations, so anything they
// close over must come from vi.hoisted().
const { refresh, waivePasswordExpiry, toastSuccess, toastError } = vi.hoisted(() => ({
  refresh: vi.fn(),
  waivePasswordExpiry: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));
vi.mock("@/modules/admin/actions/password-expiry", () => ({
  waivePasswordExpiry: (...args: unknown[]) => waivePasswordExpiry(...args),
}));

import { PasswordExpiryNotice } from "@/modules/admin/components/password-expiry-notice";

describe("PasswordExpiryNotice", () => {
  afterEach(cleanup);

  beforeEach(() => {
    refresh.mockReset();
    waivePasswordExpiry.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("names the expiry date, the postponements left, and links to the change form", () => {
    render(<PasswordExpiryNotice expiresAt="2026-09-10 09:00:00" waivesRemaining={2} />);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(/expired on 10 Sep 2026/i);
    expect(notice).toHaveTextContent(/2 postponements left/i);
    // Base UI renders a non-native button as <a role="button">, so it is a
    // button by role and a link by href.
    expect(screen.getByRole("button", { name: /change password/i })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
  });

  it("uses the singular for the last postponement", () => {
    render(<PasswordExpiryNotice expiresAt="2026-09-10 09:00:00" waivesRemaining={1} />);
    expect(screen.getByRole("status")).toHaveTextContent(/1 postponement left/i);
  });

  it("postpones through the action and refreshes the page", async () => {
    waivePasswordExpiry.mockResolvedValue({ ok: true, data: null });
    render(<PasswordExpiryNotice expiresAt="2026-09-10 09:00:00" waivesRemaining={2} />);

    fireEvent.click(screen.getByRole("button", { name: /remind me later/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(waivePasswordExpiry).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("reports a refused postponement without refreshing", async () => {
    waivePasswordExpiry.mockResolvedValue({
      ok: false,
      status: 400,
      message: "The password expiry cannot be postponed.",
      errors: {},
    });
    render(<PasswordExpiryNotice expiresAt="2026-09-10 09:00:00" waivesRemaining={2} />);

    fireEvent.click(screen.getByRole("button", { name: /remind me later/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("The password expiry cannot be postponed."));
    expect(refresh).not.toHaveBeenCalled();
  });
});
