import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Field } from "../../../shared/components";
import type { Course } from "../../../shared/types";
export function CourseRoster({ course }: { course: Course }) {
  const { state, act, busy } = useWorkspace();
  return (
    <section className="panel report-panel">
      <h3>Teaching assignment & enrollment</h3>
      <Field label="Assigned teacher">
        <select
          disabled={busy}
          value={course.teacherId}
          onChange={(e) =>
            act({
              type: "assign-teacher",
              courseId: course.id,
              teacherId: e.target.value,
            })
          }
        >
          {state.members
            .filter((m) => m.role !== "student" && m.active !== false)
            .map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
        </select>
      </Field>
      {state.members
        .filter((m) => m.role === "student" && m.active !== false)
        .map((m) => (
          <div className="roster-row" key={m.id}>
            <div>
              <strong>{m.name}</strong>
              <span>{m.email}</span>
            </div>
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() =>
                act({
                  type: "enroll",
                  courseId: course.id,
                  studentId: m.id,
                  enrolled: !course.studentIds.includes(m.id),
                })
              }
            >
              {course.studentIds.includes(m.id)
                ? "Remove from course"
                : "Enroll in course"}
            </Button>
          </div>
        ))}
    </section>
  );
}
