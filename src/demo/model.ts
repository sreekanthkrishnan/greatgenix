export type Role = "teacher" | "student" | "teacher-admin" | "super-admin";
export type Feature = "live" | "recordings" | "attendance" | "assessments";
export const featureLabels: Record<Feature, string> = {
  live: "Live classes",
  recordings: "Recorded lessons",
  attendance: "Attendance",
  assessments: "Assessments",
};
export type Org = {
  id: string;
  name: string;
  active: boolean;
  features: Record<Feature, boolean>;
};
export type Course = {
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
  role: "student" | "teacher";
  email: string;
};
export type LessonType = "video" | "audio" | "document" | "link" | "notes";
export type Lesson = {
  id: string;
  orgId: string;
  courseId: string;
  title: string;
  duration: number;
  status: "draft" | "review" | "published";
  age: string;
  subject: string;
  type?: LessonType;
  url?: string;
  content?: string;
  fileName?: string;
  completeBy: string[];
};
export type Session = {
  id: string;
  orgId: string;
  courseId: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  gmeetLink?: string;
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
export type DemoState = {
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
export type Viewer = { orgId: string; role: Role; userId: string };
export const isTeacher = (role: Role) =>
  role === "teacher" || role === "teacher-admin";
export const canAdmin = (role: Role) => role === "teacher-admin";
export function canSeeCourse(course: Course, viewer: Viewer) {
  if (course.orgId !== viewer.orgId || viewer.role === "super-admin")
    return false;
  return viewer.role === "student"
    ? course.studentIds.includes(viewer.userId)
    : canAdmin(viewer.role) || course.teacherId === viewer.userId;
}
export function available(state: DemoState, viewer: Viewer, feature: Feature) {
  const org = state.orgs.find((o) => o.id === viewer.orgId);
  return Boolean(org?.active && org.features[feature]);
}
export function visibleLessons(state: DemoState, viewer: Viewer) {
  if (!available(state, viewer, "recordings")) return [];
  return state.lessons.filter(
    (l) =>
      state.courses.some(
        (c) =>
          c.id === l.courseId && c.orgId === l.orgId && canSeeCourse(c, viewer),
      ) &&
      (viewer.role !== "student" || l.status === "published"),
  );
}
export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function makeSeed(): DemoState {
  const courses: Course[] = [
    {
      id: "math",
      orgId: "genix",
      title: "The language of numbers",
      subject: "Mathematics",
      grade: "Grade 9",
      batch: "Curiosity · A",
      color: "sage",
      description:
        "Find the patterns behind everyday life. Build confidence with algebra, geometry and a little curiosity.",
      teacherId: "maya",
      studentIds: ["arjun", "isha", "neel", "tara", "dev", "sana"],
    },
    {
      id: "science",
      orgId: "genix",
      title: "A world worth exploring",
      subject: "Science",
      grade: "Grade 9",
      batch: "Discovery · B",
      color: "peach",
      description:
        "Ask better questions. Explore matter, energy and the living world through thoughtful experiments.",
      teacherId: "maya",
      studentIds: ["arjun", "isha", "neel", "tara"],
    },
    {
      id: "english",
      orgId: "genix",
      title: "Every word opens a door",
      subject: "English",
      grade: "Grade 9",
      batch: "Expression · A",
      color: "lavender",
      description:
        "Read closely, write clearly and discover the confidence to tell your own story.",
      teacherId: "maya",
      studentIds: ["arjun", "dev", "sana"],
    },
    {
      id: "cedar-math",
      orgId: "cedar",
      title: "Patterns all around us",
      subject: "Mathematics",
      grade: "Grade 8",
      batch: "Cedar · A",
      color: "sage",
      description:
        "A separate fictional organization, with its own courses and people.",
      teacherId: "cedar-teacher",
      studentIds: ["cedar-student"],
    },
  ];
  return {
    version: 1,
    orgs: [
      {
        id: "genix",
        name: "Great Genix",
        active: true,
        features: {
          live: true,
          recordings: true,
          attendance: true,
          assessments: true,
        },
      },
      {
        id: "cedar",
        name: "Cedar Learning",
        active: true,
        features: {
          live: true,
          recordings: true,
          attendance: false,
          assessments: false,
        },
      },
    ],
    courses,
    members: [
      ...[
        "Arjun Mehta",
        "Isha Nair",
        "Neel Shah",
        "Tara Das",
        "Dev Patel",
        "Sana Ali",
      ].map((name, i) => ({
        id: ["arjun", "isha", "neel", "tara", "dev", "sana"][i],
        orgId: "genix",
        name,
        initials: name
          .split(" ")
          .map((n) => n[0])
          .join(""),
        role: "student" as const,
        email: `${name.split(" ")[0].toLowerCase()}@example.com`,
      })),
      {
        id: "maya",
        orgId: "genix",
        name: "Maya Rao",
        initials: "MR",
        role: "teacher",
        email: "maya@example.com",
      },
      {
        id: "cedar-teacher",
        orgId: "cedar",
        name: "Rohan Sen",
        initials: "RS",
        role: "teacher",
        email: "rohan@example.com",
      },
      {
        id: "cedar-student",
        orgId: "cedar",
        name: "Ava Roy",
        initials: "AR",
        role: "student",
        email: "ava@example.com",
      },
    ],
    lessons: [
      {
        id: "l1",
        orgId: "genix",
        courseId: "math",
        title: "Seeing patterns in linear equations",
        duration: 24,
        status: "published",
        age: "13–15 years",
        subject: "Mathematics",
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        completeBy: [],
      },
      {
        id: "l2",
        orgId: "genix",
        courseId: "math",
        title: "Two variables, one beautiful idea",
        duration: 18,
        status: "published",
        age: "13–15 years",
        subject: "Mathematics",
        type: "notes",
        content: "Linear equations with two variables form straight lines when graphed. Key concepts include slope (m), y-intercept (b), and finding the intersection of two lines.",
        completeBy: ["arjun"],
      },
      {
        id: "l3",
        orgId: "genix",
        courseId: "science",
        title: "The surprising life of a cell",
        duration: 21,
        status: "published",
        age: "13–15 years",
        subject: "Science",
        type: "document",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        completeBy: [],
      },
      {
        id: "l4",
        orgId: "genix",
        courseId: "english",
        title: "A story starts with a question",
        duration: 16,
        status: "published",
        age: "13–15 years",
        subject: "English",
        type: "link",
        url: "https://en.wikipedia.org/wiki/Storytelling",
        completeBy: [],
      },
      {
        id: "l5",
        orgId: "genix",
        courseId: "science",
        title: "Energy in everyday motion",
        duration: 28,
        status: "review",
        age: "13–15 years",
        subject: "Science",
        type: "audio",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        completeBy: [],
      },
      {
        id: "cl1",
        orgId: "cedar",
        courseId: "cedar-math",
        title: "Looking for number patterns",
        duration: 20,
        status: "published",
        age: "12–14 years",
        subject: "Mathematics",
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        completeBy: [],
      },
    ],
    sessions: [
      {
        id: "s1",
        orgId: "genix",
        courseId: "math",
        title: "Let’s solve it together",
        date: localDate(),
        time: "16:00",
        duration: 60,
        gmeetLink: "https://meet.google.com/ggx-math-live",
      },
      {
        id: "s2",
        orgId: "genix",
        courseId: "science",
        title: "Inside the living cell",
        date: localDate(1),
        time: "10:00",
        duration: 45,
        gmeetLink: "https://meet.google.com/ggx-sci-live",
      },
      {
        id: "s3",
        orgId: "genix",
        courseId: "english",
        title: "The art of a good beginning",
        date: localDate(2),
        time: "14:00",
        duration: 45,
        gmeetLink: "https://meet.google.com/ggx-eng-live",
      },
      {
        id: "cs1",
        orgId: "cedar",
        courseId: "cedar-math",
        title: "Patterns workshop",
        date: localDate(1),
        time: "11:00",
        duration: 45,
        gmeetLink: "https://meet.google.com/cdr-math-live",
      },
    ],
    assignments: [
      {
        id: "a1",
        orgId: "genix",
        courseId: "math",
        title: "A little algebra, a lot of possibility",
        prompt:
          "A notebook and a pen cost ₹70 together. The notebook costs ₹30 more than the pen. Write an equation and explain how you would find the cost of each.",
        due: localDate(2),
        points: 10,
      },
      {
        id: "a2",
        orgId: "genix",
        courseId: "science",
        title: "Meet the building blocks of life",
        prompt:
          "Choose two parts of a plant cell. Explain what each part does and how they work together.",
        due: localDate(4),
        points: 10,
      },
    ],
    submissions: [
      {
        id: "sub-isha",
        assignmentId: "a1",
        orgId: "genix",
        studentId: "isha",
        answer:
          "Let the pen cost x. Then x + (x + 30) = 70. So 2x = 40, x = 20. The pen is ₹20 and notebook is ₹50.",
        published: false,
      },
      {
        id: "sub-arjun",
        assignmentId: "a2",
        orgId: "genix",
        studentId: "arjun",
        answer:
          "The chloroplast makes food using sunlight. The cell wall gives the cell its structure and protection.",
        score: 9,
        feedback:
          "Clear explanations, Arjun. Next time, add how the energy supports growth.",
        published: true,
      },
    ],
    attendance: {},
    reports: [],
  };
}
