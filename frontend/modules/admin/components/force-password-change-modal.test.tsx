import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/admin/components/change-password-form", () => ({
  ChangePasswordForm: () => <form aria-label="change password" />,
}));
vi.mock("@/modules/admin/components/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
}));

import { ForcePasswordChangeModal } from "@/modules/admin/components/force-password-change-modal";

describe("ForcePasswordChangeModal", () => {
  it("explains a temporary password", () => {
    render(<ForcePasswordChangeModal reason="temporary" />);
    expect(screen.getByRole("dialog")).toHaveTextContent(/temporary password/i);
  });

  it("explains an expired password", () => {
    render(<ForcePasswordChangeModal reason="expired" />);
    expect(screen.getByRole("dialog")).toHaveTextContent(/password has expired/i);
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/temporary/i);
  });
});
