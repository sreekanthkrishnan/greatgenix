import { useState } from "react";
import { useWorkspace } from "../../app/providers/OrgContextProvider";
import { canSeeCourse, localDate } from "../types";
import { Button, Field, Modal, Notice } from "./index";
import { InviteForm } from "../../features/memberships/components/Members";
import { createOrganization } from "../../features/organizations/api";
export type FormKind =
  | "course"
  | "session"
  | "recording"
  | "member"
  | "organization"
  | "report"
  | "assignment";
export function ActionForm({
  kind,
  close,
  courseId,
  lessonId,
}: {
  kind: FormKind;
  close: () => void;
  courseId?: string;
  lessonId?: string;
}) {
  const { state, viewer, act, busy, refresh } = useWorkspace();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const courses = state.courses.filter((c) => canSeeCourse(c, viewer));
  if (kind === "member")
    return <InviteForm close={close} courseId={courseId} />;
  const titles = {
    course: "Make room for curiosity",
    session: "Plan your next class",
    recording: "A new lesson, ready to grow",
    organization: "Create an organization",
    report: "Report this lesson",
    assignment: "A new chance to grow",
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const value = (key: string) => String(f.get(key) || "").trim();
    const id = crypto.randomUUID();
    let ok = false;
    try {
      switch (kind) {
        case "course":
          ok = await act({
            type: "course",
            course: {
              id,
              orgId: viewer.orgId,
              teacherId: value("teacher"),
              title: value("title"),
              subject: value("subject"),
              grade: value("grade"),
              batch: value("batch"),
              description: value("description"),
              studentIds: [],
              color: "sage",
            },
          });
          break;
        case "session":
          ok = await act({
            type: "session",
            session: {
              id,
              orgId: viewer.orgId,
              courseId: value("course"),
              title: value("title"),
              date: value("date"),
              time: value("time"),
              startsAt: new Date(
                `${value("date")}T${value("time")}`,
              ).toISOString(),
              duration: Number(value("duration")),
            },
          });
          break;
        case "recording":
          ok = await act({
            type: "lesson",
            lesson: {
              id,
              orgId: viewer.orgId,
              courseId: value("course"),
              title: value("title"),
              duration: Number(value("duration")),
              subject:
                courses.find((c) => c.id === value("course"))?.subject || "",
              age: value("age"),
              status: "draft",
              completeBy: [],
            },
          });
          if (ok) location.hash = `#/recordings/${id}`;
          break;
        case "assignment":
          ok = await act({
            type: "assignment",
            assignment: {
              id,
              orgId: viewer.orgId,
              courseId: value("course"),
              title: value("title"),
              prompt: value("prompt"),
              due: value("due"),
              points: Number(value("points")),
            },
          });
          break;
        case "report":
          ok = await act({
            type: "report",
            lessonId: lessonId!,
            reason: value("reason"),
          });
          break;
        case "organization":
          await createOrganization(value("title"), value("slug"));
          await refresh();
          ok = true;
          break;
      }
      if (ok) close();
      else setError("Not saved. Review the error message and try again.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={titles[kind]} close={close}>
      <form className="form" onSubmit={submit}>
        {kind !== "report" && (
          <Field label="Title / name">
            <input name="title" required maxLength={80} autoFocus />
          </Field>
        )}
        {["session", "recording", "assignment"].includes(kind) && (
          <Field label="Course / batch">
            <select
              name="course"
              required
              defaultValue={courseId || courses[0]?.id}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {c.batch}
                </option>
              ))}
            </select>
          </Field>
        )}
        {kind === "course" && (
          <>
            <div className="form-row">
              <Field label="Subject">
                <input name="subject" required maxLength={40} />
              </Field>
              <Field label="Grade">
                <input name="grade" required maxLength={40} />
              </Field>
            </div>
            <Field label="Batch">
              <input name="batch" required maxLength={40} />
            </Field>
            <Field label="Introduction">
              <textarea name="description" required maxLength={400} />
            </Field>
            <Field label="Assigned teacher">
              <select name="teacher" defaultValue={viewer.userId}>
                {state.members
                  .filter((m) => m.role !== "student" && m.active !== false)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
          </>
        )}
        {kind === "session" && (
          <>
            <div className="form-row">
              <Field label="Date">
                <input
                  name="date"
                  type="date"
                  required
                  min={localDate()}
                  defaultValue={localDate()}
                />
              </Field>
              <Field
                label={`Time (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}
              >
                <input name="time" type="time" required defaultValue="16:00" />
              </Field>
            </div>
            <Field label="Minutes">
              <input
                name="duration"
                type="number"
                required
                min={15}
                max={180}
                defaultValue={60}
              />
            </Field>
            <Notice>
              The session uses a private Daily room. A configured provider is
              required to join.
            </Notice>
          </>
        )}
        {kind === "recording" && (
          <>
            <Field label="Intended age">
              <select name="age">
                <option>13–15 years</option>
                <option>11–13 years</option>
                <option>15–18 years</option>
              </select>
            </Field>
            <Field label="Estimated duration (minutes)">
              <input
                name="duration"
                type="number"
                required
                min={1}
                max={240}
                defaultValue={20}
              />
            </Field>
            <Notice>
              Save a draft, upload its video, then review and publish the
              lesson.
            </Notice>
          </>
        )}
        {kind === "assignment" && (
          <>
            <Field label="Prompt">
              <textarea name="prompt" required maxLength={4000} rows={4} />
            </Field>
            <div className="form-row">
              <Field label="Due date">
                <input
                  name="due"
                  type="date"
                  required
                  defaultValue={localDate(7)}
                />
              </Field>
              <Field label="Points">
                <input
                  name="points"
                  type="number"
                  required
                  min={1}
                  max={1000}
                  defaultValue={10}
                />
              </Field>
            </div>
          </>
        )}
        {kind === "organization" && (
          <Field label="Organization handle">
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              minLength={3}
              maxLength={48}
            />
          </Field>
        )}
        {kind === "report" && (
          <Field label="What should the reviewer know?">
            <textarea name="reason" required maxLength={1000} rows={4} />
          </Field>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={busy || saving}>
            {busy || saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
