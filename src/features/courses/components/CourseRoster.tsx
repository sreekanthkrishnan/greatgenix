import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Field, Notice } from "../../../shared/components";
import { type Course } from "../../../shared/types";
import {
  accessStudents,
  accessCoupons,
  createAccessCoupon,
  revokeAccessCoupon,
} from "../api";

export function CourseRoster({ course }: { course: Course }) {
  const { viewer, act, busy } = useWorkspace();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ name: string; token: string } | null>(
    null,
  );
  const students = useQuery({
    queryKey: ["course-students", viewer.orgId, course.id],
    queryFn: () => accessStudents(viewer.orgId, course.id),
  });
  const coupons = useQuery({
    queryKey: ["course-coupons", viewer.orgId, course.id],
    queryFn: () => accessCoupons(viewer.orgId, course.id),
  });
  const paid = course.visibility === "public" && course.pricing === "paid";
  async function issue(studentId: string, name: string) {
    setWorking(true);
    setError("");
    setIssued(null);
    try {
      const token = await createAccessCoupon(
        viewer.orgId,
        course.id,
        studentId,
      );
      setIssued({ name, token });
      await coupons.refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="panel report-panel">
      <h3>Course enrollment</h3>
      <Notice>
        {paid
          ? "Confirm the student’s manual payment before granting full access or creating a coupon. Each coupon is valid for seven days and only the selected student can redeem it once. Creating another replaces their previous coupon."
          : course.visibility === "public"
            ? "All active students in this organization already have access. Enrollment adds them to the class roster."
            : "Add existing organization students below, or invite a new learner to this course."}
      </Notice>
      {issued && (
        <div className="form">
          <Field label={`Access coupon for ${issued.name}`}>
            <input
              readOnly
              value={issued.token}
              onFocus={(e) => e.target.select()}
            />
          </Field>
          <Button
            variant="secondary"
            onClick={() =>
              navigator.clipboard
                .writeText(issued.token)
                .catch(() => setError("Select and copy the coupon above."))
            }
          >
            Copy coupon
          </Button>
          <p className="muted">
            Share this coupon with {issued.name}. They can redeem it on this
            course’s page. Save it now; it cannot be displayed again.
          </p>
        </div>
      )}
      {(error || students.error || coupons.error) && (
        <p role="alert" className="error-text">
          {error || students.error?.message || coupons.error?.message}
        </p>
      )}
      {students.isPending && <p role="status">Loading students…</p>}
      {students.data?.length === 0 && (
        <p>No active students yet. Invite a learner to get started.</p>
      )}
      {students.data?.map((m) => (
        <div className="roster-row" key={m.id}>
          <div>
            <strong>{m.name}</strong>
            <span>{m.email}</span>
          </div>
          <div className="form-actions">
            <Button
              disabled={busy || working}
              variant="secondary"
              onClick={async () => {
                const ok = await act({
                  type: "enroll",
                  courseId: course.id,
                  studentId: m.id,
                  enrolled: !course.studentIds.includes(m.id),
                });
                if (ok) {
                  setIssued(null);
                  await coupons.refetch();
                }
              }}
            >
              {course.studentIds.includes(m.id)
                ? "Remove from course"
                : paid
                  ? "Payment confirmed — grant access"
                  : "Enroll in course"}
            </Button>
            {paid && !course.studentIds.includes(m.id) && (
              <Button
                disabled={busy || working}
                variant="secondary"
                onClick={() => issue(m.id, m.name)}
              >
                Payment confirmed — create coupon
              </Button>
            )}
          </div>
        </div>
      ))}
      {!!coupons.data?.length && <h3>Access coupons</h3>}
      {coupons.data?.map((c) => (
        <div className="roster-row" key={c.id}>
          <div>
            <strong>
              {students.data?.find((s) => s.id === c.studentId)?.name ||
                "Student"}
            </strong>
            <span>
              {c.redeemedAt
                ? "Redeemed"
                : c.revoked
                  ? "Revoked"
                  : new Date(c.expiresAt) <= new Date()
                    ? "Expired"
                    : `Expires ${new Date(c.expiresAt).toLocaleString()}`}
            </span>
          </div>
          {!c.redeemedAt &&
            !c.revoked &&
            new Date(c.expiresAt) > new Date() && (
              <Button
                disabled={busy || working}
                variant="secondary"
                onClick={async () => {
                  setWorking(true);
                  setError("");
                  try {
                    await revokeAccessCoupon(viewer.orgId, course.id, c.id);
                    setIssued(null);
                    await coupons.refetch();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setWorking(false);
                  }
                }}
              >
                Revoke coupon
              </Button>
            )}
        </div>
      ))}
    </section>
  );
}
