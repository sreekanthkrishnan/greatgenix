import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Badge,
  Button,
  CheckLabel,
  CourseArt,
  Empty,
  Notice,
  PageHeading,
  SectionHeading,
  Unavailable,
} from "../../../shared/components";
import { ActionForm } from "../../../shared/components/ActionForm";
import { useScope } from "../../../shared/hooks/useScope";
import { available } from "../../../shared/types";
import { ResourceViewer } from "./ResourceViewer";

export function Recordings({ id }: { id?: string }) {
  const { state, viewer, act } = useWorkspace();
  const { lessons, teacher } = useScope();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(false);
  const [report, setReport] = useState(false);
  const [reviewed, setReviewed] = useState(false);
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
            <div className="lesson-description" style={{ marginTop: "24px" }}>
              <SectionHeading title="A closer look" />
              <p>{course.description}</p>
              <Notice>
                Teacher-approved lessons and materials are available to enrolled learners.
              </Notice>
            </div>
          </section>
          <aside className="panel lesson-sidebar">
            <Badge tone={lesson.status === "published" ? "sage" : "peach"}>
              {lesson.status === "review" ? "In review" : lesson.status}
            </Badge>
            <h3>
              {teacher
                ? "A thoughtful review matters."
                : "Make this lesson your own."}
            </h3>
            <p>
              {teacher
                ? "Check curriculum relevance, intended age and subject before making content available to learners."
                : "Take your time. Revisit the ideas, then mark your progress."}
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
                    disabled={lesson.mediaStatus !== "ready"}
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
                      disabled={!reviewed}
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
                          "Lesson withdrawn.",
                        );
                      }}
                    >
                      Withdraw to draft
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
      (filter === "all" || l.status === filter),
  );
  return (
    <>
      <PageHeading
        eyebrow="IDEAS WORTH COMING BACK TO"
        title="Lesson library"
        description={
          teacher
            ? "Create, review and share something worth learning."
            : "Teacher-approved lessons. Your own pace."
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
            aria-label="Search approved library"
            placeholder="Search lessons, subjects or ages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
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
          <CheckLabel>Curated educational library</CheckLabel>
        )}
      </div>
      <div className="recording-grid">
        {filtered.map((l) => {
          const course = state.courses.find((c) => c.id === l.courseId)!;
          const ltype = l.type || "video";
          const TypeIcon =
            ltype === "audio"
              ? Volume2
              : ltype === "document"
                ? FileText
                : ltype === "link"
                  ? ExternalLink
                  : ltype === "notes"
                    ? FileText
                    : Play;
          return (
            <a
              className="recording-card"
              href={`#/recordings/${l.id}`}
              key={l.id}
            >
              <div className="recording-art">
                <CourseArt color={course.color} />
                <span className="mini-play">
                  <TypeIcon size={17} />
                </span>
                <span className="duration">
                  {ltype.toUpperCase()} · {l.duration} min
                </span>
              </div>
              <div className="course-card-body">
                <div className="course-meta">
                  <span>{l.subject}</span>
                  <Badge tone={l.status === "published" ? "sage" : "peach"}>
                    {l.status === "review" ? "In review" : l.status}
                  </Badge>
                </div>
                <h3>{l.title}</h3>
                <p>
                  {course.grade} · {l.age}
                </p>
              </div>
            </a>
          );
        })}
      </div>
      {!filtered.length && (
        <Empty
          title="No lessons found"
          text="Try a different search or stage. Only this organization’s available educational catalog is searched."
        />
      )}
      {form && <ActionForm kind="recording" close={() => setForm(false)} />}
    </>
  );
}
