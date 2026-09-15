import { describe, expect, it } from "vitest";
import { evaluatePasswordStrength } from "@/lib/password-strength";

// The meter is advisory, so the bar to clear is "never actively misleading":
// it must not encourage a password that is obviously guessable, and it must not
// contradict the validation error the form is about to show.
describe("evaluatePasswordStrength", () => {
  it("scores an empty password as nothing at all", () => {
    const result = evaluatePasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("");
  });

  it("reports which criteria are met", () => {
    const met = (value: string) =>
      Object.fromEntries(
        evaluatePasswordStrength(value).criteria.map((c) => [c.id, c.met]),
      );

    expect(met("abcdefgh")).toEqual({ length: true, case: false, number: false, symbol: false });
    expect(met("Abcdefgh")).toEqual({ length: true, case: true, number: false, symbol: false });
    expect(met("Abcdefg1")).toEqual({ length: true, case: true, number: true, symbol: false });
    expect(met("Abcdefg1!")).toEqual({ length: true, case: true, number: true, symbol: true });
  });

  it("never reads better than very weak below the minimum length", () => {
    // Otherwise the bar would look encouraging while the schema is about to
    // reject the field for being too short.
    const short = evaluatePasswordStrength("Ab1!x");
    expect(short.score).toBe(1);
    expect(short.criteria.find((c) => c.id === "length")?.met).toBe(false);
  });

  it("caps a common password however many boxes it ticks", () => {
    // The whole point: this satisfies every criterion and is still terrible.
    expect(evaluatePasswordStrength("Password1!").score).toBe(1);
    expect(evaluatePasswordStrength("Welcome123!").score).toBe(1);
    expect(evaluatePasswordStrength("Qwerty123!").score).toBe(1);
  });

  it("sees through digit and symbol substitutions in a common word", () => {
    expect(evaluatePasswordStrength("P@ssw0rd!").score).toBe(1);
    expect(evaluatePasswordStrength("l3tm3in!!").score).toBe(1);
  });

  it("caps a long but sequential password", () => {
    // Length alone is not strength.
    expect(evaluatePasswordStrength("12345678").score).toBe(1);
    expect(evaluatePasswordStrength("abcdefghij").score).toBe(1);
    expect(evaluatePasswordStrength("aaaaaaaaaaaa").score).toBe(1);
    expect(evaluatePasswordStrength("987654321").score).toBe(1);
  });

  it("rewards variety at the minimum length, but stops short of strong", () => {
    // Eight characters with one of everything is good, not strong — saying
    // otherwise talks someone out of adding the four characters that would
    // actually help.
    expect(evaluatePasswordStrength("Tr7#kQ2z").score).toBe(3);
  });

  it("only reaches strong once the password is long", () => {
    const short = evaluatePasswordStrength("Tr7#kQ2z");
    const longer = evaluatePasswordStrength("Tr7#kQ2zPv5!");
    expect(longer.score).toBeGreaterThan(short.score);
  });

  it("rewards a long passphrase even without symbols", () => {
    // A memorable passphrase should beat a short string with one of everything,
    // which is the opposite of what a pure checklist would say.
    const passphrase = evaluatePasswordStrength("correct horse battery staple");
    const fiddly = evaluatePasswordStrength("Ab1!Ab1!");
    expect(passphrase.score).toBeGreaterThanOrEqual(fiddly.score);
  });

  it("reserves the top score for something genuinely strong", () => {
    expect(evaluatePasswordStrength("vT9#mQr2LpXw4!nZ").score).toBe(4);
  });

  it("gives every score a label except the empty one", () => {
    for (const value of ["a", "Ab1!x", "Tr7#kQ2z", "vT9#mQr2LpXw4!nZ"]) {
      expect(evaluatePasswordStrength(value).label).not.toBe("");
    }
  });

  it("handles a nullish value without throwing", () => {
    expect(() =>
      evaluatePasswordStrength(undefined as unknown as string),
    ).not.toThrow();
    expect(evaluatePasswordStrength(undefined as unknown as string).score).toBe(0);
  });
});
