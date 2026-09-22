import type {
  Assignment,
  AttendanceStatus,
  Course,
  Lesson,
  Member,
  Session,
  Submission,
  WorkspaceState,
} from "./index";
export type DatabaseRows = {
  courses: Omit<Course, "studentIds">;
  memberships: Omit<Member, "id" | "initials"> & { userId: string };
  enrollments: { orgId: string; courseId: string; studentId: string };
  lessons: Omit<Lesson, "completeBy">;
  sessions: Session;
  assignments: Assignment;
  submissions: Submission;
  attendance: {
    orgId: string;
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
  };
  reports: WorkspaceState["reports"][number];
  completions: { orgId: string; lessonId: string; studentId: string };
};
