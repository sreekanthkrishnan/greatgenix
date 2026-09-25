import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Field } from "../../../shared/components";
import { hasCourseAccess, type Course } from "../../../shared/types";
import { redeemAccessCoupon } from "../api";
import { CoursePricing } from "./CoursePricing";

export function CourseAccess({ course }: { course: Course }) {
  const { viewer, refresh, notify } = useWorkspace();
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const access = hasCourseAccess(course, viewer);
  if (access) return null;
  return (
    <section className="panel course-enrollment">
      <h2>Preview this course before purchasing</h2>
      <div className="course-enrollment-grid">
        <div>
          {course.pricing === "paid" && <CoursePricing course={course} />}
        </div>
        <form
          className="form course-coupon-form"
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
      </div>
    </section>
  );
}
