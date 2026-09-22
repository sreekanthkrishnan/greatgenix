import type { Action } from "../types/actions";
import { save as save0 } from "../../features/courses/api";
import { save as save1 } from "../../features/live-classes/api";
import { save as save2 } from "../../features/recorded-classes/api";
import { save as save3 } from "../../features/assignments/api";
import { save as save4 } from "../../features/attendance/api";
import { save as save5 } from "../../features/feature-config/api";
import { save as save6 } from "../../features/organizations/api";
import { save as save7 } from "../../features/memberships/api";
import { save as save8 } from "../../features/reports/api";
export function mutate(orgId: string, action: Action) {
  switch (action.type) {
    case "course":
    case "enroll":
    case "assign-teacher":
    case "delete-course":
      return save0(orgId, action);
    case "session":
    case "delete-session":
      return save1(orgId, action);
    case "lesson":
    case "lesson-status":
    case "complete":
      return save2(orgId, action);
    case "assignment":
    case "submit":
    case "grade":
      return save3(orgId, action);
    case "attendance":
      return save4(orgId, action);
    case "feature":
      return save5(orgId, action);
    case "rename":
    case "branding":
    case "org-status":
    case "organization":
      return save6(orgId, action);
    case "membership":
      return save7(orgId, action);
    case "report":
      return save8(orgId, action);
  }
}
