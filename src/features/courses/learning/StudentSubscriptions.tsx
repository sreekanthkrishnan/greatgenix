import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Notice } from "../../../shared/components";
import { rpc } from "../../../shared/lib/supabase";
import { accessStudents } from "../api";
type Subscription = {
  id: string;
  studentId: string;
  starts_at: string;
  ends_at: string;
  reference: string;
  revoked: boolean;
};
export function StudentSubscriptions({ courseId }: { courseId: string }) {
  const { viewer, refresh } = useWorkspace();
  const admin = viewer.role === "teacher-admin";
  const [student, setStudent] = useState("");
  const [end, setEnd] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const records = useQuery({
    queryKey: ["student-subscriptions", viewer.orgId, viewer.userId],
    queryFn: () =>
      rpc<Subscription[]>("student_subscription_records", {
        p_org: viewer.orgId,
      }),
    enabled: admin || viewer.role === "student",
    refetchInterval: 30000,
  });
  const students = useQuery({
    queryKey: ["course-students", viewer.orgId, courseId],
    queryFn: () => accessStudents(viewer.orgId, courseId),
    enabled: admin,
  });
  if (!admin && viewer.role !== "student") return null;
  async function save(revoke?: string) {
    setBusy(true);
    setError("");
    try {
      await rpc("save_student_subscription", {
        p_org: viewer.orgId,
        p_student: student || null,
        p_end: end ? new Date(end).toISOString() : null,
        p_reference: reference,
        p_revoke: revoke || null,
      });
      await records.refetch();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel report-panel student-subscriptions">
      <h3>Student subscriptions</h3>
      <p>
        Access to all public paid courses in this organization while active.
        Private courses still require assignment. Expiry preserves progress and
        separately purchased access.
      </p>
      {admin && (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="field">
            Student
            <select
              required
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              <option value="">Choose student</option>
              {students.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Subscription expires at
            <input
              required
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label className="field">
            Verified offline payment reference
            <input
              required
              maxLength={200}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <Button disabled={busy}>
            Payment confirmed — activate subscription
          </Button>
        </form>
      )}
      {records.isPending && <p>Loading subscriptions…</p>}
      {records.data?.length === 0 && (
        <p>
          No student subscriptions recorded.
          {!admin
            ? " Contact your organization administrator for pricing and offline payment instructions."
            : ""}
        </p>
      )}
      {records.data?.map((s) => (
        <div key={s.id} className="roster-row">
          <div>
            <strong>
              {students.data?.find((u) => u.id === s.studentId)?.name ||
                "Your subscription"}
            </strong>
            <span>
              {s.revoked
                ? "Revoked"
                : new Date(s.ends_at) <= new Date()
                  ? "Expired"
                  : "Active"}{" "}
              · Expires {new Date(s.ends_at).toLocaleString()}
            </span>
          </div>
          {admin && !s.revoked && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void save(s.id)}
            >
              Revoke subscription
            </Button>
          )}
        </div>
      ))}
      {(error || records.error || students.error) && (
        <Notice>
          {error || records.error?.message || students.error?.message}
        </Notice>
      )}
    </section>
  );
}
