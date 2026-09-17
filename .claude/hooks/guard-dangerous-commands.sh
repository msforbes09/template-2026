#!/bin/bash
# PreToolUse hook for Bash.
#
# BLOCKS destructive commands: history rewrites, hard resets, base-branch
# deletion, recursive deletes of root/home, destructive SQL sent to a database
# client, and the Laravel / Docker commands that wipe a database or its volumes.
# Anything blocked here needs the user to run it by hand.
#
# Patterns are anchored to the command position (start of the line or after
# `;`, `&&`, `||`, `|`) so a commit message, a grep pattern or a quoted string
# mentioning one of these phrases is not mistaken for running it.
#
# Requires: jq. Fails CLOSED without it — a guard that silently stops guarding
# is worse than one that asks for its dependency.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "Blocked: the command guard needs jq (brew install jq)." >&2
  exit 2
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Every simple command in the line, one per row: split on the shell separators
# and trim, so each pattern below only has to look at one command at a time.
SIMPLE_COMMANDS=$(printf '%s\n' "$COMMAND" | sed -E 's/(\|\||&&|;|\|)/\n/g' | sed -E 's/^[[:space:]]+//')

block() {
  echo "Blocked: $1" >&2
  exit 2
}

while IFS= read -r cmd; do
  [ -z "$cmd" ] && continue

  # --- git ---
  if printf '%s' "$cmd" | grep -qE '^git[[:space:]]+push([[:space:]]+[^[:space:]]+)*[[:space:]]+(--force|--force-with-lease|-f|-[a-zA-Z]*f[a-zA-Z]*)([[:space:]]|$)'; then
    block "force push is not allowed."
  fi
  if printf '%s' "$cmd" | grep -qE '^git[[:space:]]+push([[:space:]]+[^[:space:]]+)*[[:space:]]+(--delete[[:space:]]+[^[:space:]]+[[:space:]]+|-d[[:space:]]+[^[:space:]]+[[:space:]]+|:)(develop|staging|production|main)([[:space:]]|$)'; then
    block "deleting a base branch on the remote is not allowed."
  fi
  if printf '%s' "$cmd" | grep -qE '^git[[:space:]]+reset[[:space:]]+([^[:space:]]+[[:space:]]+)*--hard([[:space:]]|$)'; then
    block "hard reset is not allowed. Use git stash or git checkout on specific files."
  fi
  if printf '%s' "$cmd" | grep -qE '^git[[:space:]]+clean([[:space:]]+[^[:space:]]+)*[[:space:]]+(-[a-zA-Z]*f[a-zA-Z]*|--force)([[:space:]]|$)'; then
    block "git clean --force is not allowed."
  fi
  if printf '%s' "$cmd" | grep -qE '^git[[:space:]]+branch([[:space:]]+[^[:space:]]+)*[[:space:]]+(-D|-[a-zA-Z]*D[a-zA-Z]*)([[:space:]]|$)' \
    || { printf '%s' "$cmd" | grep -qE '^git[[:space:]]+branch[[:space:]]' && printf '%s' "$cmd" | grep -qE '(^|[[:space:]])(--delete|-d)([[:space:]]|$)' && printf '%s' "$cmd" | grep -qE '(^|[[:space:]])(--force|-f)([[:space:]]|$)'; }; then
    block "force-deleting a branch is not allowed."
  fi

  # --- filesystem: recursive delete of root or home, in any flag spelling ---
  if printf '%s' "$cmd" | grep -qE '^(sudo[[:space:]]+)?rm([[:space:]]+(-[a-zA-Z]+|--[a-z-]+))*[[:space:]]+(/|/\*|~|~/|~/\*|\$HOME|\$HOME/|\$\{HOME\}/?)([[:space:]]|$)' \
    && printf '%s' "$cmd" | grep -qE '(^|[[:space:]])(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)([[:space:]]|$)'; then
    block "recursive deletion of root or home is not allowed."
  fi

  # --- SQL: only when handed to a database client ---
  if printf '%s' "$cmd" | grep -qE '^(mysql|mariadb|psql|sqlite3|php[[:space:]]+artisan[[:space:]]+(db|tinker))([[:space:]]|$)' \
    && printf '%s' "$cmd" | grep -iqE 'DROP[[:space:]]+(TABLE|DATABASE|SCHEMA)|TRUNCATE([[:space:]]+TABLE)?[[:space:]]'; then
    block "destructive SQL needs explicit human approval."
  fi

  # --- Laravel: database wipes (a single-step rollback is routine and allowed) ---
  if printf '%s' "$cmd" | grep -qE '^(sudo[[:space:]]+)?([^[:space:]]*/)?php[[:space:]]+artisan[[:space:]]+(migrate:fresh|migrate:reset|migrate:refresh|db:wipe)([[:space:]]|$)'; then
    block "database-wiping artisan commands are run by the user, not by Claude."
  fi

  # --- Docker: volume removal, in both compose spellings ---
  if printf '%s' "$cmd" | grep -qE '^(sudo[[:space:]]+)?docker([[:space:]]+compose|-compose)([[:space:]]+[^[:space:]]+)*[[:space:]]+down([[:space:]]+[^[:space:]]+)*[[:space:]]+(-v|--volumes|-[a-zA-Z]*v[a-zA-Z]*)([[:space:]]|$)' \
    || printf '%s' "$cmd" | grep -qE '^(sudo[[:space:]]+)?docker[[:space:]]+(volume[[:space:]]+(rm|prune)|system[[:space:]]+prune)([[:space:]]|$)'; then
    block "removing Docker volumes destroys local data. The user runs this by hand."
  fi
done <<< "$SIMPLE_COMMANDS"

exit 0
