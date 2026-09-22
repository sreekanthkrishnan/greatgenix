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
import type { Viewer, WorkspaceState } from "../../shared/types";
import { mutate } from "../../shared/lib/mutations";
import { queryClient } from "./QueryClientProvider";
import { useAuth } from "./AuthProvider";
import { Button, Notice } from "../../shared/components";
import { Onboarding } from "../../features/organizations/components/Onboarding";
const Context = createContext<{
  state: WorkspaceState;
  viewer: Viewer;
  setOrg: (id: string) => void;
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
  const userId = session!.user.id;
  const access = useQuery({
    queryKey: ["access", userId],
    queryFn: loadAccess,
    refetchInterval: 30000,
  });
  const [platformRoute, setPlatformRoute] = useState(
    location.hash.startsWith("#/organizations"),
  );
  useEffect(() => {
    const update = () => {
      if (!location.hash.startsWith("#/profile"))
        setPlatformRoute(location.hash.startsWith("#/organizations"));
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const [selected, setSelected] = useState("");
  const [toast, notify] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const orgId = access.data?.orgs.some((o) => o.id === selected)
    ? selected
    : access.data?.orgs.find(
        (o) => o.slug === new URLSearchParams(location.search).get("org"),
      )?.id ||
      access.data?.orgs[0]?.id ||
      "";
  const membership = access.data?.memberships.find((m) => m.orgId === orgId);
  const workspace = useQuery({
    queryKey: ["workspace", userId, orgId, membership?.role],
    queryFn: () => loadWorkspace(orgId),
    enabled: Boolean(orgId && membership),
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
    !access.data.orgs.length
  )
    return <Onboarding refresh={refresh} />;
  if (workspace.isPending && membership)
    return (
      <div className="loading-screen" role="status">
        Loading your organization…
      </div>
    );
  if (workspace.isError && membership)
    return (
      <div className="auth-card">
        <Notice>{workspace.error.message}</Notice>
        <Button onClick={() => workspace.refetch()}>Try again</Button>
      </div>
    );
  const viewer: Viewer = {
    userId,
    orgId,
    role:
      access.data.platform && platformRoute
        ? "super-admin"
        : membership?.role || "super-admin",
  };
  return (
    <Context.Provider
      value={{
        state: {
          ...(membership && !(access.data.platform && platformRoute)
            ? workspace.data || empty
            : empty),
          orgs: access.data.orgs,
        },
        viewer,
        setOrg: setSelected,
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
