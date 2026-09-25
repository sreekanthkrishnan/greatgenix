import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useDemo } from "./demo";
import { canSeeCourse, featureLabels, localDate, type Feature } from "./model";
import { Button, Empty, Field, Modal, Notice } from "./ui";

export type FormKind =
  "course" | "session" | "recording" | "member" | "organization" | "report";
const titles: Record<FormKind, string> = {
  course: "Make room for curiosity",
  session: "Plan your next class",
  recording: "A new lesson, ready to grow",
  member: "Add a demo learner",
  organization: "Create a demo organization",
  report: "Report this lesson",
};
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
  const { state, viewer, act } = useDemo();
  const courses = state.courses.filter((c) => canSeeCourse(c, viewer));
  const detectedCourseId =
    courseId || (courses.length === 1 ? courses[0].id : undefined);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const needsCourse = ["session", "recording", "member"].includes(kind);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const value = (key: string) => String(f.get(key) || "").trim();
    if (kind !== "report" && !value("title")) {
      setError("Please add a name or title.");
      return;
    }
    const id = crypto.randomUUID();
    let success = false;
    switch (kind) {
      case "course":
        success = act(
          {
            type: "course",
            course: {
              id,
              orgId: viewer.orgId,
              teacherId: viewer.userId,
              title: value("title"),
              subject: value("subject"),
              grade: value("grade"),
              batch: value("batch"),
              description: value("description"),
              studentIds: [],
              color: "sage",
            },
          },
          "Demo course created in this browser.",
        );
        break;
      case "session":
        success = act(
          {
            type: "session",
            session: {
              id,
              orgId: viewer.orgId,
              courseId: value("course"),
              title: value("title"),
              date: value("date"),
              time: value("time"),
              duration: Number(value("duration")),
            },
          },
          "Schedule saved locally. No live room was created.",
        );
        break;
      case "recording":
        success = act(
          {
            type: "lesson",
            lesson: {
              id,
              orgId: viewer.orgId,
              courseId: detectedCourseId || value("course"),
              title: value("title"),
              duration: Number(value("duration")),
              subject:
                courses.find(
                  (c) => c.id === (detectedCourseId || value("course")),
                )?.subject || "",
              status: "draft",
              fileName,
              completeBy: [],
            },
          },
          "Demo lesson draft created. No video file was uploaded.",
        );
        break;
      case "member":
        success = act(
          {
            type: "member",
            courseId: value("course"),
            member: {
              id,
              orgId: viewer.orgId,
              name: value("title"),
              initials: value("title")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join(""),
              email: value("email"),
              role: "student",
            },
          },
          "Fictional learner added locally. No invitation or email was sent.",
        );
        break;
      case "organization":
        success = act(
          {
            type: "organization",
            org: {
              id,
              name: value("title"),
              active: true,
              features: Object.fromEntries(
                Object.keys(featureLabels).map((key) => [key, f.has(key)]),
              ) as Record<Feature, boolean>,
            },
          },
          "Demo organization created with its own feature selection.",
        );
        break;
      case "report":
        success = act(
          { type: "report", lessonId: lessonId!, reason: value("reason") },
          "Report stored in the local demo. No report was sent to a real reviewer.",
        );
        break;
    }
    if (success) close();
  }
  return (
    <Modal
      title={titles[kind]}
      description="A local preview. Changes stay in this browser."
      close={close}
    >
      {needsCourse && !courses.length ? (
        <Empty
          title="Create a course first"
          text="An admin-assigned teacher can create the first demo course."
        />
      ) : (
        <form onSubmit={submit} className="form">
          {kind !== "report" && (
            <Field
              label={
                kind === "member"
                  ? "Fictional learner name"
                  : kind === "organization"
                    ? "Organization name"
                    : "Title"
              }
            >
              <input
                name="title"
                required
                maxLength={100}
                autoFocus
                placeholder={
                  kind === "session"
                    ? "e.g. A fresh look at fractions"
                    : kind === "organization"
                      ? "e.g. Willow Academy"
                      : kind === "member"
                        ? "e.g. Alex Verma"
                        : "Give it a thoughtful name"
                }
              />
            </Field>
          )}
          {needsCourse && !(kind === "recording" && detectedCourseId) && (
            <Field label="Course / batch">
              <select name="course" defaultValue={courseId || courses[0]?.id}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subject} · {c.batch}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {kind === "course" && (
            <>
              <div className="form-row">
                <Field label="Subject">
                  <input
                    name="subject"
                    required
                    placeholder="Mathematics"
                    maxLength={40}
                  />
                </Field>
                <Field label="Grade">
                  <select name="grade" defaultValue="Grade 9">
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g}>Grade {g}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Batch">
                <input
                  name="batch"
                  required
                  placeholder="Curiosity · A"
                  maxLength={40}
                />
              </Field>
              <Field label="Short introduction">
                <textarea
                  name="description"
                  required
                  rows={3}
                  maxLength={400}
                />
              </Field>
            </>
          )}
          {kind === "session" && (
            <>
              <div className="form-row">
                <Field label="Date">
                  <input
                    type="date"
                    name="date"
                    required
                    min={localDate()}
                    defaultValue={localDate()}
                  />
                </Field>
                <Field label="Time (your local time)">
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="16:00"
                  />
                </Field>
              </div>
              <Field label="Duration in minutes">
                <input
                  name="duration"
                  type="number"
                  required
                  min="15"
                  max="180"
                  step="15"
                  defaultValue="60"
                />
              </Field>
              <Notice>
                The live provider is not connected. This creates a schedule
                entry only.
              </Notice>
            </>
          )}
          {kind === "recording" && (
            <>
              <div className="form-row">
                <Field label="Duration in minutes">
                  <input
                    type="number"
                    name="duration"
                    required
                    min="1"
                    max="240"
                    defaultValue="20"
                  />
                </Field>
              </div>
              <Field
                label="Choose a local file (optional)"
                hint="Only the filename is stored. The file is not read, uploaded or played."
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
              </Field>
              <Notice>
                Demo metadata only. The draft must move through review before it
                appears in the student library.
              </Notice>
            </>
          )}
          {kind === "member" && (
            <>
              <Field
                label="Fictional email"
                hint="Use example.com for demo data; no email will be sent."
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="alex@example.com"
                  pattern="[^@]+@example\.com"
                />
              </Field>
              <Notice>
                This adds a sample roster record, not an account or invitation.
              </Notice>
            </>
          )}
          {kind === "organization" && (
            <fieldset>
              <legend>Features available at creation</legend>
              {(Object.entries(featureLabels) as [Feature, string][]).map(
                ([key, label]) => (
                  <label className="checkbox-row" key={key}>
                    <input
                      name={key}
                      type="checkbox"
                      defaultChecked={key === "live" || key === "recordings"}
                    />
                    {label}
                  </label>
                ),
              )}
            </fieldset>
          )}
          {kind === "report" && (
            <Field label="What should the reviewer know?">
              <textarea
                name="reason"
                rows={4}
                required
                maxLength={1000}
                autoFocus
                placeholder="Describe the concern and where it appears in the lesson."
              />
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
            <Button type="submit">
              {kind === "report" ? <Check size={16} /> : <Plus size={16} />}{" "}
              {kind === "report" ? "Save demo report" : "Save in demo"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
