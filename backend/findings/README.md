# `findings/` — security audit artifacts

Untracked (git-excluded via `.gitignore`, except this README). Review
artifacts, not product code.

**Organise one folder per sweep, named for its date.** Each folder holds that
sweep's write-up plus the raw material it was based on (source report, per-batch
notes). Filenames keep their date prefix so a document copied out of the folder
is still self-describing.

## Layout

```
findings/
  README.md                     # this index — add a row per sweep, newest first
  YYYY-MM-DD/
    YYYY-MM-DD-<scope>-findings.md   # the write-up: ranked findings + proposed actions
    supporting-notes/                # per-batch verification detail (file:line, commits)
    <source report>.pdf              # the scanner/report the sweep was based on
  raw-bot-comments/               # optional cumulative cache of review-bot comments, per PR
```

## Write-up template

```markdown
# <Scope> security findings — YYYY-MM-DD

**Baseline:** develop @ <commit>

## Ranked findings
| # | Severity | Finding | Location | Proposed action | Status |

## Already fixed / false positives

## Decisions needed
```

## Sweeps, newest first

_None yet._

## Reproducing a sweep

If a review bot comments on pull requests, fetch its comments from all three
GitHub endpoints; inline review comments are only reachable via the per-review
endpoint:

```bash
gh api "repos/<owner>/<repo>/issues/$N/comments" --paginate
gh api "repos/<owner>/<repo>/pulls/$N/comments"  --paginate
for rid in $(gh api "repos/<owner>/<repo>/pulls/$N/reviews" --jq '.[].id'); do
  gh api "repos/<owner>/<repo>/pulls/$N/reviews/$rid/comments"
done
```

Dedupe on (file, line, issue text): the second and third calls return the same
bodies.
