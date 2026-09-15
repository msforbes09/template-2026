import "server-only";
import { statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { createGoogleVertex } from "@ai-sdk/google-vertex";
import { env } from "@/lib/env";

// Gemini on Google Vertex, authenticated with a service-account key file whose
// PATH comes from env (GOOGLE_VERTEX_KEY_FILE) — google-auth-library reads and
// signs with it. Passing a path rather than the key material keeps the secret
// out of the environment itself: the file is mounted at deploy time.
//
// Node runtime only. The "@ai-sdk/google-vertex/edge" entrypoint exists for
// edge, but it takes raw credential strings instead of a file, which is exactly
// what we're avoiding. next.config.ts lists google-auth-library under
// serverExternalPackages so it isn't bundled — it touches the filesystem, and
// the standalone build needs it traced as a real dependency.

// The key file's absolute path, or null when none is configured.
//
// A RELATIVE path is resolved against process.cwd(), and that cwd is not the
// same in every deployment: `next dev` runs from the repo root, but the
// standalone build (output: "standalone", what the Docker image runs) runs
// from .next/standalone. So a relative path that works in development fails in
// production with an ENOENT thrown from inside the auth library, mid-stream,
// where it surfaces to the user as a generic "an error occurred".
//
// Hence: resolve it once, and check it exists up front so the failure is a
// clean 503 with a log line naming the path we actually looked for.
export function assistantKeyFilePath(): string | null {
  const configured = env.GOOGLE_VERTEX_KEY_FILE;
  if (!configured) return null;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

// Whether the key file is present AND is actually a file.
//
// The isFile() check is not pedantry: docker compose creates a DIRECTORY at a
// bind mount's target when the host source doesn't exist, so a deployment that
// enabled the assistant but forgot to place the key would have something at
// the path that exists() happily accepts, and fail later inside the auth
// library instead of here.
function keyFileReadable(keyFile: string): boolean {
  try {
    return statSync(keyFile).isFile();
  } catch {
    return false;
  }
}

// Whether the assistant can actually run. The kill switch alone isn't enough:
// without a project and a readable key file the provider would fail at request
// time with an opaque auth error, so callers check this first and 503 instead.
export function isAssistantConfigured(): boolean {
  if (!env.ASSISTANT_ENABLED || !env.GOOGLE_VERTEX_PROJECT) return false;
  const keyFile = assistantKeyFilePath();
  return Boolean(keyFile && keyFileReadable(keyFile));
}

// Built once per process, not per request — constructing it spins up a
// GoogleAuth client that caches access tokens, and rebuilding it each time
// would re-read the key file and re-mint a token on every message.
let provider: ReturnType<typeof createGoogleVertex> | null = null;

function getProvider() {
  const keyFile = assistantKeyFilePath();

  if (!env.ASSISTANT_ENABLED || !env.GOOGLE_VERTEX_PROJECT || !keyFile) {
    throw new Error(
      "Vertex assistant is not configured — set ASSISTANT_ENABLED, GOOGLE_VERTEX_PROJECT and GOOGLE_VERTEX_KEY_FILE.",
    );
  }
  if (!keyFileReadable(keyFile)) {
    // Names the resolved path and the cwd it came from: the usual causes are a
    // relative GOOGLE_VERTEX_KEY_FILE that works under `next dev` but not in
    // the standalone build, and a bind mount that created a directory because
    // the host file was missing. Neither is diagnosable from "ENOENT".
    throw new Error(
      `Vertex service-account key is not a readable file at "${keyFile}" (resolved from GOOGLE_VERTEX_KEY_FILE against cwd "${process.cwd()}"). Use an absolute path, and check the file is mounted rather than a directory created by a missing bind-mount source.`,
    );
  }

  provider ??= createGoogleVertex({
    project: env.GOOGLE_VERTEX_PROJECT,
    location: env.GOOGLE_VERTEX_LOCATION,
    googleAuthOptions: { keyFile },
  });
  return provider;
}

export function assistantModel() {
  return getProvider()(env.GOOGLE_VERTEX_MODEL);
}
