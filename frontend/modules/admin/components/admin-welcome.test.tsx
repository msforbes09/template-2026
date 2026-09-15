import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// next/link needs the app router context; a plain anchor is all the assertions
// need.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/modules/admin/lib/get-admin-profile", () => ({
  getAdminProfile: vi.fn(async () => ({
    id: 1,
    email: "sam@example.com",
    first_name: "Sam",
    last_name: "Admin",
    photo: null,
    is_active: 1,
    with_temporary_password: 0,
    last_login_at: null,
    auth_validated: null,
    created_at: null,
    updated_at: null,
    permissions: ["contents-view"],
    roles: [{ id: 2, name: "Editor" }],
  })),
}));

import { AdminWelcome } from "@/modules/admin/components/admin-welcome";

describe("AdminWelcome", () => {
  it("greets the admin, names the role and links only permitted modules", async () => {
    render(await AdminWelcome());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome, Sam");
    expect(screen.getByText("Editor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /content blocks/i })).toHaveAttribute("href", "/admin/contents");
    expect(screen.queryByRole("link", { name: /^users/i })).toBeNull();
  });
});
