#!/bin/bash
# PreToolUse hook for Bash.
#
# BLOCKS destructive commands: history rewrites, hard resets, recursive deletes
# of root/home, destructive SQL, and the Laravel / Docker commands that wipe a
# database or its volumes. Anything blocked here needs the user to run it by hand.
#
# Requires: jq

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# --- git ---
if echo "$COMMAND" | grep -qE "git\s+push\s+.*(--force|-f\b)"; then
  echo "Blocked: force push is not allowed." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE "git\s+reset\s+--hard"; then
  echo "Blocked: hard reset is not allowed. Use git stash or git checkout on specific files." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE "git\s+clean\s+-[a-zA-Z]*f"; then
  echo "Blocked: git clean -f is not allowed." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE "git\s+(branch\s+-D|push\s+.*--delete\s+(develop|staging|production|main)\b)"; then
  echo "Blocked: force-deleting branches or deleting a base branch is not allowed." >&2
  exit 2
fi

# --- filesystem ---
if echo "$COMMAND" | grep -qE "rm\s+-[a-zA-Z]*r[a-zA-Z]*\s+(/|~|\\\$HOME)(\s|$)"; then
  echo "Blocked: recursive deletion of root or home is not allowed." >&2
  exit 2
fi

# --- SQL ---
if echo "$COMMAND" | grep -iqE "DROP\s+(TABLE|DATABASE|SCHEMA)|TRUNCATE\s+TABLE"; then
  echo "Blocked: destructive SQL needs explicit human approval." >&2
  exit 2
fi

# --- Laravel: database wipes ---
if echo "$COMMAND" | grep -qE "artisan\s+(migrate:fresh|migrate:reset|migrate:rollback|db:wipe)"; then
  echo "Blocked: database-wiping artisan commands are run by the user, not by Claude." >&2
  exit 2
fi

# --- Docker: volume removal ---
if echo "$COMMAND" | grep -qE "docker\s+compose\s+.*down\s+.*(-v\b|--volumes)|docker\s+volume\s+(rm|prune)|docker\s+system\s+prune"; then
  echo "Blocked: removing Docker volumes destroys local data. The user runs this by hand." >&2
  exit 2
fi

exit 0
