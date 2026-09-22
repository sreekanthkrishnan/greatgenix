import { ProfileMenu } from "../../shared/components/ProfileMenu";
import { useAuth } from "../providers/AuthProvider";
import {
  roleContent,
  initialsFor,
  profileText,
} from "../../shared/utils/roleContent";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Sprout,
  Users,
  Video,
  X,
} from "lucide-react";
import { useWorkspace } from "../providers/OrgContextProvider";
import { useRoute, Router } from "../router";
import { Avatar, Unavailable } from "../../shared/components";
import { applyBranding, defaultBranding } from "../../shared/utils/branding";
import { signOut } from "../../features/auth/api";
export function WorkspaceLayout() {
  const {
    state,
    viewer,
    toast,
    notify,
    busy,
    isPlatform,
    switchWorkspace,
    organizationWorkspaces,
  } = useWorkspace();
  const { session } = useAuth();
  const copy = roleContent[viewer.role];
  const route = useRoute();
  const [menu, setMenu] = useState(false);
  const platform = viewer.role === "super-admin";
  const org = platform
    ? {
        id: "platform",
        name: "Platform administration",
        active: true,
        branding: defaultBranding,
        features: {
          live: false,
          recordings: false,
          assessments: false,
          attendance: false,
        },
      }
    : state.orgs.find((o) => o.id === viewer.orgId)!;
  const branding = org.branding || defaultBranding;
  const member = state.members.find((m) => m.id === viewer.userId);
  const displayName =
    profileText(session?.user.user_metadata.name) ||
    member?.name ||
    "My profile";
  const initials = initialsFor(displayName);
  useEffect(() => {
    applyBranding(branding);
    document.title = org.name;
    return () => {
      applyBranding(defaultBranding);
      document.title = "Learning workspace";
    };
  }, [branding, org.name]);
  useEffect(() => {
    setMenu(false);
  }, [route]);
  const nav = platform
    ? [{ id: "organizations", label: "Organizations", icon: Users }]
    : [
        { id: "dashboard", label: "Overview", icon: LayoutDashboard },
        {
          id: "courses",
          label: viewer.role === "student" ? "My courses" : "My classroom",
          icon: BookOpen,
        },
        ...(org.features.live
          ? [{ id: "sessions", label: "Class schedule", icon: CalendarDays }]
          : []),
        ...(org.features.recordings
          ? [{ id: "recordings", label: "Lesson library", icon: Video }]
          : []),
        ...(org.features.assessments
          ? [
              {
                id: "assessments",
                label:
                  viewer.role === "student"
                    ? "My work & results"
                    : "Assessments",
                icon: ClipboardCheck,
              },
            ]
          : []),
        ...(org.features.attendance && viewer.role !== "student"
          ? [{ id: "attendance", label: "Attendance", icon: Users }]
          : []),
        ...(viewer.role === "teacher-admin"
          ? [{ id: "settings", label: "Organization", icon: Settings2 }]
          : []),
      ];
  return (
    <div className="app production-app">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand"
          href={platform ? "#/organizations" : "#/dashboard"}
        >
          {branding.logoUrl ? (
            <img
              className="brand-image"
              src={branding.logoUrl}
              alt={`${org.name} logo`}
            />
          ) : (
            <span className="brand-mark">
              <Sprout size={28} />
            </span>
          )}
          <span>
            {org.name}
            <small>{branding.tagline}</small>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-picker"></div>
        {/* <span className="nav-caption">{copy.workspace.toUpperCase()}</span> */}
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <a
              key={n.id}
              className={route.split("/")[0] === n.id ? "active" : ""}
              aria-current={route.split("/")[0] === n.id ? "page" : undefined}
              href={`#/${n.id}`}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={23} />
            <p>{branding.tagline}</p>
          </div>
          <div className="profile">
            <div className="profile-link">
              <Avatar initials={initials} />
              <div>
                <strong>{displayName}</strong>
                <small>{copy.label}</small>
              </div>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={() => signOut().catch((e) => notify(e.message))}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-overlay"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>{org.name}</span>
            <span>/</span>
            <strong>
              {route.split("/")[0] === "profile"
                ? "My profile"
                : nav.find((n) => n.id === route.split("/")[0])?.label}
            </strong>
          </div>
          <div className="topbar-right">
            {busy && <span role="status">Saving…</span>}
            <span className="today">
              {new Date().toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <ProfileMenu
              name={displayName}
              role={copy.label}
              initials={initials}
              route={route}
              workspaces={[
                ...(isPlatform
                  ? [
                      {
                        id: "platform",
                        name: "Platform administration",
                        role: "Platform administrator",
                      },
                    ]
                  : []),
                ...organizationWorkspaces.map((org) => ({
                  ...org,
                  role: roleContent[org.role].label,
                })),
              ]}
              activeWorkspace={platform ? "platform" : viewer.orgId}
              onSwitchWorkspace={switchWorkspace}
              busy={busy}
            />
          </div>
        </header>
        <main className="main" key={`${viewer.orgId}-${viewer.role}-${route}`}>
          <>
            {!org.active && !platform && route.split("/")[0] !== "profile" ? (
              <Unavailable
                title="This organization is suspended"
                text="Contact the platform administrator to restore access. Existing records are preserved."
              />
            ) : (
              <Router route={route} platform={platform} />
            )}
          </>
          <footer className="page-footer">
            <span>
              <Sprout size={15} />
              {branding.tagline}
            </span>
            <span>{org.name}</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
