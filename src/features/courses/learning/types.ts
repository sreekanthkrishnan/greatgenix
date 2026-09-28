import type {
  Assignment,
  Lesson,
  Session,
  Submission,
} from "../../../shared/types";
export type ItemKind =
  "video" | "notes" | "document" | "assessment" | "workshop" | "practice";
export type LearningItem = {
  id: string;
  title: string;
  kind: ItemKind;
  lessonId?: string | null;
  assignmentId?: string | null;
  sessionId?: string | null;
  duration_seconds?: number | null;
  content?: string;
  state?: "locked" | "available" | "completed";
  completed?: boolean;
  watched?: number;
  required?: number;
  eligible?: boolean;
  score?: number | null;
  feedback?: string | null;
  evaluated_at?: string | null;
};
export type LearningModule = {
  id: string;
  title: string;
  items: LearningItem[];
};
export type Outline = {
  access: boolean;
  enrolled: boolean;
  modules: LearningModule[];
};
export type ItemContent = LearningItem & {
  lesson: Lesson | null;
  assignment: Assignment | null;
  session: Session | null;
  submission: Submission | null;
};
export const itemLabels: Record<ItemKind, string> = {
  video: "Video lesson",
  notes: "Notes",
  document: "Reading document",
  assessment: "Assessment",
  workshop: "Workshop",
  practice: "Practice activity",
};
