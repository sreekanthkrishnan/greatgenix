import { Link } from "react-router-dom";
import { useEffect, useId, useRef, useState } from "react";
import { UserRound, Building2, ShieldCheck, Check } from "lucide-react";
import { Avatar } from "./index";

export function ProfileMenu({
  name,
  role,
  initials,
  route,
  workspaces,
  activeWorkspace,
  onSwitchWorkspace,
  busy,
}: {
  name: string;
  role: string;
  initials: string;
  route: string;
  workspaces: { id: string; name: string; role: string }[];
  activeWorkspace: string;
  onSwitchWorkspace: (id: string) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const id = useId();
  useEffect(() => setOpen(false), [route, activeWorkspace]);
  useEffect(() => {
    if (!open) return;
    link.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className="header-profile-menu"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        className="topbar-profile"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar initials={initials} small />
      </button>
      {open && (
        <div id={id} className="profile-dropdown">
          <div className="profile-dropdown-identity">
            <strong>{name}</strong>
            <small>{role}</small>
          </div>
          <nav aria-label="Account">
            <Link
              ref={link}
              to="/profile"
              aria-current={
                route.split("/")[0] === "profile" ? "page" : undefined
              }
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <UserRound size={17} />
              My profile
            </Link>
          </nav>
          {workspaces.length > 1 && (
            <div className="workspace-switcher" aria-label="Switch workspace">
              <p>Switch workspace</p>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  aria-pressed={workspace.id === activeWorkspace}
                  disabled={busy || workspace.id === activeWorkspace}
                  onClick={() => {
                    onSwitchWorkspace(workspace.id);
                    setOpen(false);
                    trigger.current?.focus();
                  }}
                >
                  {workspace.id === "platform" ? (
                    <ShieldCheck size={17} />
                  ) : (
                    <Building2 size={17} />
                  )}
                  <span>
                    <strong>{workspace.name}</strong>
                    <small>{workspace.role}</small>
                  </span>
                  {workspace.id === activeWorkspace && <Check size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
