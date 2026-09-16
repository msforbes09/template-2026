#!/bin/bash
# PreToolUse hook for Edit|Write.
#
# BLOCKS edits to environment files, key material and credential files — the
# "never edit .env" rule enforced at the tool layer instead of by prose.
# WARNS (adds context, does not block) on security-sensitive paths so a change
# there gets extra scrutiny.
#
# Requires: jq

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# --- BLOCK: environment files (templates stay editable) ---
case "$FILE_PATH" in
  *.env|*.env.*|*/.env|*/.env.*)
    case "$FILE_PATH" in
      *.example) exit 0 ;;
    esac
    echo "Blocked: environment files are never edited. Update the tracked .env.example and tell the user what to set." >&2
    exit 2
    ;;
  *.pem|*.key|*.p12|*.pfx|*/keys/*|*credentials*|*secrets*)
    echo "Blocked: key material and credential files are not edited by Claude." >&2
    exit 2
    ;;
esac

# --- WARN: security-sensitive paths ---
SECURITY_PATHS=(
  "backend/project/app/Http/Middleware/"
  "backend/project/app/Models/Concerns/Authenticates.php"
  "backend/project/app/Models/Concerns/EncryptsPii.php"
  "backend/project/app/Models/Administrators/Concerns/TwoFactorAuthenticates.php"
  "backend/project/app/Models/Users/Concerns/TwoFactorAuthenticates.php"
  "backend/project/app/Models/Users/Concerns/ManagesPassword.php"
  "backend/project/app/Services/Otp/"
  "backend/project/app/Services/Security/"
  "backend/project/config/auth.php"
  "backend/project/config/sanctum.php"
  "backend/project/config/cors.php"
  "frontend/lib/auth"
  "frontend/lib/api-client.ts"
  "frontend/middleware.ts"
  "frontend/proxy.ts"
)

for path in "${SECURITY_PATHS[@]}"; do
  if [[ "$FILE_PATH" == *"$path"* ]]; then
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "WARNING: security-sensitive file ($path). Auth, session, PII or CORS behaviour lives here. Re-read the surrounding tests before changing it and keep the change minimal."
  }
}
EOF
    exit 0
  fi
done

exit 0
