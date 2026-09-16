import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdleSessionWatcher } from "@/components/idle-session-watcher";

const MINUTE = 60_000;

function mount(overrides: Partial<React.ComponentProps<typeof IdleSessionWatcher>> = {}) {
  const props = {
    windowMinutes: 10,
    warningSeconds: 60,
    keepAlive: vi.fn().mockResolvedValue({ ok: true, data: { session_inactivity_minutes: 10 } }),
    signOut: vi.fn().mockResolvedValue(undefined),
    redirectTo: "/admin/login",
    navigate: vi.fn(),
    ...overrides,
  };
  render(<IdleSessionWatcher {...props} />);
  return props;
}

describe("IdleSessionWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("stays silent until one warning-length before the window closes", () => {
    mount();
    act(() => vi.advanceTimersByTime(8 * MINUTE));
    expect(screen.queryByRole("alertdialog")).toBeNull();

    act(() => vi.advanceTimersByTime(MINUTE));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/still there\?/i);
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/60 seconds/i);
  });

  it("counts the warning down", () => {
    mount();
    act(() => vi.advanceTimersByTime(9 * MINUTE + 15_000));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/45 seconds/i);
  });

  it("keeps the session alive on request and starts the window again", async () => {
    const props = mount();
    act(() => vi.advanceTimersByTime(9 * MINUTE));
    fireEvent.click(screen.getByRole("button", { name: /stay signed in/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(props.keepAlive).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();

    act(() => vi.advanceTimersByTime(8 * MINUTE));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    act(() => vi.advanceTimersByTime(MINUTE));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("signs out and leaves when the countdown reaches zero", async () => {
    const props = mount();
    act(() => vi.advanceTimersByTime(10 * MINUTE));
    await act(async () => {
      await Promise.resolve();
    });

    expect(props.signOut).toHaveBeenCalledTimes(1);
    expect(props.navigate).toHaveBeenCalledWith("/admin/login");
  });

  it("signs out when the keep-alive is refused", async () => {
    const props = mount({
      keepAlive: vi.fn().mockResolvedValue({ ok: false, status: 401, message: "Unauthenticated.", errors: {} }),
    });
    act(() => vi.advanceTimersByTime(9 * MINUTE));
    fireEvent.click(screen.getByRole("button", { name: /stay signed in/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(props.signOut).toHaveBeenCalledTimes(1);
    expect(props.navigate).toHaveBeenCalledWith("/admin/login");
  });

  it("renders nothing when the window is unknown", () => {
    mount({ windowMinutes: undefined });
    act(() => vi.advanceTimersByTime(60 * MINUTE));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
