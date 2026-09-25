import { rpc } from "../../shared/lib/supabase";
import type { Action } from "../../shared/types/actions";
export const save = (
  orgId: string,
  action: Extract<
    Action,
    {
      type:
        | "course-access"
        | "course"
        | "enroll"
        | "assign-teacher"
        | "delete-course";
    }
  >,
) => rpc("apply_action", { p_org: orgId, p_action: action });

export type CourseStudent = { id: string; name: string; email: string };
export type CourseCoupon = {
  id: string;
  studentId: string;
  expiresAt: string;
  redeemedAt: string | null;
  revoked: boolean;
};
export const accessStudents = (orgId: string, courseId: string) =>
  rpc<CourseStudent[]>("course_access_students", {
    p_org: orgId,
    p_course: courseId,
  });
export const accessCoupons = (orgId: string, courseId: string) =>
  rpc<CourseCoupon[]>("list_course_access_coupons", {
    p_org: orgId,
    p_course: courseId,
  });
export const createAccessCoupon = (
  orgId: string,
  courseId: string,
  studentId: string,
) =>
  rpc<string>("create_course_access_coupon", {
    p_org: orgId,
    p_course: courseId,
    p_student: studentId,
  });
export const revokeAccessCoupon = (
  orgId: string,
  courseId: string,
  id: string,
) =>
  rpc("revoke_course_access_coupon", {
    p_org: orgId,
    p_course: courseId,
    p_id: id,
  });
export const redeemAccessCoupon = (
  orgId: string,
  courseId: string,
  token: string,
) =>
  rpc("redeem_course_access_coupon", {
    p_org: orgId,
    p_course: courseId,
    p_token: token,
  });
