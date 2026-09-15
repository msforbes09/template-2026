import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import {
  getPublicApiCatalog,
  getPublicApiCatalogs,
} from "@/modules/site/lib/get-public-api-catalog";
import { getEndpointDetail, summarizeCatalogSpec } from "@/modules/assistant/lib/summarize-catalog";
import {
  getEventProjects,
  resolveEgovEvent,
} from "@/modules/projects/lib/get-public-projects";
import { eventCustomTags } from "@/types/project";
import { getNotifications } from "@/modules/notifications/lib/get-notifications";
import { notificationContent } from "@/modules/notifications/lib/notification-content";
import {
  getMetaExtensionShows,
  hasMetaExtension,
  EXCHANGE_CODE_GENERATOR_EXTENSION,
  FACE_LIVENESS_SESSION_GENERATOR_EXTENSION,
} from "@/lib/catalog-meta";
import {
  canApplyAsDeveloper,
  canCompleteProfile,
  canCreateProjects,
  canEditProfile,
  canReview,
  detailsCooldown,
  photoCooldown,
} from "@/modules/client-auth/lib/account";
import { describeNextStep, parseRemarks } from "@/modules/client-auth/lib/account-status";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import type { ClientUserProfile } from "@/types/client-user";
import type { UserApiCatalog } from "@/types/user-api-catalog";
import type { GatewayLogListItem } from "@/types/gateway-log";
import type { ProjectListItem } from "@/types/project";
import type { Paginated } from "@/types/pagination";
import { safeErrorMessage } from "@/lib/safe-error-message";

// The assistant's toolset.
//
// SECURITY MODEL, and the reason this is a factory rather than a constant:
//
// 1. Which tools exist is decided here, server-side, from whether a citizen
//    session was found on the request. The citizen tools are not *disabled*
//    when signed out — they are absent from the toolset entirely, so no
//    instruction in a user message, a catalog description or a content block
//    can reach them.
// 2. No tool takes a user id, uuid or email. Identity comes only from the
//    session cookie via apiFetch(..., "client"). A model that hallucinates
//    someone else's uuid has nowhere to put it.
// 3. Every tool that RUNS here is read-only. The two that change something —
//    running a test request, and generating or revoking a credential — have no
//    `execute`, so the AI SDK forwards them to the browser where the user has
//    to confirm. Nothing the model decides on its own can spend a credit or
//    touch a credential. See the bottom of this file for why each one has to
//    be client-side rather than merely choosing to be.

// Caps the credential fan-out in listMyCredentials. There are single digits of
// catalogs today; this stops a future catalog explosion turning one tool call
// into dozens of upstream requests.
const MAX_CREDENTIAL_LOOKUPS = 20;

// A catalog's declared testing prerequisite, read from meta.extensions.
//
// Both are handled in chat by prepareCatalogTest; they differ in what they ask
// of the user. An exchange code is minted headlessly once they pick a test
// account. A face-liveness session runs the eKYC SDK against their camera —
// still in the chat, but it needs them to actually complete a liveness check,
// which the model should say up front rather than implying it is instant.
function describePrerequisite(meta: Record<string, unknown> | null): {
  kind: "exchange-code" | "face-liveness";
  // Every request the prerequisite applies to. A list because one extension is
  // declared once per placement — eVerify needs a liveness session for both
  // "Verify Personal Information" and "QR Verify", and telling the model only
  // the first would have it insist the second needs nothing.
  appliesToRequests: string[];
  handledInChat: boolean;
  needsCamera: boolean;
  summary: string;
} | null {
  if (hasMetaExtension(meta, EXCHANGE_CODE_GENERATOR_EXTENSION)) {
    return {
      kind: "exchange-code",
      appliesToRequests: getMetaExtensionShows(meta, EXCHANGE_CODE_GENERATOR_EXTENSION),
      handledInChat: true,
      needsCamera: false,
      summary:
        "This API needs a freshly minted eGov exchange code before its requests will work. prepareCatalogTest generates one for a test account and fills it in.",
    };
  }
  if (hasMetaExtension(meta, FACE_LIVENESS_SESSION_GENERATOR_EXTENSION)) {
    return {
      kind: "face-liveness",
      appliesToRequests: getMetaExtensionShows(meta, FACE_LIVENESS_SESSION_GENERATOR_EXTENSION),
      handledInChat: true,
      needsCamera: true,
      summary:
        "This API needs a completed face-liveness session id. prepareCatalogTest runs the liveness widget right in the chat — the user has to complete a camera check in it, then the session id is filled in automatically.",
    };
  }
  return null;
}

// Tool errors are returned to the model as data, never thrown. A thrown error
// aborts the whole stream; a returned one lets the model say "I couldn't read
// your usage just now" and carry on.
function toolError(err: unknown, what: string): { error: string } {
  if (isApiError(err)) {
    return { error: `Couldn't load ${what} (HTTP ${err.status}): ${safeErrorMessage(err)}` };
  }
  return { error: `Couldn't load ${what}.` };
}

// ── Public tools — available to every visitor, signed in or not ────────────

// The published catalog, shared by the two tools below. They return the same
// data and differ only in whether the widget puts it on screen.
async function loadCatalogList(signedIn: boolean) {
  try {
    const catalogs = await getPublicApiCatalogs();
    return {
      catalogs: catalogs.map((catalog) => ({
        identifier: catalog.identifier,
        name: catalog.name,
        description: catalog.description,
      })),
      canTest: signedIn,
    };
  } catch (err) {
    return toolError(err, "the API catalog");
  }
}

// Two tools over one list, because looking the catalog up and asking the user
// to pick from it are different acts.
//
// They used to be one. The model is told to check the catalog before naming
// any API — which is right, it's what stops invented endpoints — and every one
// of those checks rendered the picker, so "write me a PHP snippet for eGov
// SSO" came back with a menu of nine APIs the user had already chosen from.
// The card now belongs to the tool whose whole job is to show it.

// Silent: grounding for the model, nothing on screen.
function makeListApiCatalogs(signedIn: boolean) {
  return tool({
    description:
      "Look up the APIs published on the eGov API Developer Portal, to check an identifier or find which API does something. This is a silent lookup — it shows the user NOTHING, so use it freely whenever you need the real catalog. To put a list on screen for them to pick from, use showApiCatalogs instead.",
    inputSchema: z.object({}),
    execute: () => loadCatalogList(signedIn),
  });
}

// Visible: renders the clickable list.
function makeShowApiCatalogs(signedIn: boolean) {
  return tool({
    description:
      "Show the user a clickable list of the published APIs, one button each. Call this ONLY when they are choosing: they asked what APIs are available, want to browse, or you genuinely can't tell which API they mean. Do NOT call it when they already named an API, when you only need to check the catalog yourself (use listApiCatalogs), or as a way to end a reply — a menu they didn't ask for is noise on top of the answer.",
    inputSchema: z.object({}),
    execute: () => loadCatalogList(signedIn),
  });
}

const getApiCatalog = tool({
  description:
    "Read one API's documentation: what it does, its integration guide, and the list of endpoints it exposes. Call this before answering any detailed question about a specific API, and before proposing a test request.",
  inputSchema: z.object({
    identifier: z
      .string()
      .describe("The catalog identifier from listApiCatalogs, e.g. 'compass' or 'emessage'."),
  }),
  execute: async ({ identifier }) => {
    try {
      const catalog = await getPublicApiCatalog(identifier);
      if (!catalog) {
        return { error: `No API named "${identifier}" is published. Call listApiCatalogs.` };
      }
      const spec = summarizeCatalogSpec(catalog.spec);
      return {
        identifier: catalog.identifier,
        name: catalog.name,
        description: catalog.description,
        // Some catalogs can't be tested cold — eGov SSO needs a freshly minted
        // exchange code, eVerify needs a completed face-liveness session. The
        // catalog declares that in meta.extensions, and the model needs to
        // know before it proposes a test that would just fail.
        prerequisite: describePrerequisite(catalog.meta),
        // The integration guide is authored markdown and is usually the best
        // answer to "how do I use this" — capped so a long one can't dominate.
        integrationGuide: catalog.body?.slice(0, 6000) ?? null,
        endpoints: spec.endpoints,
        // What a caller has to supply, e.g. base_url, partner_code,
        // partner_secret for eGov SSO.
        variables: spec.variables,
        endpointsTruncated: spec.truncated,
        specFormatUnsupported: spec.unsupportedFormat,
        // The descriptions above are trimmed to keep the whole list readable.
        // Say so explicitly, so the model fetches the real thing rather than
        // filling the gap from general knowledge.
        note: "Endpoint descriptions here are abbreviated. Call getApiEndpoint for the full documentation, request body and example responses of a specific endpoint before explaining how to call it.",
      };
    } catch (err) {
      return toolError(err, `the "${identifier}" API`);
    }
  },
});

const getApiEndpoint = tool({
  description:
    "Read ONE endpoint in full: its complete documentation, auth, headers, query and path parameters, the raw request body template with its {{variables}}, and saved example responses. Call this before explaining how to call an endpoint, writing example code, or proposing a test — the endpoint list from getApiCatalog carries abbreviated descriptions and no request body.",
  inputSchema: z.object({
    identifier: z.string().describe("The catalog identifier, e.g. 'egov-sso'."),
    requestName: z
      .string()
      .describe("The endpoint's name exactly as getApiCatalog listed it, e.g. 'Generates Access Token'."),
  }),
  execute: async ({ identifier, requestName }) => {
    try {
      const catalog = await getPublicApiCatalog(identifier);
      if (!catalog) {
        return { error: `No API named "${identifier}" is published. Call listApiCatalogs.` };
      }
      const result = getEndpointDetail(catalog.spec, requestName);
      if ("error" in result) return result;
      return { identifier: catalog.identifier, ...result.detail };
    } catch (err) {
      return toolError(err, `the "${requestName}" endpoint`);
    }
  },
});

// The public showcase. Deliberately event-scoped rather than "all projects":
// there is no global list endpoint, and an event's slug is regenerated
// whenever it is renamed — so the slug is always resolved from the live event
// list here rather than accepted from the model, which would hallucinate a
// stale one and 404.
const listShowcaseProjects = tool({
  description:
    "Browse the public project showcase: what people have built on these APIs, which services each one uses, and its rating. Use it for 'what have people built', 'show me the projects', 'which ones were awarded something', 'any projects using eVerify'. Public — works whether or not the user is signed in. The result names the event these projects belong to and lists that event's own curation labels in `curationTags`.",
  inputSchema: z.object({
    tag: z
      .string()
      .optional()
      .describe(
        "Narrow to one of the event's curation labels, spelled exactly as `curationTags` returned it. These are per-event and NOT a fixed set — one programme's may be 'TOP 30' and another's 'Winner'. Call once without a tag to learn which exist, then filter. Omit for everything.",
      ),
    egovApi: z
      .string()
      .optional()
      .describe("Only projects using this API, by catalog identifier (e.g. 'everify')."),
    search: z.string().optional().describe("Match against project name and tagline."),
  }),
  execute: async ({ tag, egovApi, search }) => {
    try {
      // Same resolve the site uses, so the assistant and the showcase never
      // disagree about which event "the projects" means.
      const event = await resolveEgovEvent();
      if (!event) {
        return {
          event: null,
          projects: [],
          note: "No event is running at the moment, so nothing is published yet.",
        };
      }

      const result = await getEventProjects(event.slug, {
        tag,
        egov_api: egovApi,
        search,
        page: "1",
      });
      if (!result.ok) return { error: result.message };

      return {
        event: { name: event.name, url: "/projects" },
        // The labels THIS event actually curates. They stopped being a global
        // set on 2026-08-26, so the model must read them here rather than
        // assuming every programme has a "TOP 30" — an event may curate
        // nothing at all, in which case this is empty and there is no
        // meaningful tag to offer.
        curationTags: eventCustomTags(event).map((label) => label.name),
        total: result.page.meta?.total ?? result.page.data.length,
        // Trimmed to what a conversational answer needs; the detail page has
        // the description, the demo video and the links.
        projects: result.page.data.slice(0, 8).map((project) => ({
          name: project.name,
          tagline: project.tagline,
          tags: project.tags,
          techStack: project.tech_stack,
          egovApisUsed: project.egov_apis_used,
          rating:
            (project.rating_count ?? 0) > 0
              ? { average: project.rating_avg, count: project.rating_count }
              : null,
          url: `/projects/${project.uuid}`,
        })),
      };
    } catch (err) {
      return toolError(err, "the project showcase");
    }
  },
});

const getContentBlock = tool({
  description:
    "Read a portal content page by identifier — 'faqs', 'terms-of-service', 'privacy-policy'. Use it for questions about the portal itself (accounts, approval, policies) rather than answering from memory.",
  inputSchema: z.object({
    identifier: z.enum(["faqs", "terms-of-service", "privacy-policy"]),
  }),
  execute: async ({ identifier }) => {
    try {
      // Unauthenticated Common API read: no audience, basePathOverride
      // "/common" — same shape ContentBlock uses.
      const { data } = await apiFetch<{ data: { body?: Record<string, string> | null } }>(
        `/contents/${identifier}`,
        { next: { tags: ["contents"] } },
        undefined,
        "/common",
      );
      return { identifier, body: data.body?.en?.slice(0, 8000) ?? null };
    } catch (err) {
      return toolError(err, `the "${identifier}" page`);
    }
  },
});

// Client-executed (no `execute`) so the turn pauses until the user clicks.
// Public: it carries no data and reads nothing, it just turns a question into
// buttons, which is as useful to an anonymous visitor as a signed-in one.
const askUser = tool({
  description:
    "Ask the user a question with clickable answers instead of waiting for them to type — a yes/no, or a short list of named choices. Use it whenever you need a decision to continue. Keep options to a few words each. Do NOT use it to confirm generating or revoking a credential or running a test: those already have their own confirmation with the specific consequence on it, and a vaguer second prompt in front would just train people to click through.",
  inputSchema: z.object({
    question: z.string().describe("The question, phrased for the user. One sentence."),
    options: z
      .array(z.string())
      .min(2)
      .max(5)
      .describe("Short answers, e.g. ['Yes', 'No'] or ['Staging', 'Production']."),
  }),
});

// ── Signed-out only ────────────────────────────────────────────────────────

// Turns "you'll need an account for that" into buttons. Added ONLY to the
// signed-out toolset, so the card can't surface for someone already signed in.
//
// It renders real buttons rather than letting the model write a URL, so the
// card always points at routes that exist.
const promptSignIn = tool({
  description:
    "Show the user sign-in and registration buttons. Use it whenever they ask for something that needs an account — testing an endpoint, credentials, usage, account status. Say in your own words why an account is needed, then call this INSTEAD of writing a sign-in link. It doesn't sign them in and doesn't wait for them — carry on and answer whatever part of their question is public.",
  inputSchema: z.object({
    reason: z
      .string()
      .max(60)
      .optional()
      .describe(
        "What they were trying to do, as a short phrase for the card: 'test an endpoint', 'see your usage'.",
      ),
  }),
  execute: async ({ reason }) => ({
    shown: true,
    reason: reason ?? null,
    note: "The buttons are on screen now. Don't repeat them as links or describe where to click.",
  }),
});

// ── Citizen tools — only added when a session was found ────────────────────

const getMyAccount = tool({
  description:
    "Read the signed-in user's own account: name, account type (basic or developer), where it is in the registration process, what they can and can't do yet, the next step to unlock more, any reviewer remarks, edit cooldowns, and remaining API credits (one allowance PER API catalog — report them per API and never sum them, since a pool running out only blocks that one API). Use it for 'what's my status', 'why can't I create a project', 'why can't I generate a credential', 'how do I become a developer', 'why can't I edit my profile', 'how many credits do I have left'.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const { data } = await apiFetch<{ data: ClientUserProfile }>("/profile", {}, "client");

      // The account has two INDEPENDENT axes and the model must not infer one
      // from the other: a suspended developer still reads type "developer"
      // while being able to do less than a basic account, and completion is a
      // timestamp rather than a status, so a returned account is past it even
      // though its status has moved on. Both capabilities below are computed
      // from the shared account model rather than restated here, so the
      // assistant and the UI can never disagree about what is allowed.
      //
      // Applying has a second gate the account model knows nothing about: the
      // portal-wide `developer_applications` feature flag. With it off
      // the API refuses every submission and the dashboard shows no apply
      // button, so an assistant still telling people to "apply from
      // /dashboard" would be sending them to a control that isn't there.
      const applicationsOpen = await isFeatureEnabled("developer_applications");

      const capabilities = {
        canReview: canReview(data),
        canCreateProjects: canCreateProjects(data),
        canApplyAsDeveloper: canApplyAsDeveloper(data) && applicationsOpen,
        canCompleteProfile: canCompleteProfile(data),
        canEditProfile: canEditProfile(data),
      };

      const details = detailsCooldown(data);
      const photo = photoCooldown(data);

      return {
        displayName: data.display_name,
        // basic = may rate and review once the profile is complete.
        // developer = that plus API credentials and entering projects.
        type: data.type ?? "basic",
        // Where they are in the process. Drives most "why can't I do X".
        status: data.status,
        profileCompleted: Boolean(data.profile_completed_at),
        capabilities,
        // Portal-wide, nothing to do with this account: false means NOBODY
        // can apply right now. Say so plainly if asked how to become a
        // developer, and never invent a date for when it reopens — you are
        // not told one.
        developerApplicationsOpen: applicationsOpen,
        // The single next thing that unlocks something, so the model doesn't
        // have to derive it from the status and get it subtly wrong.
        nextStep: describeNextStep(data, { applicationsOpen }),
        // The full review history, newest first, each entry tagged
        // [Returned|Suspended|Demoted] with its date. On a suspended account
        // the newest Suspended line IS the reason — there is no other field.
        remarks: parseRemarks(data.assessment_remarks).map((entry) => ({
          tag: entry.tag,
          date: entry.date,
          note: entry.body,
        })),
        // Two separate 30-day clocks. A timestamp means locked until then; the
        // window opens at the START of that day.
        editCooldowns: {
          detailsEditableAt: details.until,
          photoEditableAt: photo.until,
        },
        hasEmail: Boolean(data.email),
        hasMobile: Boolean(data.mobile_number),
        // A LIST since 2026-08-24 — one pool per API catalog, each with its
        // own allowance and period. Passed through as-is so the model can
        // answer "how many credits do I have left" per API rather than
        // inventing a total: the pools are isolated, so a sum would be
        // actively misleading when one partner is exhausted and others are
        // full. Omitted by the API for anything that isn't an approved
        // developer, so null here means "no allowance", not "unknown".
        credits: data.credits ?? null,
      };
    } catch (err) {
      return toolError(err, "your account");
    }
  },
});

// Their own entries, which is a different question from the public showcase:
// this includes work that is still a draft or under review and therefore
// invisible publicly.
const getMyProjects = tool({
  description:
    "List the signed-in user's OWN project entries and where each one is in review — draft, submitted, returned with remarks, or published. Use it for 'what are my projects', 'has my project been approved', 'why isn't my project showing', 'what did the reviewer say'. Different from listShowcaseProjects, which is the public catalogue.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const response = await apiFetch<Paginated<ProjectListItem>>(
        "/projects?per_page=50",
        {},
        "client",
      );
      return {
        total: response.meta?.total ?? response.data.length,
        projects: response.data.map((project) => ({
          name: project.name,
          tagline: project.tagline,
          // The pair, not the status alone: a "draft" that is also published
          // means the live version is up while edits await review.
          status: project.status,
          isPubliclyVisible: project.is_published === 1 && project.is_public === 1,
          // While an administrator holds the claim the owner cannot edit or
          // delete, which is the answer to "why can't I change my project".
          lockedForReview: project.is_assessment_started === 1,
          tags: project.tags,
          publishedAt: project.published_at,
          url: `/dashboard/projects/${project.uuid}`,
        })),
      };
    } catch (err) {
      // A basic account gets an empty list rather than an error, so a 403 here
      // is about approval, not about projects.
      if (isApiError(err) && err.status === 403) {
        return {
          error:
            "This account can't manage projects yet. Entering projects needs a developer account.",
        };
      }
      return toolError(err, "your projects");
    }
  },
});

const getMyUsage = tool({
  description:
    "Summarise the signed-in user's own gateway usage: how many calls, which succeeded or failed, and recent failures. Use it for 'why are my calls failing', 'am I being rate limited', 'what did I call recently'.",
  inputSchema: z.object({
    platform: z
      .string()
      .optional()
      .describe("Restrict to one API, using its catalog identifier (e.g. 'emessage')."),
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional()
      .describe("Which month to read, YYYY-MM. Defaults to the current month."),
  }),
  execute: async ({ platform, month }) => {
    try {
      // The citizen's own list is still month-scoped (2026-08-15 handoff §7),
      // unlike the admin lists — so this takes a month, not a date range.
      const params = new URLSearchParams();
      if (platform) params.set("platform", platform);
      if (month) params.set("month", month);
      params.set("per_page", "100");

      const response = await apiFetch<Paginated<GatewayLogListItem>>(
        `/gateway-logs?${params.toString()}`,
        { cache: "no-store" },
        "client",
      );

      const logs = response.data;
      const byStatus: Record<string, number> = {};
      for (const log of logs) {
        const key = log.status_code ?? "no response";
        byStatus[key] = (byStatus[key] ?? 0) + 1;
      }

      return {
        month: month ?? "current",
        platform: platform ?? "all",
        totalCalls: response.meta?.total ?? logs.length,
        statusBreakdown: byStatus,
        // A handful of concrete failures is what makes the answer actionable;
        // the full page of rows would just be noise in the prompt.
        recentFailures: logs
          .filter((log) => !log.status_code || !log.status_code.startsWith("2"))
          .slice(0, 5)
          .map((log) => ({
            platform: log.platform,
            method: log.method,
            url: log.url,
            statusCode: log.status_code,
            requestedAt: log.requested_at,
          })),
      };
    } catch (err) {
      return toolError(err, "your usage");
    }
  },
});

const getMyNotifications = tool({
  description:
    "Read the signed-in user's own notification center: what they were told and when, and how many are unread. Use it for 'did I miss anything', 'what's this notification about', 'was I notified when my project was published', 'what announcements have there been', 'do I have anything unread'. Scoped to them by their session — there is no way to read anyone else's.",
  inputSchema: z.object({
    unreadOnly: z
      .boolean()
      .optional()
      .describe("Only the ones they have not read yet. Omit for the recent history."),
    type: z
      .string()
      .optional()
      .describe(
        "Restrict to one kind, e.g. 'announcement', 'project.published', 'credits.low'. Omit unless the user asked about a specific kind.",
      ),
  }),
  execute: async ({ unreadOnly, type }) => {
    try {
      const page = await getNotifications({ unread: unreadOnly, type, perPage: 15 });

      return {
        // Account-wide, not the count of the rows below — it is the number on
        // the bell.
        unreadCount: page.meta.unread_count,
        total: page.meta.total,
        url: "/dashboard/notifications",
        // Rendered through the SAME mapper the bell uses, so what the
        // assistant says a notification means is what the user can see it
        // says. Raw `data` payloads are deliberately not passed through: they
        // carry per-type keys the model would have to interpret itself, and it
        // would occasionally interpret them differently from the UI.
        notifications: page.data.map((notification) => {
          const content = notificationContent(notification);
          return {
            type: notification.type,
            title: content.title,
            detail: content.body,
            unread: notification.read_at === null,
            createdAt: notification.created_at,
            // Relative path or null. Give it to the user as-is when it exists.
            link: content.href,
          };
        }),
      };
    } catch (err) {
      return toolError(err, "your notifications");
    }
  },
});

const listMyCredentials = tool({
  description:
    "List which APIs the signed-in user holds a gateway credential for, with each one's base URL and when it was last used. Use it for 'which credentials do I have', 'do I have one for eMessage', 'what's my base URL', or before proposing to generate or revoke one.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // The catalog LIST doesn't embed credentials — only the show does — so
      // this fans out one show per catalog. Bounded and parallel: there are
      // single digits of catalogs, and the alternative (making the model call
      // a per-catalog tool in a loop) burns turns against the step limit.
      const { data: catalogs } = await apiFetch<{ data: { identifier: string }[] }>(
        "/api-catalogs?order_by=identifier&sort_by=asc&per_page=100",
        { next: { tags: ["api-catalogs"] } },
        "client",
      );

      const results = await Promise.all(
        catalogs.slice(0, MAX_CREDENTIAL_LOOKUPS).map(async (catalog) => {
          try {
            const { data } = await apiFetch<{ data: UserApiCatalog }>(
              `/api-catalogs/${encodeURIComponent(catalog.identifier)}`,
              { next: { tags: ["api-catalogs"] } },
              "client",
            );
            return {
              identifier: data.identifier,
              name: data.name,
              hasCredential: Boolean(data.credential),
              isActive: data.credential?.is_active === 1,
              baseUrl: data.credential?.public?.base_url ?? null,
              createdAt: data.credential?.created_at ?? null,
              lastUsedAt: data.credential?.last_used_at ?? null,
              // Field NAMES only. The values are masked hints server-side and
              // would tell the model nothing, so there's no reason to put
              // anything credential-shaped into its context at all.
              secretFieldNames: Object.keys(data.credential?.secret_hint ?? {}),
            };
          } catch {
            // One unreadable catalog shouldn't blank the whole answer.
            return { identifier: catalog.identifier, unavailable: true };
          }
        }),
      );

      return { catalogs: results, truncated: catalogs.length > MAX_CREDENTIAL_LOOKUPS };
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        return {
          error:
            "Your account isn't approved yet, so the API catalog and credentials aren't available. Check your account status.",
        };
      }
      return toolError(err, "your credentials");
    }
  },
});

// ── Actions — all executed on the CLIENT, never here ───────────────────────

// No `execute`, which is what makes the AI SDK forward the call to the browser
// instead of running it server-side. Two reasons, both hard constraints:
//
// 1. The server CANNOT make this call. A gateway credential's plaintext secret
//    is returned exactly once, at mint time; afterwards the API only exposes a
//    masked secret_hint. Only the browser, where the citizen has their own
//    credential, can sign a real gateway request — which is exactly how the
//    existing Try-it panel works.
// 2. Every completed gateway call spends one of the citizen's usage credits.
//    Routing it through the client means the widget can require an explicit
//    confirmation before anything is sent.
const testApiCatalogEndpoint = tool({
  description:
    "Propose running one of an API's example requests against the live gateway, using the user's own credential. The user must confirm before it runs, and each run spends one usage credit. Call getApiCatalog first and use a requestName exactly as listed there. Only offer this when the user actually asks to test or try an endpoint.",
  inputSchema: z.object({
    identifier: z.string().describe("The catalog identifier, e.g. 'compass'."),
    requestName: z
      .string()
      .describe("The endpoint's name exactly as returned by getApiCatalog, e.g. 'Get SAAODB Records'."),
  }),
});

// Client-executed so the choices come from the real catalog and spec rather
// than from the model listing what it remembers. Pure UI: it changes nothing
// and costs nothing, it just turns "which API?" into buttons.
const chooseTestTarget = tool({
  description:
    "Ask the user to pick which API and which endpoint they want to test, as buttons. Use this whenever they want to test something but haven't said exactly what — do NOT guess an endpoint, and do NOT ask them to type an identifier. Pass `identifier` when they've already named the API, to skip straight to choosing an endpoint. It returns their choice; carry on with the testing order from there.",
  inputSchema: z.object({
    identifier: z
      .string()
      .optional()
      .describe("Set only if the user already named the API, e.g. 'egov-sso'."),
    justTested: z
      .string()
      .optional()
      .describe(
        "The endpoint just tested, when offering the next one — it is marked as already run in the list.",
      ),
  }),
});

// Client-executed of necessity: these variables live in the browser's
// localStorage (the docs' Test tab owns them), so the server can neither read
// nor write them — and it must not, since they hold the user's client secret
// in plaintext. The model only ever learns which NAMES exist, never a value.
const manageCatalogVariables = tool({
  description:
    "Open an editor for one API's test variables — the {{tokens}} its example requests resolve against, such as a client id, secret or base URL. Use it after a credential is generated, or when a test fails because a placeholder wasn't filled in. You cannot read or set the values yourself; the user edits them.",
  inputSchema: z.object({
    identifier: z.string().describe("The catalog identifier, e.g. 'compass'."),
  }),
});

// Client-executed because both outcomes need the browser: minting an exchange
// code has to write the result into the collection variables the Test tab
// keeps in localStorage (otherwise the follow-up test still has an unresolved
// {{exchange_code}}), and a face-liveness session can only be produced by the
// eKYC SDK driving the user's camera.
const prepareCatalogTest = tool({
  description:
    "Satisfy an API's testing prerequisite before its endpoints can be called — an eGov exchange code, or a face-liveness session. Both run in the chat. Call getApiCatalog first: if its `prerequisite` is null the API needs nothing and you must NOT call this. When `prerequisite.needsCamera` is true, say the card will run a camera liveness check they need to complete.",
  inputSchema: z.object({
    identifier: z.string().describe("The catalog identifier, e.g. 'egov-sso' or 'everify'."),
  }),
});

// Also client-executed, for a different reason than the test tool. Here the
// server COULD run it — the actions exist and are session-guarded — but a mint
// returns plaintext secret material exactly once, and a tool's output becomes
// permanent message history replayed to the model every subsequent turn. Doing
// it on the client lets the widget show the secret to the human and hand the
// model only a non-secret acknowledgement, so the plaintext never enters the
// model's context at all.
//
// The confirmation is also the point: revoking breaks every live integration
// using that credential, immediately.
const manageApiCatalogCredential = tool({
  description:
    "Propose generating or revoking the user's gateway credential for one API. The user must confirm in the UI before anything happens; you never perform it yourself, and you will not be told the secret. Call listMyCredentials first — generating fails if an active credential already exists, and revoking immediately breaks any integration using it. Only offer this when the user actually asks to create or revoke a credential.",
  inputSchema: z.object({
    identifier: z.string().describe("The catalog identifier, e.g. 'compass'."),
    action: z
      .enum(["generate", "revoke"])
      .describe("'generate' issues a new credential; 'revoke' permanently disables the current one."),
  }),
});

export function buildTools({ signedIn }: { signedIn: boolean }) {
  const publicTools = {
    listApiCatalogs: makeListApiCatalogs(signedIn),
    showApiCatalogs: makeShowApiCatalogs(signedIn),
    getApiCatalog,
    getApiEndpoint,
    getContentBlock,
    listShowcaseProjects,
    askUser,
  };

  // The documentation tools are the whole public surface, and they're the
  // point: a visitor who wants to test an endpoint can still read its real
  // contract. promptSignIn is what gets them the account for the rest.
  if (!signedIn) return { ...publicTools, promptSignIn };

  return {
    ...publicTools,
    getMyAccount,
    getMyProjects,
    getMyUsage,
    getMyNotifications,
    listMyCredentials,
    chooseTestTarget,
    prepareCatalogTest,
    manageCatalogVariables,
    testApiCatalogEndpoint,
    manageApiCatalogCredential,
  };
}

export type AssistantTools = ReturnType<typeof buildTools>;
