import { Suspense } from "react";
import {
  CalendarRange,
  FileText,
  FolderKanban,
  Images,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  Megaphone,
  ScrollText,
  Settings,
  UserRound,
} from "lucide-react";
import { NavGroup } from "@/modules/admin/components/nav-group";
import { NavLink } from "@/modules/admin/components/nav-link";
import { LogsNav } from "@/modules/admin/components/logs-nav";
import { UsersStatusNav, UsersStatusNavFallback } from "@/modules/admin/components/users-status-nav";
import {
  ProjectsStatusNav,
  ProjectsStatusNavFallback,
} from "@/modules/admin/components/projects-status-nav";
import {
  LOG_NAV_LINKS,
  visibleLogLinks,
  type LogNavPermissions,
} from "@/modules/admin/lib/log-nav-links";
import {
  accessControlLinks,
  NO_NAV_SECTIONS,
  type NavSectionPermissions,
} from "@/modules/admin/lib/nav-sections";
import { AccessControlNav } from "@/modules/admin/components/access-control-nav";
import { SettingsNav } from "@/modules/admin/components/settings-nav";

// `logs` is resolved by whichever Server Component renders this nav
// (AdminSidebar on desktop, AdminHeader -> MobileSidebar on mobile) and passed
// down as plain booleans — this component is also part of a client tree, so it
// can't read the admin's permissions itself.
const NO_LOGS: LogNavPermissions = {
  gateway: false,
  connection: false,
  auth: false,
  audit: false,
};

export function AdminNav({
  onNavigate,
  logs = NO_LOGS,
  // Hidden without `projects-view` — the API answers 403 either way, this
  // just keeps a destination the admin can't use out of the menu.
  canViewProjects = false,
  // Hidden without `egov-events-view`, which is granted separately from the
  // projects permissions.
  canViewEvents = false,
  // Hidden without `notifications-broadcast`. Its own permission group, and
  // no role holds it until it is granted — so this entry being absent right
  // after the deploy is expected, not a bug.
  canBroadcast = false,
  // The formerly-unconditional entries, each hidden without its `*-view`
  // permission (Access Control on either of two) — see nav-sections.ts.
  // Dashboard and Settings deliberately stay ungated.
  sections = NO_NAV_SECTIONS,
  // Hidden without `developer-access`, which ONLY is_developer administrators
  // hold and which is granted at login rather than through a role — so this
  // child is invisible to every ordinary administrator no matter what their
  // role grants, and it can never be handed out from Access Control.
  canManageFeatureFlags = false,
}: {
  onNavigate?: () => void;
  logs?: LogNavPermissions;
  canViewProjects?: boolean;
  canViewEvents?: boolean;
  canBroadcast?: boolean;
  sections?: NavSectionPermissions;
  canManageFeatureFlags?: boolean;
}) {
  // Empty when the admin holds none of the four log permissions, in which case
  // the parent entry disappears along with its children.
  const logLinks = visibleLogLinks(logs);

  return (
    // px-2 at the rail so a 2.25rem icon square is not squeezed by 1rem of
    // padding either side of a 4rem column.
    <nav
      aria-label="Admin"
      className="flex-1 space-y-1 p-4 group-data-[collapsed=true]/sidebar:px-2"
    >
      <NavLink
        href="/admin"
        icon={<LayoutDashboard aria-hidden className="size-4" />}
        onClick={onNavigate}
      >
        Dashboard
      </NavLink>
      {/* Account Activation (/admin/activation) is hidden from the menu for
          now — the route still exists and is reachable by URL. Restore this
          NavLink (icon: QrCode) when it's ready to be surfaced again. */}
      {sections.users && (
        <NavGroup
          storageKey="users"
          label="Users"
          prefixes={["/admin/users"]}
          parent={
            <NavLink
              href="/admin/users"
              icon={<UserRound aria-hidden className="size-4" />}
              onClick={onNavigate}
            >
              Users
            </NavLink>
          }
        >
          {/* No room for an indented list on a 4rem rail, and no point in one:
            focusing or hovering the rail peeks it open, which brings these
            back before anyone needs to click them. */}
          <div className="group-data-[collapsed=true]/sidebar:hidden">
            <Suspense fallback={<UsersStatusNavFallback onNavigate={onNavigate} />}>
              <UsersStatusNav onNavigate={onNavigate} />
            </Suspense>
          </div>
        </NavGroup>
      )}
      {canViewProjects && (
        // Same shape as Users: a parent entry with an indented status list,
        // which is how an assessor actually navigates this screen.
        <NavGroup
          storageKey="projects"
          label="Projects"
          prefixes={["/admin/projects"]}
          parent={
            <NavLink
              href="/admin/projects"
              icon={<FolderKanban aria-hidden className="size-4" />}
              onClick={onNavigate}
            >
              Projects
            </NavLink>
          }
        >
          <div className="group-data-[collapsed=true]/sidebar:hidden">
            <Suspense fallback={<ProjectsStatusNavFallback onNavigate={onNavigate} />}>
              <ProjectsStatusNav onNavigate={onNavigate} />
            </Suspense>
          </div>
        </NavGroup>
      )}
      {sections.catalogs && (
        <NavLink
          href="/admin/api-catalogs"
          icon={<LayoutGrid aria-hidden className="size-4" />}
          onClick={onNavigate}
        >
          API Catalog
        </NavLink>
      )}
      {canBroadcast && (
        <NavLink
          href="/admin/broadcasts"
          icon={<Megaphone aria-hidden className="size-4" />}
          onClick={onNavigate}
        >
          Broadcasts
        </NavLink>
      )}
      {canViewEvents && (
        <NavLink
          href="/admin/egov-events"
          icon={<CalendarRange aria-hidden className="size-4" />}
          onClick={onNavigate}
        >
          eGov Events
        </NavLink>
      )}
      {logLinks.length > 0 && (
        // Same shape as Users above: a parent entry with its own indented
        // child list. Unlike Users there's no aggregate "all logs" page to
        // land on, so the parent points at the first viewer this admin is
        // allowed to see — which is also the first child. The group counts as
        // active on ALL four viewers' routes, not just the visible ones — you
        // can't be on a route you can't view anyway.
        <NavGroup
          storageKey="logs"
          label="Logs"
          prefixes={LOG_NAV_LINKS.map((link) => link.href)}
          parent={
            <NavLink
              href={logLinks[0].href}
              icon={<ScrollText aria-hidden className="size-4" />}
              onClick={onNavigate}
            >
              Logs
            </NavLink>
          }
        >
          <div className="group-data-[collapsed=true]/sidebar:hidden">
            <LogsNav logs={logs} onNavigate={onNavigate} />
          </div>
        </NavGroup>
      )}
      {sections.contents && (
        <NavLink
          href="/admin/contents"
          icon={<FileText aria-hidden className="size-4" />}
          onClick={onNavigate}
        >
          Content Blocks
        </NavLink>
      )}
      {sections.gallery && (
        <NavLink
          href="/admin/gallery"
          icon={<Images aria-hidden className="size-4" />}
          onClick={onNavigate}
        >
          Gallery
        </NavLink>
      )}
      {(() => {
        // Administrators and Roles grouped under one Access Control parent —
        // the Logs shape: no aggregate page, so the parent links to the first
        // child this admin may see, and vanishes with the last one.
        const acLinks = accessControlLinks(sections);
        if (acLinks.length === 0) return null;
        return (
          <NavGroup
            storageKey="access-control"
            label="Access Control"
            prefixes={["/admin/administrators", "/admin/access-control"]}
            parent={
              <NavLink
                href={acLinks[0].href}
                icon={<Lock aria-hidden className="size-4" />}
                onClick={onNavigate}
              >
                Access Control
              </NavLink>
            }
          >
            <div className="group-data-[collapsed=true]/sidebar:hidden">
              <AccessControlNav sections={sections} onNavigate={onNavigate} />
            </div>
          </NavGroup>
        );
      })()}
      {/* Change password and System Controls (the feature-flags screen)
          grouped under Settings — the Access Control shape. Change password
          IS /admin/settings, so the parent links straight to it and the group
          never vanishes; System Controls keeps its developer-access gate,
          just as a child now instead of a top-level entry. */}
      <NavGroup
        storageKey="settings"
        label="Settings"
        prefixes={["/admin/settings", "/admin/feature-flags"]}
        parent={
          <NavLink
            href="/admin/settings"
            icon={<Settings aria-hidden className="size-4" />}
            onClick={onNavigate}
          >
            Settings
          </NavLink>
        }
      >
        <div className="group-data-[collapsed=true]/sidebar:hidden">
          <SettingsNav canManageFeatureFlags={canManageFeatureFlags} onNavigate={onNavigate} />
        </div>
      </NavGroup>
    </nav>
  );
}
