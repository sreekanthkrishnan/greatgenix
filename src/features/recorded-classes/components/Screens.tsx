import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Badge,
  Button,
  CheckLabel,
  Empty,
  PageHeading,
  Unavailable,
} from "../../../shared/components";
import { ActionForm } from "../../../shared/components/ActionForm";
import { useScope } from "../../../shared/hooks/useScope";
import { available } from "../../../shared/types";
import { ResourceViewer } from "./ResourceViewer";
import { LessonReferences, MaterialThumbnail } from "./LessonReferences";

export function Recordings({ id }: { id?: string }) {
  const { state, viewer, act, busy } = useWorkspace();
  const { lessons, teacher } = useScope();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [material, setMaterial] = useState("all");
  const [form, setForm] = useState(false);
  const [report, setReport] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  useEffect(() => {
    setReviewed(false);
    setReport(false);
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
    return (
      <>
        <a className="back-link" href="#/recordings">
          ← Lesson library
        </a>
        <PageHeading
          eyebrow={`${course.subject.toUpperCase()} / ${course.grade.toUpperCase()}`}
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
              </>
            ) : (
              <>
                <Button
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
  const filtered = lessons.filter(
    (l) =>
      `${l.title} ${l.subject} ${l.age}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" || l.status === filter) &&
      (material === "all" || (l.type || "video") === material),
  );
  return (
    <>
      <PageHeading
        eyebrow="LEARNING RESOURCES"
        title="Lesson library"
        description={
          teacher
            ? "Manage lessons and supporting materials for your courses."
            : "Explore your lessons and supporting materials."
        }
        action={
          teacher && (
            <Button onClick={() => setForm(true)}>
              <Plus size={17} />
              Add a lesson
            </Button>
          )
        }
      />
      <div className="list-toolbar">
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
          <span className="muted">{filtered.length} lessons</span>
        )}
      </div>
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
              <MaterialThumbnail
                type={ltype}
                fileName={l.fileName}
                title={ltype === "notes" ? l.content?.slice(0, 100) : undefined}
              />
              <div className="course-card-body">
                <div className="course-meta">
                  <span>{l.subject}</span>
                  <Badge tone={l.status === "published" ? "sage" : "peach"}>
                    {l.status === "review" ? "In review" : l.status}
                  </Badge>
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
