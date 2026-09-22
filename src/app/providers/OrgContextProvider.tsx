import { useLocation, useNavigate } from "react-router-dom";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { loadAccess, loadWorkspace } from "../../features/organizations/api";
import type { Action } from "../../shared/types/actions";
import type { Viewer, WorkspaceState, Role } from "../../shared/types";
import { mutate } from "../../shared/lib/mutations";
import { queryClient } from "./QueryClientProvider";
import { useAuth } from "./AuthProvider";
import { Button, Notice } from "../../shared/components";
import { Onboarding } from "../../features/organizations/components/Onboarding";
const Context = createContext<{
  state: WorkspaceState;
  viewer: Viewer;
  switchWorkspace: (id: string) => void;
  organizationWorkspaces: { id: string; name: string; role: Role }[];
  act: (action: Action, message?: string) => Promise<boolean>;
  toast: string;
  notify: (s: string) => void;
  busy: boolean;
  isPlatform: boolean;
  refresh: () => Promise<void>;
} | null>(null);
const empty: WorkspaceState = {
  version: 1,
  orgs: [],
  members: [],
  courses: [],
  lessons: [],
  sessions: [],
  assignments: [],
  submissions: [],
  attendance: {},
  reports: [],
};
export function OrgContextProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const userId = session!.user.id;
  const access = useQuery({
    queryKey: ["access", userId],
    queryFn: loadAccess,
    refetchInterval: 30000,
  });
  const preferenceKey = `workspace-choice:${userId}`;
  const [preference] = useState<{ platform?: boolean; orgId?: string }>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(preferenceKey) || "{}") || {};
    } catch {
      return {};
    }
  });
  const [platformRoute, setPlatformRoute] = useState(
    path.startsWith("/organizations") ||
      ((!path || path === "/" || path.startsWith("/profile")) &&
        preference.platform === true),
  );
  useEffect(() => {
    if (!path.startsWith("/profile")) {
      setPlatformRoute(path.startsWith("/organizations"));
    }
  }, [path]);
  const [selected, setSelected] = useState(preference.orgId || "");
  const [toast, notify] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const organizationWorkspaces = (access.data?.orgs || []).flatMap((org) => {
    const membership = access.data?.memberships.find((m) => m.orgId === org.id);
    return membership
      ? [{ id: org.id, name: org.name, role: membership.role }]
      : [];
  });
  // Platform-visible organizations do not imply an organization membership.
  const memberOrgIds = new Set(organizationWorkspaces.map((org) => org.id));
  const requestedOrg = access.data?.orgs.find(
    (org) =>
      org.slug === new URLSearchParams(location.search).get("org") &&
      memberOrgIds.has(org.id),
  );
  const orgId =
    (memberOrgIds.has(selected)
      ? selected
      : requestedOrg?.id || organizationWorkspaces[0]?.id) ||
    access.data?.orgs[0]?.id ||
    "";
  const membership = access.data?.memberships.find((m) => m.orgId === orgId);
  const platformActive = Boolean(
    access.data?.platform && (platformRoute || !membership),
  );
  useEffect(() => {
    if (!access.data) return;
    try {
      sessionStorage.setItem(
        preferenceKey,
        JSON.stringify({
          platform: platformActive,
          orgId: membership ? orgId : "",
        }),
      );
    } catch {
      /* Storage may be unavailable; switching still works. */
    }
  }, [access.data, platformActive, preferenceKey, orgId, membership]);
  function switchWorkspace(id: string) {
    if (busy) return;
    if (id === "platform") {
      if (!access.data?.platform) return;
      setPlatformRoute(true);
      navigate("/organizations");
    } else {
      if (!memberOrgIds.has(id)) return;
      setSelected(id);
      setPlatformRoute(false);
      navigate("/dashboard");
    }
    notify("");
  }
  const workspace = useQuery({
    queryKey: ["workspace", userId, orgId, membership?.role],
    queryFn: () => loadWorkspace(orgId),
    enabled: Boolean(orgId && membership && !platformActive),
    refetchInterval: 30000,
  });
  useEffect(() => () => queryClient.clear(), [userId]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => notify(""), 6500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["access", userId] });
    await queryClient.invalidateQueries({ queryKey: ["workspace", userId] });
  }
  async function act(action: Action, message = "Changes saved.") {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    notify("");
    try {
      await mutate(orgId, action);
      await refresh();
      notify(message);
      return true;
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to save. Please try again.",
      );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (access.isPending)
    return (
      <div className="loading-screen" role="status">
        Opening your learning space…
      </div>
    );
  if (access.isError)
    return (
      <div className="auth-card">
        <Notice>{access.error.message}</Notice>
        <Button onClick={() => access.refetch()}>Try again</Button>
      </div>
    );
  if (
    new URLSearchParams(location.search).has("invite") ||
    (!access.data.platform && !membership)
  )
    return <Onboarding refresh={refresh} />;
  if (workspace.isPending && membership && !platformActive)
    return (
      <div className="loading-screen" role="status">
        Loading your organization…
      </div>
    );
  if (workspace.isError && membership && !platformActive)
    return (
      <div className="auth-card">
        <Notice>{workspace.error.message}</Notice>
        <Button onClick={() => workspace.refetch()}>Try again</Button>
      </div>
    );
  const viewer: Viewer = {
    userId,
    orgId,
    role: platformActive ? "super-admin" : membership!.role,
  };
  return (
    <Context.Provider
      value={{
        state: {
          ...(membership && !platformActive ? workspace.data || empty : empty),
          orgs: access.data.orgs,
        },
        viewer,
        switchWorkspace,
        organizationWorkspaces,
        act,
        busy,
        isPlatform: access.data.platform,
        toast,
        notify,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Organization context missing");
  return value;
}
