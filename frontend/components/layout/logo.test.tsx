import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_NAME: "Acme Portal" } }));

import { Logo } from "@/components/layout/logo";

describe("Logo", () => {
  it("shows the product name from the environment next to a decorative mark", () => {
    const { container } = render(<Logo />);
    expect(screen.getByText("Acme Portal")).toBeInTheDocument();
    const mark = container.querySelector("svg");
    expect(mark).toHaveAttribute("aria-hidden");
    // The mark carries the two brand hues: the teal tile and the amber notch.
    expect(mark?.querySelector(".text-highlight")).not.toBeNull();
  });
});
