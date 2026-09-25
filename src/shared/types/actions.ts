import type {
  AttendanceStatus,
  Assignment,
  Branding,
  Course,
  Feature,
  Lesson,
  LessonReference,
  Org,
  Session,
} from "./index";
export type Action =
  | { type: "course"; course: Course }
  | {
      type: "course-access";
      thumbnailUrl?: string | null;
      id: string;
      visibility: "private" | "public";
      pricing: "free" | "paid";
      coursePrice: number | null;
      discountedPrice: number | null;
    }
  | { type: "lesson-preview"; id: string; isFreePreview: boolean }
  | { type: "session"; session: Session }
  | { type: "lesson"; lesson: Lesson }
  | { type: "assignment"; assignment: Assignment }
  | {
      type: "lesson-status";
      id: string;
      status: Lesson["status"];
      reviewed: boolean;
    }
  | { type: "lesson-reference"; id: string; reference: LessonReference }
  | { type: "remove-lesson-reference"; id: string; referenceId: string }
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
  | { type: "delete-course"; id: string }
  | { type: "delete-session"; id: string }
  | { type: "delete-lesson"; id: string }
  | {
      type: "membership";
      userId: string;
      role: "student" | "teacher" | "teacher-admin";
      active: boolean;
    };
