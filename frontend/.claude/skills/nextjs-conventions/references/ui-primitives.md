# Shared UI Primitives

Read for the shared building blocks in components/ui that features compose (never reimplement).

`components/ui/` holds the shared building blocks. Feature components **compose** these — never reimplement them:

`AppFormField`, `FormRootError`, `FormSubmitButton`, `PageHeader`, `ConfirmDialog`, `EmptyState`, `StatusBadge`, `DataTable` (TanStack Table wrapper).

```tsx
// DataTable wraps TanStack Table — features pass columns + data only
<DataTable columns={userColumns} data={users} />

// PageHeader for consistent page tops
<PageHeader title="Users" action={<CreateUserModal />} />

// EmptyState when a list is empty
<EmptyState title="No users yet" description="Create your first user." />

// ConfirmDialog for destructive actions
<ConfirmDialog
  title="Delete user?"
  description="This cannot be undone."
  onConfirm={handleDelete}
/>
```

---
