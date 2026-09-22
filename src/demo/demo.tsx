import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  available,
  canAdmin,
  canSeeCourse,
  isTeacher,
  makeSeed,
  type AttendanceStatus,
  type Course,
  type DemoState,
  type Feature,
  type Lesson,
  type Member,
  type Org,
  type Role,
  type Session,
  type Viewer,
} from "./model";

export type Action =
  | { type: "course"; course: Course }
  | { type: "session"; session: Session }
  | { type: "lesson"; lesson: Lesson }
  | {
      type: "lesson-status";
      id: string;
      status: Lesson["status"];
      reviewed: boolean;
    }
  | { type: "complete"; id: string }
  | { type: "submit"; id: string; answer: string }
  | { type: "grade"; id: string; score: number; feedback: string }
  | {
      type: "attendance";
      sessionId: string;
      values: Record<string, AttendanceStatus>;
    }
  | { type: "member"; member: Member; courseId: string }
  | { type: "feature"; orgId: string; feature: Feature }
  | { type: "organization"; org: Org }
  | { type: "org-status"; orgId: string }
  | { type: "rename"; name: string }
  | { type: "report"; lessonId: string; reason: string };

// These checks preserve demo behavior. They are NOT a substitute for Supabase RLS/functions.
export function applyDemoAction(
  state: DemoState,
  viewer: Viewer,
  action: Action,
): DemoState {
  const require = (condition: boolean) => {
    if (!condition)
      throw new Error(
        "This action is unavailable for this demo role, organization or feature.",
      );
  };
  const scopedCourse = (id: string) =>
    state.courses.find((c) => c.id === id && canSeeCourse(c, viewer));
  const teaching = (id: string, feature?: Feature) => {
    require(
      isTeacher(viewer.role) &&
        Boolean(scopedCourse(id)) &&
        (!feature || available(state, viewer, feature)),
    );
  };
  if (["feature", "organization", "org-status"].includes(action.type))
    require(viewer.role === "super-admin");
  else
    require(
      viewer.role !== "super-admin" &&
        Boolean(state.orgs.find((o) => o.id === viewer.orgId)?.active),
    );
  switch (action.type) {
    case "course":
      require(
        canAdmin(viewer.role) &&
          action.course.orgId === viewer.orgId &&
          action.course.teacherId === viewer.userId,
      );
      return { ...state, courses: [...state.courses, action.course] };
    case "session":
      teaching(action.session.courseId, "live");
      require(action.session.orgId === viewer.orgId);
      return { ...state, sessions: [...state.sessions, action.session] };
    case "lesson":
      teaching(action.lesson.courseId, "recordings");
      require(
        action.lesson.orgId === viewer.orgId &&
          action.lesson.status === "draft",
      );
      return { ...state, lessons: [...state.lessons, action.lesson] };
    case "lesson-status": {
      const lesson = state.lessons.find((l) => l.id === action.id);
      require(Boolean(lesson));
      teaching(lesson!.courseId, "recordings");
      require(
        action.status !== "published" ||
          (lesson!.status === "review" && action.reviewed),
      );
      return {
        ...state,
        lessons: state.lessons.map((l) =>
          l.id === action.id ? { ...l, status: action.status } : l,
        ),
      };
    }
    case "complete": {
      const lesson = state.lessons.find((l) => l.id === action.id);
      require(
        viewer.role === "student" &&
          available(state, viewer, "recordings") &&
          Boolean(
            lesson &&
            lesson.status === "published" &&
            scopedCourse(lesson.courseId),
          ),
      );
      return {
        ...state,
        lessons: state.lessons.map((l) =>
          l.id !== action.id
            ? l
            : {
                ...l,
                completeBy: l.completeBy.includes(viewer.userId)
                  ? l.completeBy.filter((id) => id !== viewer.userId)
                  : [...l.completeBy, viewer.userId],
              },
        ),
      };
    }
    case "submit": {
      const assignment = state.assignments.find((a) => a.id === action.id);
      require(
        viewer.role === "student" &&
          available(state, viewer, "assessments") &&
          Boolean(assignment && scopedCourse(assignment.courseId)) &&
          Boolean(action.answer.trim()),
      );
      const other = state.submissions.filter(
        (s) => s.assignmentId !== action.id || s.studentId !== viewer.userId,
      );
      return {
        ...state,
        submissions: [
          ...other,
          {
            id: `sub-${action.id}-${viewer.userId}`,
            assignmentId: action.id,
            orgId: viewer.orgId,
            studentId: viewer.userId,
            answer: action.answer.trim(),
            published: false,
          },
        ],
      };
    }
    case "grade": {
      const sub = state.submissions.find((s) => s.id === action.id);
      const assignment = state.assignments.find(
        (a) => a.id === sub?.assignmentId,
      );
      require(Boolean(sub && assignment && sub.orgId === viewer.orgId));
      teaching(assignment!.courseId, "assessments");
      require(
        Number.isFinite(action.score) &&
          action.score >= 0 &&
          action.score <= assignment!.points &&
          Boolean(action.feedback.trim()),
      );
      return {
        ...state,
        submissions: state.submissions.map((s) =>
          s.id === action.id
            ? {
                ...s,
                score: action.score,
                feedback: action.feedback,
                published: true,
              }
            : s,
        ),
      };
    }
    case "attendance": {
      const session = state.sessions.find((s) => s.id === action.sessionId);
      require(Boolean(session));
      teaching(session!.courseId, "attendance");
      const course = scopedCourse(session!.courseId)!;
      require(
        Object.keys(action.values).every((id) =>
          course.studentIds.includes(id),
        ) &&
          Object.values(action.values).every((v) =>
            ["present", "absent", "late"].includes(v),
          ),
      );
      return {
        ...state,
        attendance: { ...state.attendance, [session!.id]: action.values },
      };
    }
    case "member":
      require(
        canAdmin(viewer.role) &&
          action.member.orgId === viewer.orgId &&
          Boolean(scopedCourse(action.courseId)),
      );
      return {
        ...state,
        members: [...state.members, action.member],
        courses: state.courses.map((c) =>
          c.id === action.courseId
            ? { ...c, studentIds: [...c.studentIds, action.member.id] }
            : c,
        ),
      };
    case "feature":
      return {
        ...state,
        orgs: state.orgs.map((o) =>
          o.id === action.orgId
            ? {
                ...o,
                features: {
                  ...o.features,
                  [action.feature]: !o.features[action.feature],
                },
              }
            : o,
        ),
      };
    case "organization":
      require(Boolean(action.org.name.trim()));
      return { ...state, orgs: [...state.orgs, action.org] };
    case "org-status":
      return {
        ...state,
        orgs: state.orgs.map((o) =>
          o.id === action.orgId ? { ...o, active: !o.active } : o,
        ),
      };
    case "rename":
      require(canAdmin(viewer.role) && Boolean(action.name.trim()));
      return {
        ...state,
        orgs: state.orgs.map((o) =>
          o.id === viewer.orgId ? { ...o, name: action.name.trim() } : o,
        ),
      };
    case "report": {
      const lesson = state.lessons.find((l) => l.id === action.lessonId);
      require(
        viewer.role === "student" &&
          available(state, viewer, "recordings") &&
          Boolean(
            lesson &&
            lesson.status === "published" &&
            scopedCourse(lesson.courseId),
          ) &&
          Boolean(action.reason.trim()),
      );
      return {
        ...state,
        reports: [
          ...state.reports,
          {
            orgId: viewer.orgId,
            lessonId: action.lessonId,
            reason: action.reason.trim(),
          },
        ],
      };
    }
  }
}
const storageKey = "great-genix-demo-v1";
function loadState(): DemoState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (
      parsed?.version === 1 &&
      [
        "orgs",
        "courses",
        "members",
        "lessons",
        "sessions",
        "assignments",
        "submissions",
        "reports",
      ].every((k) => Array.isArray(parsed[k])) &&
      parsed.attendance &&
      typeof parsed.attendance === "object"
    )
      return parsed;
  } catch {
    /* Corrupt/unavailable browser storage starts a fresh demo. */
  }
  return makeSeed();
}
type DemoContextValue = {
  state: DemoState;
  viewer: Viewer;
  setRole: (role: Role) => void;
  setOrg: (org: string) => void;
  act: (action: Action, message?: string) => boolean;
  toast: string;
  notify: (message: string) => void;
  reset: () => void;
  storageWarning: boolean;
};
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadState);
  const [role, setRole] = useState<Role>("teacher");
  const [orgId, setOrg] = useState("genix");
  const [toast, notify] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const userId =
    role === "super-admin"
      ? "platform"
      : state.members.find(
          (m) =>
            m.orgId === orgId &&
            m.role === (role === "student" ? "student" : "teacher"),
        )?.id || "demo-user";
  const viewer = { role, orgId, userId };
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => notify(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  function act(action: Action, message = "Updated in this browser demo only.") {
    try {
      setState(applyDemoAction(state, viewer, action));
      notify(message);
      return true;
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "The demo action could not be completed.",
      );
      return false;
    }
  }
  function reset() {
    setState(makeSeed());
    setOrg("genix");
    notify("Demo reset. Only fictional local data was cleared.");
  }
  return (
    <DemoContext.Provider
      value={{
        state,
        viewer,
        setRole,
        setOrg,
        act,
        toast,
        notify,
        reset,
        storageWarning,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider missing");
  return value;
}
