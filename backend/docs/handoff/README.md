# docs/handoff/

One file per merged PR: the contract the frontend needs to consume what the
backend shipped. Written as the final task of every feature batch.

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
