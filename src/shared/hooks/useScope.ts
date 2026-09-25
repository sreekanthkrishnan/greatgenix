import { useWorkspace } from "../../app/providers/OrgContextProvider";
import {
  canSeeCourse,
  hasCourseAccess,
  isTeacher,
  visibleLessons,
} from "../types";
export function useScope() {
  const { state, viewer } = useWorkspace();
  const courses = state.courses.filter((c) => canSeeCourse(c, viewer));
  const sessions = state.sessions
    .filter((s) =>
      courses.some((c) => c.id === s.courseId && hasCourseAccess(c, viewer)),
    )
    .map((s) => {
      if (!s.startsAt) return s;
      const date = new Date(s.startsAt);
      return {
        ...s,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
      };
    })
    .sort((a, b) =>
      (a.startsAt || `${a.date}T${a.time}`).localeCompare(
        b.startsAt || `${b.date}T${b.time}`,
      ),
    );
  return {
    courses,
    sessions,
    lessons: visibleLessons(state, viewer),
    teacher: isTeacher(viewer.role),
  };
}
