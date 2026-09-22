import type {
  AttendanceStatus,
  Assignment,
  Branding,
  Course,
  Feature,
  Lesson,
  Org,
  Session,
} from "./index";
export type Action =
  | { type: "course"; course: Course }
  | { type: "session"; session: Session }
  | { type: "lesson"; lesson: Lesson }
  | { type: "assignment"; assignment: Assignment }
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
  | { type: "feature"; orgId: string; feature: Feature; enabled: boolean }
  | { type: "organization"; org: Org }
  | { type: "org-status"; orgId: string }
  | { type: "rename"; name: string }
  | { type: "branding"; branding: Branding }
  | { type: "report"; lessonId: string; reason: string }
  | { type: "enroll"; courseId: string; studentId: string; enrolled: boolean }
  | { type: "assign-teacher"; courseId: string; teacherId: string }
  | {
      type: "membership";
      userId: string;
      role: "student" | "teacher" | "teacher-admin";
      active: boolean;
    };
