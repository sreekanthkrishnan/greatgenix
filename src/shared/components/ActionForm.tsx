import { CourseThumbnailField } from "../../features/courses/components/CourseThumbnailField";
import {
  CoursePricingFields,
  parseCoursePricing,
} from "../../features/courses/components/CoursePricing";
import {
  AccessOptions,
  type AccessKind,
} from "../../features/courses/components/AccessOptions";
import { useState } from "react";
import { useWorkspace } from "../../app/providers/OrgContextProvider";
import { canSeeCourse, localDate, type LessonType } from "../types";
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [courseType, setCourseType] = useState<AccessKind>("private");
  const [coursePrice, setCoursePrice] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lessonType, setLessonType] = useState<LessonType>("video");
  const [docFileUrl, setDocFileUrl] = useState("");
  const [docFileName, setDocFileName] = useState("");

  function handleDocumentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocFileUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  }
  const courses = state.courses.filter((c) => canSeeCourse(c, viewer));
  if (kind === "member")
    return <InviteForm close={close} courseId={courseId} />;
  const titles = {
    course: "Make room for curiosity",
    session: "Plan your next class",
    recording: "Add a lesson",
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
              teacherId: viewer.userId,
              thumbnailUrl,
              visibility: courseType === "private" ? "private" : "public",
              pricing: courseType === "paid" ? "paid" : "free",
              ...parseCoursePricing(courseType, coursePrice, discountedPrice),
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
          {
            const cleanTitle = value("title")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 9);
            const defaultMeetCode = `${cleanTitle.slice(0, 3) || "ggx"}-${cleanTitle.slice(3, 6) || "mtg"}-${cleanTitle.slice(6, 9) || "live"}`;
            const pastedLink = value("gmeetLink") || value("meetingUrl");
            const meetingUrl =
              pastedLink || `https://meet.google.com/${defaultMeetCode}`;
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
                gmeetLink: meetingUrl,
                meetingUrl,
              },
            });
          }
          break;
        case "recording":
          {
            const type = (value("type") as LessonType) || "video";
            const url =
              type === "document" && docFileUrl ? docFileUrl : value("url");
            const fileName =
              type === "document" && docFileName ? docFileName : undefined;
            const content = value("content");
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
                status: "published",
                type,
                url,
                fileName,
                content,
                isFreePreview: f.get("isFreePreview") === "on",
                completeBy: [],
              },
            });
            if (ok) location.hash = `#/recordings/${id}`;
          }
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
            <CourseThumbnailField
              value={thumbnailUrl}
              onChange={setThumbnailUrl}
              onLoadingChange={setThumbnailLoading}
              disabled={busy || saving}
            />
            <AccessOptions
              value={courseType}
              onChange={setCourseType}
              disabled={busy || saving}
            />
            {courseType === "paid" && (
              <CoursePricingFields
                coursePrice={coursePrice}
                discountedPrice={discountedPrice}
                onPriceChange={setCoursePrice}
                onDiscountChange={setDiscountedPrice}
              />
            )}
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
            <Field label="Meeting link (Google Meet, Zoom, Teams, etc.)">
              <input
                name="gmeetLink"
                type="url"
                placeholder="https://meet.google.com/xxx-yyyy-zzz or https://zoom.us/j/..."
              />
            </Field>
            <Notice>
              Paste any video conferencing link (Google Meet, Zoom, MS Teams,
              etc.). A default meeting link will be provided if left blank.
            </Notice>
          </>
        )}
        {kind === "recording" && (
          <>
            <label className="checkbox-row">
              <input name="isFreePreview" type="checkbox" />
              Free preview in paid public courses
            </label>
            <Field label="Material type">
              <select
                name="type"
                value={lessonType}
                onChange={(e) => setLessonType(e.target.value as LessonType)}
              >
                <option value="video">Video (YouTube, Vimeo, MP4 URL)</option>
                <option value="audio">
                  Audio (MP3, SoundCloud, Podcast URL)
                </option>
                <option value="document">
                  Document (Upload File or PDF URL)
                </option>
                <option value="link">Link (External web resource)</option>
                <option value="notes">Notes (Text / Markdown content)</option>
              </select>
            </Field>
            {lessonType === "document" ? (
              <>
                <Field label="Upload Document File (PDF, DOC, Images, TXT)">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                    onChange={handleDocumentFileChange}
                  />
                  {docFileName && (
                    <span
                      className="muted"
                      style={{
                        fontSize: "0.85rem",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Selected file: <strong>{docFileName}</strong>
                    </span>
                  )}
                </Field>
                <Field label="Or Document Web URL">
                  <input
                    name="url"
                    type="url"
                    required={!docFileUrl}
                    placeholder="https://example.com/document.pdf"
                  />
                </Field>
              </>
            ) : lessonType !== "notes" ? (
              <Field
                label={`${lessonType.charAt(0).toUpperCase() + lessonType.slice(1)} URL`}
              >
                <input
                  name="url"
                  type="url"
                  required
                  placeholder={
                    lessonType === "video"
                      ? "https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                      : lessonType === "audio"
                        ? "https://example.com/audio.mp3"
                        : "https://example.com/resource"
                  }
                />
              </Field>
            ) : (
              <Field label="Lesson Notes & Content">
                <textarea
                  name="content"
                  required
                  rows={5}
                  placeholder="Enter the lesson notes, guide, or reading material here..."
                />
              </Field>
            )}
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
          <Button disabled={busy || saving || thumbnailLoading}>
            {busy || saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
