import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// next/link needs the app router context; a plain anchor is all the assertions
// need.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_NAME: "Acme Portal" } }));

import { Hero } from "@/modules/landing/components/hero";

describe("Hero", () => {
  afterEach(cleanup);

  it("names the product from the environment and offers sign-in and registration", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Acme Portal");
    // Base UI renders a button-styled link with the button role.
    expect(screen.getByRole("button", { name: /log in/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("button", { name: /create an account/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("lists the capabilities the template already wires up", () => {
    render(<Hero />);
    const list = screen.getByRole("list", { name: /already wired/i });
    expect(list).toHaveTextContent("Accounts");
    expect(list).toHaveTextContent("Notifications");
    expect(list).toHaveTextContent("Admin console");
  });
});
