# Session Working Rules

How a coding session on this repository runs. Committed so the loop travels
with the template; adjust per project.

## The loop

1. **Discuss first, no code until "go".** Survey the code, propose the design +
   open questions, settle every decision, then wait for the explicit word
   ("go"). Applies per feature.
2. **Agreed todo list before implementation.** For multi-feature batches: build
   the list item by item — nothing is added until the user agrees to it. Once
   locked and the user says go, implement the whole list in one run through to
   the PR.
3. **Branching:** branch off fresh `origin/develop`. One feature branch for the
   batch, **one commit per agreed todo item** (stacked, in list order), single PR.
4. **The backend handoff is the contract.** Copy the backend PR's handoff into
   `docs/handoff/` when the frontend work for it starts, and build against it.

## Merging & promotion

- Merging always needs the user's explicit instruction. Their phrases:
  - "merge" / "proceed until merged" → merge the open PR into `develop`.
  - "proceed until merged to staging" → also promote: cherry-pick `-x -m 1`
    the unpromoted develop merge commits onto a `release/staging-YYYY-MM-DD`
    branch off `origin/staging`, verify `git diff origin/develop HEAD` is
    empty, PR into staging, merge, delete branches.
- If a review bot is wired to the repository, read any review already posted
  before merging. If the user says "bypass bot review for now", capture each
  real finding as a `TODO.md` entry (committed on the branch) before merging so
  it isn't lost.

## Hard limits

- **Never edit `.env` files.** Update `.env.example` and tell the user what to
  set; the actual env values are theirs to change.

## Environment notes

- Run `npm run lint`, `npm run typecheck` and `npm test` from `frontend/`. The
  suite needs no `.env`.
- `npm run build` runs lint and tests first (`prebuild`) and needs a throwaway
  `BETTER_AUTH_SECRET` of 32+ characters because the build runs as
  `NODE_ENV=production`.
- Component tests (`*.test.tsx`) run in jsdom; everything else in node.
