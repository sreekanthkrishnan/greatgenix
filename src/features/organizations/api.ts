import { rpc } from "../../shared/lib/supabase";
import { readScoped } from "../../shared/lib/readScoped";
import type { WorkspaceState } from "../../shared/types";
import type { Action } from "../../shared/types/actions";
export type Access = {
  orgs: WorkspaceState["orgs"];
  memberships: {
    orgId: string;
    role: "student" | "teacher" | "teacher-admin";
  }[];
  platform: boolean;
};
export const loadAccess = () => rpc<Access>("my_access");
export const createOrganization = (name: string, slug: string) =>
  rpc<string>("create_organization", { p_name: name, p_slug: slug });
export async function loadWorkspace(orgId: string): Promise<WorkspaceState> {
  const [
    courses,
    members,
    enrollments,
    lessons,
    sessions,
    assignments,
    submissions,
    attendance,
    reports,
    completions,
  ] = await Promise.all([
    readScoped("courses", orgId),
    readScoped("memberships", orgId),
    readScoped("enrollments", orgId),
    readScoped("lessons", orgId),
    readScoped("sessions", orgId),
    readScoped("assignments", orgId),
    readScoped("submissions", orgId),
    readScoped("attendance", orgId),
    readScoped("reports", orgId),
    readScoped("completions", orgId),
  ]);
  return {
    version: 1,
    orgs: [],
    courses: courses.map((c) => ({
      ...c,
      studentIds: enrollments
        .filter((e) => e.courseId === c.id)
        .map((e) => e.studentId),
    })),
    members: members.map((m) => ({
      ...m,
      id: m.userId,
      initials: m.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join(""),
    })),
    lessons: lessons.map((l) => ({
      ...l,
      completeBy: completions
        .filter((c) => c.lessonId === l.id)
        .map((c) => c.studentId),
    })),
    sessions,
    assignments,
    submissions,
    attendance: attendance.reduce<WorkspaceState["attendance"]>(
      (acc, r) => ({
        ...acc,
        [r.sessionId]: { ...acc[r.sessionId], [r.studentId]: r.status },
      }),
      {},
    ),
    reports,
  };
}
export const save = (
  orgId: string,
  action: Extract<
    Action,
    { type: "rename" | "branding" | "org-status" | "organization" }
  >,
) => rpc("apply_action", { p_org: orgId, p_action: action });
