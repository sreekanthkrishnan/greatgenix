import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  Notice,
  PageHeading,
  Unavailable,
  dateLabel,
} from "../../../shared/components";
import { ActionForm } from "../../../shared/components/ActionForm";
import { useScope } from "../../../shared/hooks/useScope";
import { available } from "../../../shared/types";

export function Assessments() {
  const { state, viewer, act } = useWorkspace();
  const { courses, teacher } = useScope();
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  if (!available(state, viewer, "assessments")) return <Unavailable />;
  const assignments = state.assignments.filter(
    (a) => a.orgId === viewer.orgId && courses.some((c) => c.id === a.courseId),
  );
  const assignment = assignments.find((a) => a.id === selected);
  const own = state.submissions.find(
    (s) => s.assignmentId === selected && s.studentId === viewer.userId,
  );
  const review = state.submissions.find(
    (s) =>
      s.id === reviewId &&
      s.orgId === viewer.orgId &&
      assignments.some((a) => a.id === s.assignmentId),
  );
  const reviewAssignment = assignments.find(
    (a) => a.id === review?.assignmentId,
  );
  return (
    <>
      <PageHeading
        section="assessments"
        summary={[{ value: assignments.length, label: "assessments" }, { value: new Set(assignments.map(a => a.courseId)).size, label: "courses" }]}
        eyebrow="A CHANCE TO GROW"
        title={teacher ? "Assessment studio" : "My work & results"}
        description={
          teacher
            ? "Notice the effort. Help the next idea take shape."
            : "Show what you know, and discover what comes next."
        }
        action={
          teacher && (
            <Button onClick={() => setCreate(true)}>Create assessment</Button>
          )
        }
      />
      {create && (
        <ActionForm kind="assignment" close={() => setCreate(false)} />
      )}
      <div className="assessment-list">
        {assignments.map((a) => {
          const course = courses.find((c) => c.id === a.courseId)!;
          const sub = state.submissions.find(
            (s) => s.assignmentId === a.id && s.studentId === viewer.userId,
          );
          const subs = state.submissions.filter(
            (s) => s.assignmentId === a.id && s.orgId === viewer.orgId,
          );
          return (
            <section className="assessment-card" key={a.id}>
              <div className="assessment-heading">
                <span className={`session-icon ${course.color}`}>
                  <ClipboardCheck size={22} />
                </span>
                <div>
                  <div className="eyebrow">
                    {course.subject} · {course.grade}
                  </div>
                  <h3>{a.title}</h3>
                  <p>
                    Due {dateLabel(a.due)} · {a.points} points
                  </p>
                </div>
                <Badge tone={teacher || sub?.published ? "sage" : "peach"}>
                  {teacher
                    ? `${subs.filter((s) => !s.published).length} to review`
                    : sub?.published
                      ? `${sub.score}/${a.points} points`
                      : sub
                        ? "Submitted"
                        : "To do"}
                </Badge>
              </div>
              <p className="assessment-prompt">{a.prompt}</p>
              {teacher ? (
                <div className="submission-list">
                  {subs.map((s) => (
                    <div className="submission-row" key={s.id}>
                      <Avatar
                        initials={
                          state.members.find((m) => m.id === s.studentId)
                            ?.initials || "L"
                        }
                        small
                      />
                      <div>
                        <strong>
                          {
                            state.members.find((m) => m.id === s.studentId)
                              ?.name
                          }
                        </strong>
                        <span>
                          {s.published
                            ? `Feedback published · ${s.score}/${a.points}`
                            : "Ready for your feedback"}
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => setReviewId(s.id)}
                      >
                        {s.published ? "Edit feedback" : "Review work"}
                        <ArrowUpRight size={15} />
                      </Button>
                    </div>
                  ))}
                  {!subs.length && (
                    <p className="muted">
                      No submissions yet. Try the student to submit an answer.
                    </p>
                  )}
                </div>
              ) : (
                <div className="assessment-footer">
                  {sub?.published && (
                    <p className="feedback">
                      <CheckCircle2 size={17} />
                      {sub.feedback}
                    </p>
                  )}
                  <Button variant="secondary" onClick={() => setSelected(a.id)}>
                    {sub ? "View / revise work" : "Open assessment"}
                    <ArrowUpRight size={16} />
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {!assignments.length && (
        <Empty
          title="Nothing due. Room to explore."
          text="Assessments will appear when your teacher shares one."
        />
      )}
      {assignment && (
        <Modal
          title={assignment.title}
          description="Submit your work for your teacher to review."
          close={() => setSelected(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const answer = String(
                new FormData(e.currentTarget).get("answer") || "",
              );
              if (
                await act(
                  { type: "submit", id: assignment.id, answer },
                  "Answer submitted.",
                )
              )
                setSelected(null);
            }}
          >
            <p>{assignment.prompt}</p>
            <Field label="Your answer">
              <textarea
                name="answer"
                required
                rows={6}
                maxLength={4000}
                defaultValue={own?.answer}
                autoFocus
              />
            </Field>
            {own?.published && (
              <Notice>
                Revising your submission clears its grade until your teacher
                reviews it again.
              </Notice>
            )}
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Submit in <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {review && reviewAssignment && teacher && (
        <Modal
          title="A little feedback goes a long way"
          description={`${state.members.find((m) => m.id === review.studentId)?.name} · ${reviewAssignment.title}`}
          close={() => setReviewId(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await act(
                  {
                    type: "grade",
                    id: review.id,
                    score: Number(f.get("score")),
                    feedback: String(f.get("feedback")),
                  },
                  "Feedback published to the student workspace.",
                )
              )
                setReviewId(null);
            }}
          >
            <div className="answer-box">
              <span className="eyebrow">LEARNER’S ANSWER</span>
              <p>{review.answer}</p>
            </div>
            <Field label={`Score (out of ${reviewAssignment.points})`}>
              <input
                name="score"
                type="number"
                required
                min="0"
                max={reviewAssignment.points}
                defaultValue={review.score ?? ""}
              />
            </Field>
            <Field label="Helpful feedback">
              <textarea
                name="feedback"
                required
                rows={3}
                maxLength={1500}
                defaultValue={review.feedback || ""}
                placeholder="What worked well? What could they explore next?"
              />
            </Field>
            <Button type="submit">
              <Check size={16} />
              Publish feedback
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
