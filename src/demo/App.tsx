import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Sprout,
  Users,
  Video,
  X,
} from "lucide-react";
import { DemoProvider, useDemo } from "./demo";
import { canAdmin, isTeacher, type Role } from "./model";
import {
  Assessments,
  Attendance,
  CourseDetail,
  Courses,
  Dashboard,
  DemoAccess,
  Organizations,
  Recordings,
  Sessions,
  Settings,
} from "./pages";
import { Avatar, Button, Modal, Notice, Unavailable } from "./ui";

const roleLabels: Record<Role, string> = {
  teacher: "Teacher",
  student: "Student",
  "teacher-admin": "Teacher + admin",
  "super-admin": "Platform super-admin",
};
function Workspace() {
  const { state, viewer, setRole, setOrg, toast, reset, storageWarning } =
    useDemo();
  const [route, setRoute] = useState(
    () => window.location.hash.slice(2) || "dashboard",
  );
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  useEffect(() => {
    const update = () => {
      setRoute(window.location.hash.slice(2) || "dashboard");
      setMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const [page, id] = route.split("/");
  const org = state.orgs.find((o) => o.id === viewer.orgId) || state.orgs[0];
  const teacher = isTeacher(viewer.role);
  const platform = viewer.role === "super-admin";
  const member = state.members.find((m) => m.id === viewer.userId);
  const displayName = platform
    ? "Platform preview"
    : member?.name || "Demo educator";
  const nav = platform
    ? [{ id: "organizations", label: "Organizations", icon: Users }]
    : [
        { id: "dashboard", label: "Overview", icon: LayoutDashboard },
        {
          id: "courses",
          label: teacher ? "My classroom" : "My courses",
          icon: BookOpen,
        },
        { id: "sessions", label: "Class schedule", icon: CalendarDays },
        { id: "recordings", label: "Lesson library", icon: Video },
        {
          id: "assessments",
          label: teacher ? "Assessments" : "My work & results",
          icon: ClipboardCheck,
        },
        ...(teacher
          ? [{ id: "attendance", label: "Attendance", icon: Users }]
          : []),
        ...(canAdmin(viewer.role)
          ? [{ id: "settings", label: "Organization", icon: Settings2 }]
          : []),
      ];
  function changeRole(value: Role) {
    setRole(value);
    window.location.hash =
      value === "super-admin" ? "#/organizations" : "#/dashboard";
  }
  function screen() {
    if (page === "access")
      return (
        <DemoAccess
          enter={() => {
            window.location.hash = platform ? "#/organizations" : "#/dashboard";
          }}
        />
      );
    if (!platform && !org.active)
      return (
        <Unavailable
          title="This demo organization is suspended"
          text="A platform super-admin can restore it in the local preview. Its records are preserved."
        />
      );
    if (platform) return <Organizations key="platform" />;
    switch (page) {
      case "dashboard":
        return <Dashboard />;
      case "courses":
        return id ? <CourseDetail id={id} key={id} /> : <Courses />;
      case "sessions":
        return <Sessions id={id} key={id || "list"} />;
      case "recordings":
        return <Recordings id={id} key={id || "list"} />;
      case "assessments":
        return <Assessments />;
      case "attendance":
        return <Attendance />;
      case "settings":
        return <Settings />;
      case "organizations":
        return <Organizations />;
      default:
        return (
          <Unavailable
            title="Let’s find your way back"
            text="This page is not part of the preview. Your overview is a good place to start."
          />
        );
    }
  }
  return (
    <div className="app">
      <div className="demo-bar">
        <div>
          <span className="demo-pill">LOCAL DEMO</span>
          <span className="demo-explanation">
            Fictional data · browser-only changes
          </span>
        </div>
        <div className="demo-controls">
          <label>
            Preview as
            <select
              aria-label="Demo role"
              value={viewer.role}
              onChange={(e) => changeRole(e.target.value as Role)}
            >
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setResetModal(true)}>Reset demo</button>
        </div>
      </div>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand"
          href={platform ? "#/organizations" : "#/dashboard"}
        >
          <span className="brand-mark">
            <Sprout size={25} />
          </span>
          <span>
            great<span className="brand-light">genix</span>
            <small>ROOM TO GROW.</small>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-picker">
          <span className="workspace-logo">{org.name.charAt(0)}</span>
          <div>
            <small>DEMO ORGANIZATION</small>
            <select
              aria-label="Demo organization"
              value={viewer.orgId}
              onChange={(e) => {
                setOrg(e.target.value);
                window.location.hash = platform
                  ? "#/organizations"
                  : "#/dashboard";
              }}
            >
              {state.orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-caption">
          {platform ? "PLATFORM" : "YOUR WORKSPACE"}
        </span>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <a
              key={n.id}
              href={`#/${n.id}`}
              className={page === n.id ? "active" : ""}
              aria-current={page === n.id ? "page" : undefined}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === "recordings" && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Leaf size={23} />
            <p>
              Good things grow
              <br />
              when we learn together.
            </p>
            <button onClick={() => setHelp(true)}>
              About this preview <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="profile">
            <Avatar initials={member?.initials || "GG"} />
            <div>
              <strong>{displayName}</strong>
              <small>{roleLabels[viewer.role]}</small>
            </div>
            <a href="#/access" aria-label="Open demo access screen">
              <LogOut size={17} />
            </a>
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
            <span>{platform ? "Platform" : org.name}</span>
            <span className="slash">/</span>
            <strong>
              {nav.find((n) => n.id === page)?.label || "Your learning space"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="today">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <button
              className="icon-button"
              aria-label="About the demo"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={20} />
            </button>
            <Avatar initials={member?.initials || "GG"} small />
          </div>
        </header>
        <main
          key={`${viewer.orgId}-${viewer.role}`}
          className={page === "access" ? "main access-main" : "main"}
        >
          {storageWarning && (
            <div className="inline-error" role="alert">
              Browser storage is unavailable. Demo changes will last only until
              this page closes.
            </div>
          )}
          {screen()}
          <footer className="page-footer">
            <span>
              <Sprout size={15} /> Made for curious minds.
            </span>
            <span>Great Genix · Initial MVP preview</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckToast />
          {toast}
        </div>
      )}
      {help && (
        <Modal
          title="A preview with room to grow"
          description="Real screens. Fictional classroom data."
          close={() => setHelp(false)}
        >
          <div className="help-content">
            <p>
              Explore courses, schedule sample classes, mark attendance, submit
              demo work and publish reviewed lesson metadata. Your changes stay
              in this browser and can be reset.
            </p>
            <Notice>
              Supabase Auth, database persistence, invitations, live calls and
              video uploads/playback are not connected. No messages are sent.
            </Notice>
            <p>
              Use the demo role and organization selectors to explore different
              views. They are preview controls, not real authentication or
              security. Only the “Teacher + admin” persona has organization
              settings.
            </p>
            <p>
              All people and example.com addresses are fictional. Please do not
              enter real student information in this prototype.
            </p>
            <Button variant="secondary" onClick={() => setHelp(false)}>
              Back to exploring <ArrowRightIcon />
            </Button>
          </div>
        </Modal>
      )}
      {resetModal && (
        <Modal
          title="Start fresh?"
          description="This clears only this browser’s fictional demo changes."
          close={() => setResetModal(false)}
        >
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setResetModal(false)}>
              Keep exploring
            </Button>
            <Button
              onClick={() => {
                reset();
                setResetModal(false);
                window.location.hash = platform
                  ? "#/organizations"
                  : "#/dashboard";
              }}
            >
              Reset local demo
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function CheckToast() {
  return <ShieldCheck size={18} />;
}
function ArrowRightIcon() {
  return <ArrowUpRight size={16} />;
}
export default function App() {
  return (
    <DemoProvider>
      <Workspace />
    </DemoProvider>
  );
}
