import type { ReactNode } from "react";
import { useWorkspace } from "../../app/providers/OrgContextProvider";
import type { Role } from "../types";
export function PermissionGate({
  roles,
  children,
  fallback = null,
}: {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { viewer } = useWorkspace();
  return roles.includes(viewer.role) ? children : fallback;
}
