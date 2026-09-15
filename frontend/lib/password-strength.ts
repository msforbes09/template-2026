// Rough password strength, for showing a meter while someone types.
//
// This is a heuristic, NOT an entropy estimate and NOT a security control. It
// exists to nudge people away from "password1" and toward something longer; the
// only real gates are the Zod schema (minimum length, confirmation match) and
// whatever the backend enforces. Deliberately advisory: it never blocks a
// submit, because a UI that rejects a password the API would have accepted is
// worse than a weak-looking bar.
//
// Kept out of the component so it can be tested directly — the interesting part
// is the scoring, not the markup.

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export type StrengthCriterion = {
  id: "length" | "case" | "number" | "symbol";
  label: string;
  met: boolean;
};

export type PasswordStrength = {
  // 0 only for an empty password; 1–4 map to the labels below.
  score: StrengthLevel;
  label: string;
  criteria: StrengthCriterion[];
};

// The one criterion the schemas actually enforce. The rest make a password
// stronger without being required, which is why the UI presents them as
// suggestions rather than errors.
const MIN_LENGTH = 8;
const LONG_LENGTH = 12;

const LABELS: Record<StrengthLevel, string> = {
  0: "",
  1: "Very weak",
  2: "Weak",
  3: "Good",
  4: "Strong",
};

// Passwords that show up at the top of every breach corpus, plus the keyboard
// walks people reach for when told to "add a number".
const COMMON = new Set([
  "password",
  "passwd",
  "pass",
  "qwerty",
  "qwertyuiop",
  "asdf",
  "asdfgh",
  "zxcvbn",
  "letmein",
  "welcome",
  "admin",
  "administrator",
  "login",
  "iloveyou",
  "monkey",
  "dragon",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "abc",
  "abcd",
  "test",
]);

// Substitutions people make when told to "add a number or symbol". Undoing
// them first is what stops the list above from being trivially side-stepped:
// "P@ssw0rd!" is the same password as "password" and belongs at the same score,
// but a plain letters-only strip turns it into "psswrd" and matches nothing.
const LEET: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "(": "c",
  "3": "e",
  "6": "g",
  "9": "g",
  "1": "l",
  "!": "i",
  "|": "l",
  "0": "o",
  "5": "s",
  $: "s",
  "7": "t",
  "+": "t",
  "2": "z",
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((char) => LEET[char] ?? char)
    .join("")
    .replace(/[^a-z]/g, "");
}

function isCommon(value: string): boolean {
  const letters = normalize(value);
  if (!letters) return false;
  if (COMMON.has(letters)) return true;
  // "password123", "myqwerty" — a common word padded out is still that word.
  // Only words long enough to be meaningful, or "abc" would match everything.
  for (const word of COMMON) {
    if (word.length >= 5 && letters.includes(word)) return true;
  }
  return false;
}

// A single repeated character ("aaaaaaaa") or a straight run up or down the
// alphabet or number line ("12345678", "abcdefgh"). Long doesn't mean strong.
function isSequential(value: string): boolean {
  if (value.length < 4) return false;
  if (new Set(value).size === 1) return true;

  let ascending = true;
  let descending = true;
  for (let i = 1; i < value.length; i += 1) {
    const step = value.charCodeAt(i) - value.charCodeAt(i - 1);
    if (step !== 1) ascending = false;
    if (step !== -1) descending = false;
  }
  return ascending || descending;
}

export function evaluatePasswordStrength(value: string): PasswordStrength {
  const password = value ?? "";

  const criteria: StrengthCriterion[] = [
    { id: "length", label: `At least ${MIN_LENGTH} characters`, met: password.length >= MIN_LENGTH },
    {
      id: "case",
      label: "Upper and lower case letters",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { id: "number", label: "A number", met: /\d/.test(password) },
    { id: "symbol", label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];

  if (!password) return { score: 0, label: LABELS[0], criteria };

  const met = criteria.filter((criterion) => criterion.met).length;

  // Anything guessable is capped regardless of how many boxes it ticks —
  // "Password1!" satisfies every criterion and is still a bad password.
  if (isCommon(password) || isSequential(password)) {
    return { score: 1, label: LABELS[1], criteria };
  }

  // Below the minimum the meter never reads better than "Very weak", so it
  // agrees with the error the schema is about to show rather than contradicting
  // it with an encouraging bar.
  if (password.length < MIN_LENGTH) {
    return { score: 1, label: LABELS[1], criteria };
  }

  // Length carries real weight: a long passphrase of plain words beats a short
  // string with one of everything in it.
  let score = met;
  if (password.length >= LONG_LENGTH && met >= 2) score += 1;
  if (password.length >= LONG_LENGTH * 2) score += 1;

  // "Strong" has to mean something, so it's reserved for length. A password at
  // the bare minimum that happens to tick every box is "Good" at best —
  // calling eight characters strong is the kind of praise that talks someone
  // out of adding four more.
  if (password.length < LONG_LENGTH) score = Math.min(score, 3);

  const clamped = Math.max(1, Math.min(4, score)) as StrengthLevel;
  return { score: clamped, label: LABELS[clamped], criteria };
}
