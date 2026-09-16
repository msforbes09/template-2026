import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_NAME: "Acme Portal" } }));
vi.mock("@/modules/admin/components/admin-login-form", () => ({
  AdminLoginForm: () => <form aria-label="stub" />,
}));

import { AdminLoginShell } from "@/modules/admin/components/admin-login-shell";

describe("AdminLoginShell", () => {
  it("paints the branded panel from theme tokens, not hard-coded colours", () => {
    const { container } = render(<AdminLoginShell />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{6}/i);
    expect(html).not.toMatch(/text-blue-/);
    expect(html).toMatch(/bg-primary/);
  });
});
