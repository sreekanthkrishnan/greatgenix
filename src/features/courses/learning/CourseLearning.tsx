import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Notice } from "../../../shared/components";
import { rpc } from "../../../shared/lib/supabase";
import type { Course } from "../../../shared/types";
import { ResourceViewer } from "../../recorded-classes/components/ResourceViewer";
import { Playback } from "./Playback";
import {
  itemLabels,
  type ItemContent,
  type LearningItem,
  type Outline,
} from "./types";

export function CourseLearning({ course }: { course: Course }) {
  const { viewer, refresh } = useWorkspace();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const outline = useQuery({
    queryKey: ["learning", viewer.orgId, viewer.userId, course.id],
    queryFn: () =>
      rpc<Outline>("learning_outline", {
        p_org: viewer.orgId,
        p_course: course.id,
      }),
    refetchInterval: 15000,
  });
  const items = outline.data?.modules.flatMap((m) => m.items) || [];
  const current = items.find((i) => i.id === selected);
  const next = items.find((i) => i.state === "available");
  const done = items.filter((i) => i.completed).length;
  const teacher = viewer.role !== "student";
  async function update() {
    await outline.refetch();
    await refresh();
  }
  return (
    <section className="panel report-panel learning-path">
      <h2>Learning path</h2>
      {(error || outline.error) && (
        <Notice>{error || outline.error?.message}</Notice>
      )}
      {outline.isPending && <p role="status">Loading learning path…</p>}
      {outline.data && (
        <>
          {!teacher && (
            <>
              <p>
                {done} of {items.length} items complete
                {items.length > 0 && done === items.length
                  ? " · Course completed"
                  : ""}
              </p>
              <progress
                aria-label="Course progress"
                value={done}
                max={items.length || 1}
              />
            </>
          )}
          {!teacher &&
            !outline.data.enrolled &&
            (outline.data.access ||
              (course.visibility === "public" &&
                course.pricing !== "paid")) && (
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await rpc("enroll_learning_course", {
                      p_org: viewer.orgId,
                      p_course: course.id,
                    });
                    await update();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Enroll and start learning
              </Button>
            )}
          {!outline.data.access && course.pricing === "paid" && (
            <p>
              Purchase this course or ask your organization administrator about
              a student subscription covering all public paid courses in this
              organization. Expiry preserves your progress.
            </p>
          )}
          {next && (
            <Button onClick={() => setSelected(next.id)}>
              Resume: {next.title}
            </Button>
          )}
          <div className="learning-columns">
            <nav aria-label="Ordered course modules">
              {outline.data.modules.map((m, n) => (
                <section key={m.id} className="learning-module">
                  <h3>
                    {n + 1}. {m.title}
                  </h3>
                  <p className="muted">
                    {m.items.every((i) => i.completed)
                      ? "Completed"
                      : m.items.some((i) => i.state !== "locked")
                        ? "Available"
                        : "Locked"}
                  </p>
                  <ol>
                    {m.items.map((i) => (
                      <li key={i.id}>
                        <button
                          disabled={i.state === "locked"}
                          aria-current={selected === i.id ? "step" : undefined}
                          onClick={() => setSelected(i.id)}
                        >
                          <strong>{i.title}</strong>
                          <span>
                            {itemLabels[i.kind]} · {i.state}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </nav>
            <div>
              {current && current.state !== "locked" && outline.data.access ? (
                <LearningContent
                  key={`${viewer.userId}-${current.id}`}
                  courseId={course.id}
                  item={current}
                  teacher={teacher}
                  onChange={update}
                />
              ) : (
                <p className="muted">
                  {outline.data.access
                    ? "Choose an available learning item."
                    : "Enroll or obtain course access to begin. Complete each item to unlock the next."}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
function LearningContent({
  courseId,
  item,
  teacher,
  onChange,
}: {
  courseId: string;
  item: LearningItem;
  teacher: boolean;
  onChange: () => Promise<void>;
}) {
  const { viewer, act } = useWorkspace();
  const [watched, setWatched] = useState(item.watched || 0);
  const [eligible, setEligible] = useState(item.eligible || false);
  const [answer, setAnswer] = useState("");
  const [student, setStudent] = useState("");
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const roster = useQuery({
    queryKey: ["learning-roster", viewer.orgId, courseId],
    queryFn: () =>
      rpc<
        {
          id: string;
          name: string;
          items: {
            id: string;
            completed: boolean;
            unlocked: boolean;
            score: number | null;
            feedback: string | null;
            evaluated_at: string | null;
          }[];
        }[]
      >("learning_roster", { p_org: viewer.orgId, p_course: courseId }),
    enabled: teacher,
  });
  const selectedProgress = roster.data
    ?.find((s) => s.id === student)
    ?.items.find((i) => i.id === item.id);
  useEffect(() => {
    setEligible(item.eligible || false);
  }, [item.eligible]);
  useEffect(() => {
    setWatched((v) => Math.max(v, item.watched || 0));
  }, [item.watched]);
  const content = useQuery({
    queryKey: ["learning-item", viewer.orgId, viewer.userId, item.id],
    queryFn: () =>
      rpc<ItemContent>("learning_item", {
        p_org: viewer.orgId,
        p_item: item.id,
      }),
    refetchInterval: 15000,
  });
  async function complete() {
    setBusy(true);
    setError("");
    try {
      await rpc("complete_learning_item", {
        p_org: viewer.orgId,
        p_item: item.id,
      });
      await onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (content.isPending) return <p role="status">Opening item…</p>;
  if (content.error) return <Notice>{content.error.message}</Notice>;
  const data = content.data!;
  return (
    <article className="learning-content">
      <h3>{item.title}</h3>
      <p>
        {item.completed ? "Completed" : "Available"} · {itemLabels[item.kind]}
      </p>
      {data.lesson &&
        (item.kind === "video" ? (
          teacher ? (
            <p>
              Student playback eligibility requires {item.required} seconds of
              active viewing.
            </p>
          ) : (
            <Playback
              orgId={viewer.orgId}
              itemId={item.id}
              lesson={data.lesson}
              onCredit={(credit) => {
                setWatched(credit.watched);
                setEligible(credit.eligible);
              }}
            />
          )
        ) : (
          <ResourceViewer lesson={data.lesson} />
        ))}
      {data.content && <p style={{ whiteSpace: "pre-wrap" }}>{data.content}</p>}
      {data.session && (
        <a className="button secondary" href={`#/sessions/${data.session.id}`}>
          Open workshop session
        </a>
      )}
      {teacher && item.kind === "assessment" && (
        <a href="#/assessments" className="button secondary">
          Evaluate assessment submissions
        </a>
      )}
      {data.assignment && (
        <>
          <p style={{ whiteSpace: "pre-wrap" }}>{data.assignment.prompt}</p>
          <p>
            Completion: {item.completed ? "Submitted" : "Awaiting submission"}.
            Evaluation:{" "}
            {data.submission?.published
              ? `${data.submission.score} / ${data.assignment.points} · ${data.submission.feedback}`
              : "Pending evaluation"}
            .
          </p>
          {!teacher && (
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  if (
                    await act({
                      type: "submit",
                      id: data.assignment!.id,
                      answer,
                    })
                  ) {
                    setAnswer("");
                    await onChange();
                    await content.refetch();
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                Your answer
                <textarea
                  required
                  maxLength={4000}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </label>
              <Button disabled={busy}>Submit assessment</Button>
            </form>
          )}
        </>
      )}
      {!teacher && ["notes", "document", "video"].includes(item.kind) && (
        <>
          {item.kind === "video" && (
            <p role="status">
              Active playback: {Math.floor(watched)} / {item.required} seconds ·{" "}
              {eligible ? "Eligible to complete" : "Keep watching"}
            </p>
          )}
          <Button
            disabled={
              busy || item.completed || (item.kind === "video" && !eligible)
            }
            onClick={complete}
          >
            {item.completed ? "Completed" : "Mark as complete"}
          </Button>
        </>
      )}
      {["practice", "workshop"].includes(item.kind) && (
        <>
          <p>
            Evaluation:{" "}
            {item.evaluated_at
              ? `${item.score} marks · ${item.feedback || ""}`
              : "Pending evaluation"}
            . Participation unlocks the next item independently of marks.
          </p>
          {teacher ? (
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await rpc("record_learning_participation", {
                    p_org: viewer.orgId,
                    p_item: item.id,
                    p_student: student,
                    p_score: score === "" ? null : Number(score),
                    p_feedback: feedback || null,
                  });
                  await onChange();
                  await roster.refetch();
                  setError("Participation recorded.");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
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
                  {roster.data?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedProgress && (
                <p>
                  Completion:{" "}
                  {selectedProgress.completed
                    ? "Completed"
                    : selectedProgress.unlocked
                      ? "Available for participation"
                      : "Locked"}
                  . Evaluation:{" "}
                  {selectedProgress.evaluated_at
                    ? `${selectedProgress.score} marks · ${selectedProgress.feedback || ""}`
                    : "Pending evaluation"}
                  .
                </p>
              )}
              <label className="field">
                Marks (optional)
                <input
                  type="number"
                  min="0"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </label>
              <label className="field">
                Feedback (optional)
                <textarea
                  maxLength={1500}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </label>
              <Button disabled={busy}>
                Record participation / save evaluation
              </Button>
            </form>
          ) : (
            !item.completed && (
              <p>
                Your teacher records participation here. No passing mark is
                required.
              </p>
            )
          )}
        </>
      )}
      {(error || roster.error) && (
        <Notice>{error || roster.error?.message}</Notice>
      )}
    </article>
  );
}
