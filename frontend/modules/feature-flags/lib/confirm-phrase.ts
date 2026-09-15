// The type-to-confirm phrase for a system control: the ACTION and the flag's
// visible name ("enable maintenance mode"), so confirming means typing what
// is about to happen — a switch flipped by mistake requires typing the wrong
// words first. Boundary-free so the dialog and its tests share it.
export function confirmPhrase(label: string, next: boolean): string {
  return `${next ? "enable" : "disable"} ${label.toLowerCase()}`;
}

// Lenient on case and surrounding whitespace — the phrase is the guard, not
// the shift key. Anything else, including the opposite action, is a miss.
export function phraseMatches(input: string, phrase: string): boolean {
  return input.trim().toLowerCase() === phrase;
}
