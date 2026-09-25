import { roleContent } from "../../../shared/utils/roleContent";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Badge,
  Button,
  CheckLabel,
  Empty,
  Modal,
  PageHeading,
  Unavailable,
} from "../../../shared/components";
import { ActionForm } from "../../../shared/components/ActionForm";
import { useScope } from "../../../shared/hooks/useScope";
import { available, canAdmin } from "../../../shared/types";
import { ResourceViewer } from "./ResourceViewer";
import { LessonArtwork } from "./LessonArtwork";
import { LessonReferences, MaterialThumbnail } from "./LessonReferences";

export function Recordings({ id }: { id?: string }) {
  const { state, viewer, act, busy } = useWorkspace();
  const { lessons, teacher } = useScope();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [material, setMaterial] = useState("all");
  const [progress, setProgress] = useState("all");
  const [form, setForm] = useState(false);
  const [report, setReport] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setReviewed(false);
    setReport(false);
    setConfirmDelete(false);
  }, [id]);

  if (!available(state, viewer, "recordings")) return <Unavailable />;
  const lesson = id ? lessons.find((l) => l.id === id) : undefined;
  if (id && !lesson)
    return (
      <Unavailable
        title="This lesson isn’t available"
        text="Only published lessons in your enrolled courses are available to students."
      />
    );
  if (lesson) {
    const course = state.courses.find((c) => c.id === lesson.courseId)!;
    const canDeleteLesson =
      teacher && (canAdmin(viewer.role) || course?.teacherId === viewer.userId);

    async function handleDeleteLesson() {
      if (!lesson) return;
      const ok = await act(
        { type: "delete-lesson", id: lesson.id },
        "Lesson deleted successfully.",
      );
      if (ok) {
        setConfirmDelete(false);
        window.location.hash = "#/recordings";
      }
    }

    return (
      <>
        <a className="back-link" href="#/recordings">
          ← Lesson library
        </a>
        <PageHeading
          eyebrow={`${course.subject.toUpperCase()} / ${course.grade.toUpperCase()}`}
          artwork={<LessonArtwork type={lesson.type || "video"} />}
          title={lesson.title}
          description={`${lesson.duration} minutes · ${lesson.age} · ${course.batch}`}
        />
        <div className="lesson-layout">
          <section>
            <ResourceViewer lesson={lesson} />
            <LessonReferences
              key={lesson.id}
              lesson={lesson}
              editable={teacher}
            />
          </section>
          <aside className="panel lesson-sidebar">
            <Badge tone={lesson.status === "published" ? "sage" : "peach"}>
              {lesson.status === "review" ? "In review" : lesson.status}
            </Badge>
            {!teacher && lesson.completeBy.includes(viewer.userId) && (
              <span className="lesson-completed">
                <CheckCircle2 size={15} />
                Completed
              </span>
            )}
            {lesson.isFreePreview && <Badge tone="sage">Free preview</Badge>}
            {teacher && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={lesson.isFreePreview === true}
                  disabled={busy}
                  onChange={(e) =>
                    act({
                      type: "lesson-preview",
                      id: lesson.id,
                      isFreePreview: e.target.checked,
                    })
                  }
                />
                Free preview in paid public courses
              </label>
            )}
            <h3>{teacher ? "Lesson publishing" : "Your progress"}</h3>
            <p>
              {teacher
                ? "Review this lesson before sharing it with learners."
                : "Mark this lesson complete when you’re ready."}
            </p>
            <div className="detail-row">
              <ShieldCheck size={17} />
              {lesson.age}
            </div>
            <div className="detail-row">
              <BookOpen size={17} />
              {lesson.subject}
            </div>
            {lesson.fileName && (
              <small className="file-name">Filename: {lesson.fileName}</small>
            )}
            {teacher ? (
              <>
                {lesson.status === "draft" && (
                  <Button
                    disabled={
                      busy ||
                      !(lesson.type === "notes"
                        ? lesson.content?.trim()
                        : lesson.url?.trim() || lesson.mediaStatus === "ready")
                    }
                    onClick={() =>
                      act(
                        {
                          type: "lesson-status",
                          id: lesson.id,
                          status: "review",
                          reviewed: false,
                        },
                        "Lesson moved to review.",
                      )
                    }
                  >
                    <ArrowRight size={16} />
                    Send to review
                  </Button>
                )}
                {lesson.status === "review" && (
                  <>
                    <label className="checkbox-row review-check">
                      <input
                        type="checkbox"
                        checked={reviewed}
                        onChange={(e) => setReviewed(e.target.checked)}
                      />
                      I confirm approval of this lesson’s age, subject and
                      curriculum suitability.
                    </label>
                    <Button
                      disabled={!reviewed || busy}
                      onClick={() =>
                        act(
                          {
                            type: "lesson-status",
                            id: lesson.id,
                            status: "published",
                            reviewed,
                          },
                          "Lesson published.",
                        )
                      }
                    >
                      <Check size={16} />
                      Publish lesson
                    </Button>
                  </>
                )}
                {lesson.status === "published" && (
                  <>
                    <CheckLabel>Visible to enrolled learners</CheckLabel>
                    <Button
                      disabled={busy}
                      variant="secondary"
                      onClick={() => {
                        setReviewed(false);
                        act(
                          {
                            type: "lesson-status",
                            id: lesson.id,
                            status: "draft",
                            reviewed: false,
                          },
                          "Lesson moved to draft.",
                        );
                      }}
                    >
                      Move to draft
                    </Button>
                  </>
                )}
                {canDeleteLesson && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 size={16} />
                    Delete lesson
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  disabled={busy}
                  onClick={() => act({ type: "complete", id: lesson.id })}
                >
                  <CheckCircle2 size={17} />
                  {lesson.completeBy.includes(viewer.userId)
                    ? "Undo completion"
                    : "Mark complete"}
                </Button>
                <Button variant="ghost" onClick={() => setReport(true)}>
                  Report content
                </Button>
              </>
            )}
          </aside>
        </div>
        {confirmDelete && (
          <Modal
            title="Delete Lesson?"
            description="This will permanently delete this lesson and remove all associated references, reports, and progress records."
            close={() => setConfirmDelete(false)}
          >
            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleDeleteLesson} disabled={busy}>
                Delete
              </Button>
            </div>
          </Modal>
        )}
        {report && (
          <ActionForm
            kind="report"
            lessonId={lesson.id}
            close={() => setReport(false)}
          />
        )}
      </>
    );
  }
  const completedCount = lessons.filter((l) =>
    l.completeBy.includes(viewer.userId),
  ).length;
  const publishedCount = lessons.filter((l) => l.status === "published").length;
  const filtered = lessons.filter(
    (l) =>
      `${l.title} ${l.subject} ${l.age}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" || l.status === filter) &&
      (material === "all" || (l.type || "video") === material) &&
      (teacher ||
        progress === "all" ||
        l.completeBy.includes(viewer.userId) === (progress === "completed")),
  );
  return (
    <>
      <PageHeading
        eyebrow={roleContent[viewer.role].libraryEyebrow.toUpperCase()}
        title="Lesson library"
        description={roleContent[viewer.role].libraryDescription}
        artwork={<LessonArtwork type="notes" />}
        summaryLabel="Library summary"
        summary={[
          {
            value: lessons.length,
            label: lessons.length === 1 ? "lesson" : "lessons",
          },
          {
            value: teacher ? publishedCount : completedCount,
            label: teacher ? "published" : "completed",
          },
          {
            value: teacher
              ? lessons.length - publishedCount
              : lessons.length - completedCount,
            label: teacher ? "unpublished" : "to explore",
          },
        ]}
        action={
          teacher && (
            <Button onClick={() => setForm(true)}>
              <Plus size={17} />
              Add a lesson
            </Button>
          )
        }
      />
      <div className="library-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search lessons"
            placeholder="Search lessons, subjects or ages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter material type"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="document">Documents</option>
          <option value="link">Links</option>
          <option value="notes">Notes</option>
        </select>
        {teacher ? (
          <select
            aria-label="Filter lesson status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All stages</option>
            <option value="draft">Drafts</option>
            <option value="review">In review</option>
            <option value="published">Published</option>
          </select>
        ) : (
          <select
            aria-label="Filter lesson progress"
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
          >
            <option value="all">All progress</option>
            <option value="incomplete">To complete</option>
            <option value="completed">Completed</option>
          </select>
        )}
      </div>
      <p className="library-results" role="status">
        {filtered.length === lessons.length
          ? `${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"}`
          : `${filtered.length} of ${lessons.length} lessons`}
      </p>
      <div className="recording-grid">
        {filtered.map((l) => {
          const course = state.courses.find((c) => c.id === l.courseId)!;
          const ltype = l.type || "video";
          return (
            <a
              className="recording-card"
              href={`#/recordings/${l.id}`}
              key={l.id}
            >
              <div className="lesson-card-cover">
                <MaterialThumbnail
                  type={ltype}
                  fileName={l.fileName}
                  title={
                    ltype === "notes" ? l.content?.slice(0, 100) : undefined
                  }
                />
                {!teacher && l.completeBy.includes(viewer.userId) && (
                  <span className="lesson-completed">
                    <CheckCircle2 size={15} />
                    Completed
                  </span>
                )}
              </div>
              <div className="course-card-body">
                <div className="course-meta">
                  <span>{l.subject}</span>
                  {teacher && (
                    <Badge tone={l.status === "published" ? "sage" : "peach"}>
                      {l.status === "review" ? "In review" : l.status}
                    </Badge>
                  )}
                </div>
                <h3>{l.title}</h3>
                <p>
                  {course.title} · {l.duration} min
                </p>
                {!!l.references?.length && (
                  <small className="muted">
                    {l.references.length} references
                  </small>
                )}
              </div>
            </a>
          );
        })}
      </div>
      {!filtered.length && (
        <Empty
          title="No lessons found"
          text="Try a different search, material type or status."
        />
      )}
      {form && <ActionForm kind="recording" close={() => setForm(false)} />}
    </>
  );
}
