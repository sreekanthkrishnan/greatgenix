import { Check } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Avatar,
  Button,
  Empty,
  Field,
  PageHeading,
  SectionHeading,
  Unavailable,
  dateLabel,
} from "../../../shared/components";
import { useScope } from "../../../shared/hooks/useScope";
import { available, type AttendanceStatus } from "../../../shared/types";

export function Attendance() {
  const { state, viewer, act } = useWorkspace();
  const { sessions, courses, teacher } = useScope();
  const [sessionId, setSessionId] = useState(sessions[0]?.id || "");
  if (!teacher)
    return (
      <Unavailable
        title="A teaching space"
        text="Attendance editing is available to teachers."
      />
    );
  if (!available(state, viewer, "attendance")) return <Unavailable />;
  const session = sessions.find((s) => s.id === sessionId);
  const course = courses.find((c) => c.id === session?.courseId);
  return (
    <>
      <PageHeading
        section="attendance"
        summary={[
          { value: sessions.length, label: "class sessions" },
          {
            value: new Set(courses.flatMap((c) => c.studentIds)).size,
            label: "learners",
          },
        ]}
        eyebrow={
          viewer.role === "teacher-admin"
            ? "YOUR ORGANIZATION’S ATTENDANCE"
            : "YOUR CLASS ATTENDANCE"
        }
        title="Attendance"
        description="A simple register. More time for the people in it."
      />
      <div className="list-toolbar">
        <Field label="Class session">
          <select
            aria-label="Class session"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {dateLabel(s.date)} · {s.title}
              </option>
            ))}
          </select>
        </Field>
        <span className="muted">{course?.batch}</span>
      </div>
      {session && course ? (
        <AttendanceRegister
          key={`${sessionId}-${viewer.orgId}`}
          sessionId={sessionId}
          studentIds={course.studentIds}
          onSave={(values) =>
            act({ type: "attendance", sessionId, values }, "Attendance saved.")
          }
        />
      ) : (
        <Empty
          title="No session selected"
          text="Schedule a class to start its attendance register."
        />
      )}
    </>
  );
}
function AttendanceRegister({
  sessionId,
  studentIds,
  onSave,
}: {
  sessionId: string;
  studentIds: string[];
  onSave: (values: Record<string, AttendanceStatus>) => Promise<boolean>;
}) {
  const { state } = useWorkspace();
  const [values, setValues] = useState<Record<string, AttendanceStatus>>(
    state.attendance[sessionId] || {},
  );
  const [dirty, setDirty] = useState(false);
  const members = state.members.filter((m) => studentIds.includes(m.id));
  const present = Object.values(values).filter((v) => v === "present").length;
  return (
    <>
      <div className="panel">
        <SectionHeading
          title={`${members.length} learners`}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setValues(
                  Object.fromEntries(members.map((m) => [m.id, "present"])),
                );
                setDirty(true);
              }}
            >
              <Check size={16} />
              Mark all present
            </Button>
          }
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Attendance status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="table-person">
                      <Avatar initials={m.initials} small />
                      <span>{m.name}</span>
                    </div>
                  </td>
                  <td>
                    <div
                      className="attendance-options"
                      role="group"
                      aria-label={`Attendance for ${m.name}`}
                    >
                      {(["present", "late", "absent"] as const).map(
                        (status) => (
                          <button
                            key={status}
                            className={
                              values[m.id] === status
                                ? `selected ${status}`
                                : ""
                            }
                            aria-pressed={values[m.id] === status}
                            onClick={() => {
                              setValues({ ...values, [m.id]: status });
                              setDirty(true);
                            }}
                          >
                            {status}
                          </button>
                        ),
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!members.length && (
          <Empty
            title="No learners enrolled"
            text="An admin-assigned teacher can add learners to this course."
          />
        )}
      </div>
      <div className="save-bar">
        <span>
          {present} present · {members.length - Object.keys(values).length}{" "}
          unmarked {dirty ? "· Unsaved changes" : ""}
        </span>
        <Button
          disabled={!dirty}
          onClick={async () => {
            if (await onSave(values)) setDirty(false);
          }}
        >
          Save attendance <Check size={16} />
        </Button>
      </div>
    </>
  );
}
