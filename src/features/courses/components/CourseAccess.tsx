import {
  AccessOptions,
  PaymentInstructions,
  type AccessKind,
} from "./AccessOptions";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Badge, Button, Field, Notice } from "../../../shared/components";
import { hasCourseAccess, type Course } from "../../../shared/types";
import { redeemAccessCoupon } from "../api";

export function CourseAccess({
  course,
  editable,
}: {
  course: Course;
  editable: boolean;
}) {
  const { viewer, act, busy, refresh, notify } = useWorkspace();
  const [kind, setKind] = useState<AccessKind>(
    course.visibility === "public" ? course.pricing || "free" : "private",
  );
  const [instructions, setInstructions] = useState(
    course.paymentInstructions || "",
  );
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const access = hasCourseAccess(course, viewer);
  if (editable)
    return (
      <section className="panel report-panel course-access-panel">
        <div className="access-section-heading">
          <span className="eyebrow">ENROLLMENT SETTINGS</span>
          <h3>A course for the right audience</h3>
        </div>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            await act(
              {
                type: "course-access",
                id: course.id,
                visibility: kind === "private" ? "private" : "public",
                pricing: kind === "paid" ? "paid" : "free",
                paymentInstructions: instructions,
              },
              "Course access updated.",
            );
          }}
        >
          <AccessOptions value={kind} onChange={setKind} disabled={busy} />
          {kind === "paid" && (
            <PaymentInstructions
              value={instructions}
              onChange={setInstructions}
            />
          )}
          <Notice>
            Public courses are visible to students in this organization. In paid
            courses, only lessons marked as free previews are available before
            access is granted. Existing enrolled students keep full access.
          </Notice>
          <Button disabled={busy}>Save access settings</Button>
        </form>
      </section>
    );
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
      {!access && (
        <>
          <p>
            Explore the free preview lessons below. Full lessons, live classes,
            and assessments unlock after your teacher confirms your manual
            payment.
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>
            {course.paymentInstructions ||
              "Contact your teacher for the price and payment instructions."}
          </p>
          <p>
            After payment, your teacher can add you directly or share an access
            coupon for your account.
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
