# docs/deploy/

One runbook per production release (`staging` → `production`).

`YYYY-MM-DD-production-release-<from>-to-<to>.md`, headed:

```markdown
# Production release YYYY-MM-DD

**From:** production @ <commit> (vX.Y.Z)
**To:** staging @ <commit> (vX.Y.Z+1)
**Release PR:** #<n>

## What ships (by area)
| Area | PR | Summary |

## Infrastructure prerequisites
New env vars, queues, workers, external services.

## Deploy steps
1. Numbered, copy-pasteable.

## Rollback
```

See `2026-09-15-example-production-release.md` for a filled-in example.
