export type Role = "teacher" | "student" | "teacher-admin" | "super-admin";
export type Feature = "live" | "recordings" | "attendance" | "assessments";
export const featureLabels: Record<Feature, string> = {
  live: "Live classes",
  recordings: "Recorded lessons",
  attendance: "Attendance",
  assessments: "Assessments",
};
export type Branding = {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: "system" | "serif" | "humanist";
  fontSize: number;
  theme: "light" | "dark";
  tagline: string;
};
export type Org = {
  approval_status?: "pending" | "approved" | "rejected";
  review_note?: string;
  accessible?: boolean;
  billing_status?:
    | "pending"
    | "rejected"
    | "active"
    | "suspended"
    | "pending_payment"
    | "subscription_required";
  subscription_end?: string | null;
  slug?: string;
  branding?: Branding;
  id: string;
  name: string;
  active: boolean;
  features: Record<Feature, boolean>;
};
export type Course = {
  thumbnailUrl?: string | null;
  visibility?: "private" | "public";
  pricing?: "free" | "paid";
  coursePrice?: number | null;
  discountedPrice?: number | null;
  id: string;
  orgId: string;
  title: string;
  subject: string;
  grade: string;
  batch: string;
  color: "sage" | "peach" | "lavender";
  description: string;
  teacherId: string;
  studentIds: string[];
};
export type Member = {
  id: string;
  orgId: string;
  name: string;
  initials: string;
  role: "student" | "teacher" | "teacher-admin";
  active?: boolean;
  email: string;
};
export type LessonType = "video" | "audio" | "document" | "link" | "notes";
export type LessonReference = {
  id: string;
  type: "notes" | "link" | "document";
  title: string;
  content?: string;
  url?: string;
  fileName?: string;
};
export type Lesson = {
  isFreePreview?: boolean;
  id: string;
  orgId: string;
  courseId: string;
  title: string;
  duration: number;
  status: "draft" | "review" | "published";
  mediaStatus?: string;
  references?: LessonReference[];
  age: string;
  subject: string;
  type?: LessonType;
  url?: string;
  content?: string;
  fileName?: string;
  completeBy: string[];
};
export type Session = {
  startsAt?: string;
  id: string;
  orgId: string;
  courseId: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  gmeetLink?: string;
  meetingUrl?: string;
};
export type Assignment = {
  id: string;
  orgId: string;
  courseId: string;
  title: string;
  prompt: string;
  due: string;
  points: number;
};
export type Submission = {
  id: string;
  assignmentId: string;
  orgId: string;
  studentId: string;
  answer: string;
  score?: number;
  feedback?: string;
  published: boolean;
};
export type AttendanceStatus = "present" | "absent" | "late";
export type WorkspaceState = {
  version: 1;
  orgs: Org[];
  courses: Course[];
  members: Member[];
  lessons: Lesson[];
  sessions: Session[];
  assignments: Assignment[];
  submissions: Submission[];
  attendance: Record<string, Record<string, AttendanceStatus>>;
  reports: { orgId: string; lessonId: string; reason: string }[];
};
export type Viewer = {
  name?: string;
  orgId: string;
  role: Role;
  userId: string;
};
export const isTeacher = (role: Role) =>
  role === "teacher" || role === "teacher-admin";
export const canAdmin = (role: Role) => role === "teacher-admin";
export function canSeeCourse(course: Course, viewer: Viewer) {
  if (course.orgId !== viewer.orgId || viewer.role === "super-admin")
    return false;
  return viewer.role === "student"
    ? course.visibility === "public" ||
        course.studentIds.includes(viewer.userId)
    : canAdmin(viewer.role) || course.teacherId === viewer.userId;
}
export function hasCourseAccess(course: Course, viewer: Viewer) {
  return (
    canSeeCourse(course, viewer) &&
    (viewer.role !== "student" ||
      course.studentIds.includes(viewer.userId) ||
      (course.visibility === "public" && course.pricing !== "paid"))
  );
}
export function available(
  state: WorkspaceState,
  viewer: Viewer,
  feature: Feature,
) {
  const org = state.orgs.find((o) => o.id === viewer.orgId);
  return Boolean(
    org?.active && org.accessible !== false && org.features[feature],
  );
}
export function visibleLessons(state: WorkspaceState, viewer: Viewer) {
  if (!available(state, viewer, "recordings")) return [];
  return state.lessons.filter(
    (l) =>
      state.courses.some(
        (c) =>
          c.id === l.courseId &&
          c.orgId === l.orgId &&
          canSeeCourse(c, viewer) &&
          (hasCourseAccess(c, viewer) || l.isFreePreview === true),
      ) &&
      (viewer.role !== "student" || l.status === "published"),
  );
}
export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
