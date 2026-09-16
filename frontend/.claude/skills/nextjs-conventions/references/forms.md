# Forms, Formatting & Utilities

Read for the AppFormField form pattern (RHF + Zod) and the shared formatting/utility conventions (date-fns, PHP currency, lodash-es).

All form inputs use the `AppFormField` wrapper — it is the single source of truth for field layout. **Never** use shadcn `FormItem` / `FormLabel` / `FormControl` / `FormMessage` directly in feature forms.

`AppFormField` props: `label`, `isRequired` (renders a red `*` after the label), `userInfo` (hint shown below the input, above the error), `children` (the input).

All UI primitives come from `@/components/ui/` (shadcn, built on Base UI). Use shadcn components as far as possible; never import the underlying primitive libraries directly (`@base-ui/*`, `@radix-ui/*`, `cmdk`, `vaul`) — go through the shadcn wrapper so styling and behavior stay consistent.

```tsx
// A feature form using AppFormField
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppFormField } from "@/components/ui/app-form-field";
import { Input } from "@/components/ui/input";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
});
type Values = z.infer<typeof schema>;

export function UserForm({ onSubmit }: { onSubmit: (v: Values) => Promise<void> }) {
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <AppFormField label="Name" isRequired userInfo="Full legal name">
        <Input {...form.register("name")} />
      </AppFormField>

      <AppFormField label="Email" isRequired>
        <Input type="email" {...form.register("email")} />
      </AppFormField>

      <FormRootError />
      <FormSubmitButton>Save</FormSubmitButton>
    </form>
  );
}
```

---

## Formatting & Utilities (date-fns, currency, lodash)

All date/time work uses **date-fns**; all utility helpers use **lodash-es**. Centralize display formatting in `lib/format.ts` so currency, dates, and numbers are consistent app-wide. Default currency is **PHP** and amounts from the backend are treated as VAT-inclusive unless a feature says otherwise.

```ts
// lib/format.ts
import { format, formatDistanceToNow, parseISO } from "date-fns";

const PHP = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export const formatCurrency = (amount: number) => PHP.format(amount); // ₱1,234.50
export const formatNumber = (n: number) => new Intl.NumberFormat("en-PH").format(n);

// dates: accept ISO strings from the API, render in a stable format
export const formatDate = (iso: string) => format(parseISO(iso), "dd MMM yyyy");        // 30 Jun 2026
export const formatDateTime = (iso: string) => format(parseISO(iso), "dd MMM yyyy, h:mm a");
export const formatRelative = (iso: string) =>
  formatDistanceToNow(parseISO(iso), { addSuffix: true });                              // "3 days ago"
```

```ts
// lodash-es: named imports only, native-first
import { groupBy, keyBy, debounce } from "lodash-es"; // ✅ tree-shakeable
// import _ from "lodash";                              // ❌ never — pulls the whole lib

// prefer native where it's equally clear:
items.map((x) => x.id);                 // not _.map(items, "id")
Object.entries(obj);                    // not _.toPairs(obj)
// use lodash when it genuinely simplifies:
const byStatus = groupBy(orders, "status");
```

> Timezone note: the backend sends ISO timestamps. If a feature needs a fixed business timezone (Asia/Manila) rather than the viewer's local zone, format on the **server** (Server Component) where the runtime zone is controlled, or pass a `timeZone` through `Intl`/`date-fns-tz` — decide per feature.

---
