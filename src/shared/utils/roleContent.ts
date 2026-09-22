import type { Role } from "../types";

/** Presentation follows the server-provided role; this never grants permissions. */
export const roleContent: Record<
  Role,
  {
    label: string;
    workspace: string;
    overviewDescription: string;
    coursesEyebrow: string;
    coursesDescription: string;
    libraryEyebrow: string;
    libraryDescription: string;
    scheduleEyebrow: string;
    scheduleDescription: string;
    assessmentsEyebrow: string;
    assessmentsDescription: string;
    emptyCourses: string;
    profileDescription: string;
  }
> = {
  student: {
    label: "Student",
    workspace: "Your learning space",
    overviewDescription:
      "Continue your lessons, join classes and follow your progress.",
    coursesEyebrow: "Your enrolled courses",
    coursesDescription:
      "Find your lessons, class schedules and learning resources.",
    libraryEyebrow: "Your learning collection",
    libraryDescription: "Pick up where you left off. Learn at your own pace.",
    scheduleEyebrow: "Your upcoming classes",
    scheduleDescription:
      "See when your classes meet and join your next session.",
    assessmentsEyebrow: "Your work & progress",
    assessmentsDescription:
      "Complete your assignments and review your teacher’s feedback.",
    emptyCourses:
      "Your enrolled courses will appear here. Ask your teacher about joining a course.",
    profileDescription:
      "Manage the profile your teachers see in your learning workspace.",
  },
  teacher: {
    label: "Teacher",
    workspace: "Your teaching space",
    overviewDescription:
      "Plan your classes, share lessons and support your learners.",
    coursesEyebrow: "Your teaching collection",
    coursesDescription:
      "Manage lessons, classes and learners in your assigned courses.",
    libraryEyebrow: "Your teaching resources",
    libraryDescription: "Create, review and publish lessons for your learners.",
    scheduleEyebrow: "Your teaching schedule",
    scheduleDescription:
      "Schedule your classes and prepare for your next teaching session.",
    assessmentsEyebrow: "Your assessment studio",
    assessmentsDescription:
      "Create assignments, review submissions and give learners feedback.",
    emptyCourses:
      "Courses assigned to you will appear here. Contact your organization administrator for an assignment.",
    profileDescription:
      "Introduce yourself to your learners and teaching colleagues.",
  },
  "teacher-admin": {
    label: "Teacher administrator",
    workspace: "Your teaching & admin space",
    overviewDescription:
      "Coordinate your courses, support your teachers and keep learners on track.",
    coursesEyebrow: "Your organization’s courses",
    coursesDescription:
      "Create courses, assign teachers and manage your learning programs.",
    libraryEyebrow: "Your organization’s lesson library",
    libraryDescription:
      "Manage lessons and published resources across your organization.",
    scheduleEyebrow: "Your organization’s schedule",
    scheduleDescription:
      "Coordinate teaching sessions across your organization’s courses.",
    assessmentsEyebrow: "Your organization’s assessments",
    assessmentsDescription:
      "Manage assignments, review submissions and oversee learner feedback.",
    emptyCourses:
      "Create a course and assign a teacher to start building your classroom.",
    profileDescription:
      "Manage your profile as a teacher and organization administrator.",
  },
  "super-admin": {
    label: "Platform administrator",
    workspace: "Your platform space",
    overviewDescription:
      "Manage organizations and their access to the platform.",
    coursesEyebrow: "Organization courses",
    coursesDescription:
      "Switch to an organization membership to access its courses.",
    libraryEyebrow: "Organization lesson libraries",
    libraryDescription:
      "Switch to an organization membership to access its lessons.",
    scheduleEyebrow: "Organization schedules",
    scheduleDescription:
      "Switch to an organization membership to access its schedule.",
    assessmentsEyebrow: "Organization assessments",
    assessmentsDescription:
      "Switch to an organization membership to access its assessments.",
    emptyCourses: "Course access is managed through organization membership.",
    profileDescription: "Manage your platform administrator profile.",
  },
};

export function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function profileText(value: unknown) {
  return typeof value === "string" ? value : "";
}
