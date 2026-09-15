# docs/

The single canonical location for project documentation.

| Folder | What goes there | File naming |
|---|---|---|
| `superpowers/specs/` | Approved design documents, one per feature | `YYYY-MM-DD-<slug>-design.md` |
| `superpowers/plans/` | Implementation plans derived from a spec | `YYYY-MM-DD-<slug>.md` |
| `handoff/` | The backend → frontend contract this app consumes, one per backend PR | `YYYY-MM-DD-<slug>-fe-handoff.md` |
| `deploy/` | Release runbooks (staging → production) | `YYYY-MM-DD-production-release-<from>-to-<to>.md` |
| `qa/` | Manual end-to-end test plans for non-engineers | `YYYY-MM-DD-HHMM-qa-<scope>.md` |

Each folder has its own README describing the header template. One genericized
exemplar is kept in `handoff/`, `deploy/`, and `qa/`.

Keep documentation in sync with code in the same change: when a route, a
schema, or a convention changes, the spec, `CLAUDE.md`, and `TODO.md` change
with it.
