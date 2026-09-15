# docs/superpowers/

Design specs and implementation plans, produced by the brainstorm → spec → plan
→ implement workflow.

## specs/

`YYYY-MM-DD-<slug>-design.md`, headed:

```markdown
# <Title> — Design

**Date:** YYYY-MM-DD
**Status:** Draft | Approved | Implemented

## Problem
## Decision summary
- One bullet per decision.
- **Accepted caveat:** call out every trade-off knowingly accepted.
## <Sections as needed: data model, endpoints, error contract, testing>
```

## plans/

`YYYY-MM-DD-<slug>.md`, headed with the agentic-worker banner, then
`**Goal:**`, `**Architecture:**`, `**Tech Stack:**`, `**Spec:**`, a
`## Global Constraints` section restating the conventions, a `## File map`,
and checkboxed (`- [ ]`) tasks that each carry their own test cycle.
