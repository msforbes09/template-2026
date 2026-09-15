import { describe, expect, it, vi } from "vitest";
import { applyResultErrors } from "@/lib/apply-result-errors";
import type { UseFormReturn } from "react-hook-form";

// The helper only ever touches setError/clearErrors, so a pair of spies is a
// complete stand-in for a form — and keeps these tests in the node
// environment, where the rest of the suite lives.
function fakeForm() {
  const setError = vi.fn();
  const clearErrors = vi.fn();
  return {
    form: { setError, clearErrors } as unknown as UseFormReturn<Record<string, unknown>>,
    setError,
    clearErrors,
  };
}

const FIELDS = ["password"] as const;

describe("applyResultErrors", () => {
  it("puts a known field's message on that field", () => {
    const { form, setError } = fakeForm();

    applyResultErrors(
      form,
      { message: "The password is incorrect.", errors: { password: ["The password is incorrect."] } },
      FIELDS,
    );

    expect(setError).toHaveBeenCalledWith("password", { message: "The password is incorrect." });
  });

  // The reason this test exists: a 422 carrying only `password` was rendering
  // "The password is incorrect." under the input AND again in the form-level
  // alert, because Laravel repeats the first validation error as the
  // top-level `message`. If every error found a field, the fields have said it.
  it("does not repeat the message on the root when every error found a field", () => {
    const { form, setError } = fakeForm();

    applyResultErrors(
      form,
      { message: "The password is incorrect.", errors: { password: ["The password is incorrect."] } },
      FIELDS,
    );

    expect(setError).not.toHaveBeenCalledWith("root", expect.anything());
  });

  // A claim lock, a 500, an expired session: no `errors` payload at all, so
  // the message is the only thing the reader gets.
  it("keeps the message on the root when there are no field errors", () => {
    const { form, setError } = fakeForm();

    applyResultErrors(form, { message: "An administrator is reviewing this.", errors: {} }, FIELDS);

    expect(setError).toHaveBeenCalledWith("root", { message: "An administrator is reviewing this." });
  });

  // A key with no matching input must not vanish silently.
  it("surfaces an unmapped field's message on the root", () => {
    const { form, setError } = fakeForm();

    applyResultErrors(
      form,
      { message: "The given data was invalid.", errors: { captcha: ["Verification failed."] } },
      FIELDS,
    );

    expect(setError).toHaveBeenCalledWith("root", { message: "Verification failed." });
  });

  it("reports every unmapped message when several are unknown", () => {
    const { form, setError } = fakeForm();

    applyResultErrors(
      form,
      {
        message: "The given data was invalid.",
        errors: { captcha: ["Verification failed."], token: ["Token expired."] },
      },
      FIELDS,
    );

    expect(setError).toHaveBeenCalledWith("root", {
      message: "Verification failed. Token expired.",
    });
  });

  // A second submit must not leave the first one's root error on screen after
  // the failure has moved onto a field.
  it("clears a stale root error when it has nothing to say", () => {
    const { form, clearErrors } = fakeForm();

    applyResultErrors(
      form,
      { message: "The password is incorrect.", errors: { password: ["The password is incorrect."] } },
      FIELDS,
    );

    expect(clearErrors).toHaveBeenCalledWith("root");
  });
});

describe("applyResultErrors — nested paths", () => {
  it("lands a nested error on the exact row that is wrong", () => {
    // Laravel reports per-entry failures as custom_tags.<i>.<field>. Matching
    // literally would never hit, so the row would look fine and the message
    // would surface as an unrelated form-level alert.
    const { form, setError } = fakeForm();
    applyResultErrors(
      form,
      { message: "The given data was invalid.", errors: { "custom_tags.0.color": ["Bad hex"] } },
      ["name", "custom_tags"],
    );
    expect(setError).toHaveBeenCalledWith("custom_tags.0.color", { message: "Bad hex" });
    expect(setError).not.toHaveBeenCalledWith("root", expect.anything());
  });

  it("still folds a nested error whose root is unknown into the root message", () => {
    const { form, setError } = fakeForm();
    applyResultErrors(
      form,
      { message: "Invalid.", errors: { "captcha.0.token": ["Expired"] } },
      ["name"],
    );
    expect(setError).toHaveBeenCalledWith("root", { message: "Expired" });
  });

  it("does not treat a bare known field as nested", () => {
    const { form, setError } = fakeForm();
    applyResultErrors(form, { message: "Invalid.", errors: { name: ["Required"] } }, ["name"]);
    expect(setError).toHaveBeenCalledWith("name", { message: "Required" });
  });
});
