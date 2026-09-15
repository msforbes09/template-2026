# docs/handoff/

The backend → frontend contract this app consumes: one file per backend PR,
copied here from the backend's own `docs/handoff/` when the frontend work for
it starts, so the screen and the contract it was built against travel
together.

`YYYY-MM-DD-<slug>-fe-handoff.md`, headed:

```markdown
# <Feature> — FE handoff

**PR:** #<n> (merged into `develop` on YYYY-MM-DD)
**Breaking changes:** none | <list>

## Endpoints
For each: method + path, auth/permission, request JSON sample, response JSON
sample, error envelopes it can return.

## UI consequences
What the frontend must add, change, or remove.

## Notes
Feature flags involved, migration or deploy prerequisites.
```

See `2026-09-15-example-feature-fe-handoff.md` for a filled-in example.
