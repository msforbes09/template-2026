import type { UseFormReturn } from "react-hook-form";

// Maps a Laravel-shaped {message, errors} result onto an RHF form: known
// field names get their own field error, anything else (e.g. a "captcha"
// key with no matching input) folds into the root message instead of
// silently disappearing.
//
// The root is a LAST RESORT, not a summary. Laravel repeats the first
// validation error as the top-level `message`, so echoing it unconditionally
// printed the same sentence twice — once under the input and once in the
// form-level alert directly beneath it. The root now speaks only when the
// fields cannot: nothing was mapped at all (a claim lock, a 500), or some key
// had no input to land on.
// Laravel reports a nested failure as a path — `custom_tags.0.color`,
// `items.2.qty`. Matching those literally against the known-field list would
// never hit, so every nested error would fall through to the form-level root
// message and the row that is actually wrong would look fine. A field is known
// if it is listed, or if its FIRST segment is.
function isKnown(field: string, knownFields: readonly string[]): boolean {
  if (knownFields.includes(field)) return true;
  const root = field.split(".")[0];
  return root !== field && knownFields.includes(root);
}

export function applyResultErrors<Values extends Record<string, unknown>>(
  // Forms using zodResolver's 3-generic useForm<TFieldValues, TContext,
  // TTransformedValues> (for schemas with .transform()) instantiate
  // TContext/TTransformedValues to something other than the defaults; this
  // helper only touches setError/clearErrors, so it doesn't care which.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<Values, any, any>,
  result: { message: string; errors: Record<string, string[]> },
  knownFields: readonly string[],
) {
  const extraMessages: string[] = [];
  let mappedAny = false;

  for (const [field, messages] of Object.entries(result.errors)) {
    if (isKnown(field, knownFields)) {
      // The full dotted path, not the root segment: RHF resolves
      // "custom_tags.0.name" to that row's own input, so the message lands on
      // the field that is actually wrong rather than on the whole array.
      form.setError(field as never, { message: messages[0] });
      mappedAny = true;
    } else {
      extraMessages.push(messages[0]);
    }
  }

  // An unmapped key's own message is the specific one; `result.message` at
  // that point is either a duplicate of it or the generic "The given data was
  // invalid.", so it is not worth the line.
  if (extraMessages.length) {
    form.setError("root", { message: extraMessages.join(" ") });
    return;
  }

  if (!mappedAny) {
    form.setError("root", { message: result.message });
    return;
  }

  // Every error found a field. Clear rather than leave: a previous submit may
  // have put a root error on screen that no longer describes the failure.
  form.clearErrors("root");
}
