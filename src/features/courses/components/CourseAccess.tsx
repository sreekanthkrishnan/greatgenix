import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Badge, Button, Field } from "../../../shared/components";
import { hasCourseAccess, type Course } from "../../../shared/types";
import { redeemAccessCoupon } from "../api";
import { CoursePricing } from "./CoursePricing";

export function CourseAccess({ course }: { course: Course }) {
  const { viewer, refresh, notify } = useWorkspace();
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const access = hasCourseAccess(course, viewer);
  return (
    <section className="panel report-panel">
      <Badge tone="sage">
        {course.visibility === "public"
          ? `Public · ${course.pricing === "paid" ? "Paid" : "Free"}`
          : "Private"}
      </Badge>
      <h3>
        {access
          ? "You have full course access"
          : "Preview this course before purchasing"}
      </h3>
      {course.pricing === "paid" && <CoursePricing course={course} />}
      {!access && (
        <>
          <p>
            Explore the free preview lessons below. Full lessons, live classes,
            and assessments unlock after your teacher confirms your manual
            payment.
          </p>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError("");
              try {
                await redeemAccessCoupon(viewer.orgId, course.id, token);
                setToken("");
                await refresh();
                notify("Full course access unlocked.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Field label="Your course access coupon">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                maxLength={128}
                autoComplete="off"
              />
            </Field>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <Button disabled={saving || !token.trim()}>
              {saving ? "Redeeming…" : "Redeem access coupon"}
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
