import { useAuth } from "../../../app/providers/AuthProvider";
import { profileText } from "../../../shared/utils/roleContent";
import { roleContent } from "../../../shared/utils/roleContent";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Leaf,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Avatar,
  Badge,
  Button,
  CourseCard,
  Empty,
  Modal,
  PageHeading,
  SectionHeading,
  Unavailable,
  dateLabel,
  timeLabel,
} from "../../../shared/components";
import {
  ActionForm,
  type FormKind,
} from "../../../shared/components/ActionForm";
import { useScope } from "../../../shared/hooks/useScope";
import { available, canAdmin, type Session } from "../../../shared/types";
import { CourseRoster } from "./CourseRoster";

export function Dashboard() {
  const { state, viewer } = useWorkspace();
  const { courses, sessions, lessons, teacher } = useScope();
  const { session: authSession } = useAuth();
  const [form, setForm] = useState<FormKind | null>(null);
  const name = (
    profileText(authSession?.user.user_metadata.name) ||
    state.members.find((m) => m.id === viewer.userId)?.name ||
    "there"
  )
    .trim()
    .split(/\s+/)[0];
  const next = available(state, viewer, "live")
    ? sessions.find(
        (s) =>
          new Date(s.startsAt || `${s.date}T${s.time}`).getTime() +
            s.duration * 60000 >
          Date.now(),
      )
    : undefined;
  const course = courses.find((c) => c.id === next?.courseId);
  const students = new Set(courses.flatMap((c) => c.studentIds)).size;
  const completed = lessons.filter((l) =>
    l.completeBy.includes(viewer.userId),
  ).length;
  const pending = state.submissions.filter(
    (s) =>
      !s.published &&
      s.orgId === viewer.orgId &&
      state.assignments.some(
        (a) =>
          a.id === s.assignmentId && courses.some((c) => c.id === a.courseId),
      ),
  ).length;
  const stats = teacher
    ? [
        {
          icon: BookOpen,
          value: courses.length,
          label: "Active courses",
          detail: "Room for every idea",
        },
        {
          icon: Users,
          value: students,
          label: "Learners",
          detail: "Growing together",
        },
        {
          icon: Video,
          value: lessons.filter((l) => l.status === "published").length,
          label: "Published lessons",
          detail: "Ready to explore",
        },
        {
          icon: ClipboardCheck,
          value: available(state, viewer, "assessments") ? pending : "—",
          label: "Reviews to give",
          detail: "A little feedback goes far",
        },
      ]
    : [
        {
          icon: BookOpen,
          value: courses.length,
          label: "My courses",
          detail: "New worlds to explore",
        },
        {
          icon: CheckCircle2,
          value: completed,
          label: "Lessons completed",
          detail: "One step at a time",
        },
        {
          icon: CalendarDays,
          value: available(state, viewer, "live") ? sessions.length : "—",
          label: "Scheduled classes",
          detail: "Learn alongside your class",
        },
        {
          icon: GraduationCap,
          value: state.submissions.filter(
            (s) => s.studentId === viewer.userId && s.published,
          ).length,
          label: "Published results",
          detail: "See how you’re growing",
        },
      ];
  return (
    <>
      <PageHeading
        eyebrow={roleContent[viewer.role].workspace.toUpperCase()}
        section="overview"
        title={`Good to see you, ${name}.`}
        description={roleContent[viewer.role].overviewDescription}
        action={
          teacher && available(state, viewer, "live") ? (
            <Button onClick={() => setForm("session")}>
              <Plus size={17} />
              Schedule a class
            </Button>
          ) : (
            <a className="button primary" href="#/courses">
              {teacher ? "View my courses" : "Explore my courses"}{" "}
              <ArrowUpRight size={17} />
            </a>
          )
        }
      />
      <div className="dashboard-top">
        <section className="hero-card">
          <div className="hero-copy">
            <Badge tone="light">
              <span className="status-dot" />
              {next ? "YOUR NEXT LIVE CLASS" : "A GOOD DAY TO BEGIN"}
            </Badge>
            <h2>
              {next
                ? "Big ideas start\nwith a little curiosity."
                : "Make space for\nsomething new."}
            </h2>
            <p>
              {next
                ? `${course?.subject} · ${course?.grade} · ${course?.batch}`
                : teacher
                  ? "Prepare your courses and share resources for your next lesson."
                  : "Explore your courses and keep learning, one thoughtful step at a time."}
            </p>
            {next && (
              <div className="hero-time">
                <CalendarDays size={16} />
                {dateLabel(next.date)}
                <span>·</span>
                <Clock3 size={16} />
                {timeLabel(next.time)}
              </div>
            )}
            <a
              className="button hero-button"
              href={next ? `#/sessions/${next.id}` : "#/courses"}
            >
              {teacher
                ? next
                  ? "View class details"
                  : "View courses"
                : next
                  ? "Get ready for class"
                  : "Explore courses"}
              <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun" />
            <div className="arch arch-one" />
            <div className="arch arch-two" />
            <div className="orb" />
            <span className="spark spark-one">✳</span>
            <span className="spark spark-two">✧</span>
            <div className="art-caption">
              a little more
              <br />
              <i>possibility.</i>
            </div>
          </div>
        </section>
        <section className="focus-card">
          <div className="focus-top">
            <span className="eyebrow">
              {teacher ? "ON YOUR RADAR" : "YOUR LEARNING PATH"}
            </span>
            <Leaf size={19} />
          </div>
          <h3>
            {teacher
              ? "Every learner\ncan flourish."
              : "Progress looks\ngood on you."}
          </h3>
          <p>
            {teacher
              ? "A thoughtful next step for your classroom."
              : `${completed} of ${lessons.length} available lessons marked complete.`}
          </p>
          <div className="focus-bottom">
            {teacher ? (
              <>
                <div className="avatar-stack">
                  {state.members
                    .filter((m) => m.role === "student")
                    .slice(0, 3)
                    .map((m) => (
                      <Avatar key={m.id} initials={m.initials} small />
                    ))}
                </div>
                <span>{students} curious minds</span>
              </>
            ) : (
              <div className="progress-track">
                <span
                  style={{
                    width: `${lessons.length ? (completed / lessons.length) * 100 : 0}%`,
                  }}
                />
              </div>
            )}
          </div>
          <a
            href={teacher ? "#/assessments" : "#/recordings"}
            className="text-link"
          >
            {teacher ? "Give a little feedback" : "Continue learning"}{" "}
            <ArrowRight size={15} />
          </a>
        </section>
      </div>
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <s.icon size={18} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.detail}</small>
          </div>
        ))}
      </div>
      <SectionHeading
        title={
          teacher ? "Your classroom, at a glance" : "Keep your curiosity going"
        }
        href="#/courses"
      />
      <div className="course-grid">
        {courses.slice(0, 3).map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            detail={
              teacher
                ? `${c.studentIds.length} learners`
                : `${lessons.filter((l) => l.courseId === c.id).length} available lessons`
            }
          />
        ))}
      </div>
      {!courses.length && (
        <Empty
          title="Your first course belongs here"
          text={roleContent[viewer.role].emptyCourses}
        />
      )}
      <div className="dashboard-bottom">
        <section className="panel">
          <SectionHeading title="Coming up" href="#/sessions" />
          {available(state, viewer, "live") && sessions.length ? (
            sessions
              .slice(0, 3)
              .map((s) => <SessionRow key={s.id} session={s} />)
          ) : (
            <p className="muted">No enabled sessions to show.</p>
          )}
        </section>
        <section className="note-card">
          <Sparkles size={23} />
          <span className="eyebrow">A THOUGHT TO TAKE WITH YOU</span>
          <blockquote>
            “The beautiful thing about learning is that nobody can take it away
            from you.”
          </blockquote>
          <span>— B. B. King</span>
          <div className="note-line" />
        </section>
      </div>
      {form && <ActionForm kind={form} close={() => setForm(null)} />}
    </>
  );
}
export function SessionRow({ session }: { session: Session }) {
  const { state } = useWorkspace();
  const c = state.courses.find((c) => c.id === session.courseId);
  return (
    <a className="session-row" href={`#/sessions/${session.id}`}>
      <span className={`session-icon ${c?.color}`}>
        <Video size={18} />
      </span>
      <div>
        <strong>{session.title}</strong>
        <span>
          {c?.subject} · {dateLabel(session.date)} · {timeLabel(session.time)}
        </span>
      </div>
      <ArrowUpRight size={17} />
    </a>
  );
}

export function Courses() {
  const { viewer } = useWorkspace();
  const { courses, lessons, teacher } = useScope();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(false);
  const filtered = courses.filter((c) =>
    `${c.title} ${c.subject} ${c.batch}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        section="courses"
        summary={[
          { value: courses.length, label: "courses" },
          { value: lessons.length, label: "lessons" },
        ]}
        eyebrow={roleContent[viewer.role].coursesEyebrow.toUpperCase()}
        title={teacher ? "Your courses" : "My courses"}
        description={roleContent[viewer.role].coursesDescription}
        action={
          canAdmin(viewer.role) && (
            <Button onClick={() => setForm(true)}>
              <Plus size={17} />
              Create course
            </Button>
          )
        }
      />
      <div className="list-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search courses"
            placeholder="Find a course or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="muted">{filtered.length} courses</span>
      </div>
      <div className="course-grid">
        {filtered.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            detail={
              teacher
                ? `${c.studentIds.length} learners`
                : `${lessons.filter((l) => l.courseId === c.id).length} lessons`
            }
          />
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="No courses found"
          text={
            search
              ? "Try another subject or course name."
              : roleContent[viewer.role].emptyCourses
          }
        />
      )}{" "}
      {form && <ActionForm kind="course" close={() => setForm(false)} />}
    </>
  );
}
export function CourseDetail({ id }: { id: string }) {
  const { state, viewer, act, busy } = useWorkspace();
  const { courses, lessons, teacher } = useScope();
  const course = courses.find((c) => c.id === id);
  const [tab, setTab] = useState("lessons");
  const [form, setForm] = useState<FormKind | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!course)
    return (
      <Unavailable
        title="This course isn’t in your classroom"
        text="Switch back to your courses to see what is available in this role and organization."
      />
    );
  const canDelete = canAdmin(viewer.role) || course.teacherId === viewer.userId;
  const list = lessons.filter((l) => l.courseId === id);
  const roster = state.members.filter(
    (m) => m.orgId === viewer.orgId && course.studentIds.includes(m.id),
  );

  async function handleDeleteCourse() {
    const ok = await act(
      { type: "delete-course", id: course!.id },
      "Course deleted successfully.",
    );
    if (ok) {
      location.hash = "#/courses";
    }
  }

  return (
    <>
      <a className="back-link" href="#/courses">
        ← All courses
      </a>
      <PageHeading
        section="courses"
        eyebrow={`${course.subject} / ${course.grade} / ${course.batch}`}
        title={course.title}
        description={course.description}
        summary={[
          { value: course.studentIds.length, label: "learners" },
          { value: list.length, label: "lessons" },
        ]}
        action={
          canDelete && (
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
            >
              <Trash2 size={16} />
              Delete course
            </Button>
          )
        }
      />
      <div className="tabs" role="tablist" aria-label="Course views">
        {["lessons", "schedule", ...(teacher ? ["roster"] : [])].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "lessons"
              ? "Lesson library"
              : t === "schedule"
                ? "Class schedule"
                : "Class roster"}
          </button>
        ))}
      </div>
      {tab === "lessons" && (
        <>
          <SectionHeading
            title="A lesson at a time"
            action={
              teacher &&
              available(state, viewer, "recordings") && (
                <Button
                  variant="secondary"
                  onClick={() => setForm("recording")}
                >
                  <Plus size={16} />
                  Add recording
                </Button>
              )
            }
          />
          {!available(state, viewer, "recordings") ? (
            <Unavailable />
          ) : list.length ? (
            <div className="panel lesson-list">
              {list.map((l, i) => (
                <a
                  className="lesson-row"
                  key={l.id}
                  href={`#/recordings/${l.id}`}
                >
                  <span className="lesson-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{l.title}</strong>
                    <span>
                      {l.duration} min · {l.age} ·{" "}
                      {l.status === "published"
                        ? "Teacher-approved"
                        : "Not visible to students"}
                    </span>
                  </div>
                  {l.completeBy.includes(viewer.userId) ? (
                    <CheckCircle2 size={20} className="green" />
                  ) : (
                    <Badge tone={l.status === "published" ? "sage" : "peach"}>
                      {l.status === "review" ? "In review" : l.status}
                    </Badge>
                  )}
                  <Play size={17} />
                </a>
              ))}
            </div>
          ) : (
            <Empty
              title="The first lesson is still ahead"
              text="Reviewed and published lessons will appear here."
            />
          )}
        </>
      )}
      {tab === "schedule" && (
        <>
          <SectionHeading
            title="Learn together"
            action={
              teacher &&
              available(state, viewer, "live") && (
                <Button variant="secondary" onClick={() => setForm("session")}>
                  <Plus size={16} />
                  Schedule class
                </Button>
              )
            }
          />
          {available(state, viewer, "live") ? (
            <div className="panel">
              {state.sessions
                .filter((s) => s.courseId === id)
                .map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              {!state.sessions.some((s) => s.courseId === id) && (
                <Empty
                  title="Nothing on the calendar yet"
                  text="Scheduled sessions for this class will appear here."
                />
              )}
            </div>
          ) : (
            <Unavailable />
          )}
        </>
      )}
      {tab === "roster" && teacher && (
        <>
          <SectionHeading
            title={`${roster.length} curious minds`}
            action={
              canAdmin(viewer.role) && (
                <Button variant="secondary" onClick={() => setForm("member")}>
                  <Plus size={16} />
                  Add learner
                </Button>
              )
            }
          />
          <div className="panel">
            {roster.map((m) => (
              <div className="roster-row" key={m.id}>
                <Avatar initials={m.initials} />
                <div>
                  <strong>{m.name}</strong>
                  <span>{m.email}</span>
                </div>
                <Badge>Enrolled</Badge>
              </div>
            ))}
            {!roster.length && (
              <Empty
                title="A fresh classroom"
                text="Add learners using the teacher + admin role."
              />
            )}
          </div>
        </>
      )}
      {tab === "roster" && canAdmin(viewer.role) && (
        <CourseRoster course={course} />
      )}
      {form && (
        <ActionForm kind={form} courseId={id} close={() => setForm(null)} />
      )}
      {confirmDelete && (
        <Modal title="Delete Course?" close={() => setConfirmDelete(false)}>
          <p
            style={{
              marginBottom: "1.25rem",
              color: "var(--text-color, currentColor)",
            }}
          >
            Are you sure you want to delete <strong>{course.title}</strong>?
            This action cannot be undone and will permanently remove this course
            along with all associated lessons, class schedules, assignments, and
            enrollment records.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteCourse} disabled={busy}>
              {busy ? "Deleting…" : "Yes, delete course"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
