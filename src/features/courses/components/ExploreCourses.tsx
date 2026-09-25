import { useState } from "react";
import { Search } from "lucide-react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { useScope } from "../../../shared/hooks/useScope";
import { hasCourseAccess } from "../../../shared/types";
import {
  Button,
  CourseCard,
  Empty,
  PageHeading,
  SectionHeading,
} from "../../../shared/components";
export function ExploreCourses() {
  const { viewer } = useWorkspace();
  const { courses, lessons } = useScope();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const catalog = courses.filter((c) => c.visibility === "public");
  const freeCount = catalog.filter((c) => c.pricing !== "paid").length;
  const filtered = catalog.filter(
    (c) =>
      (filter === "all" || (c.pricing || "free") === filter) &&
      `${c.title} ${c.subject} ${c.description}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <div className="course-catalog">
      <PageHeading
        section="courses"
        eyebrow="YOUR NEXT CHAPTER"
        title="Explore courses"
        description="Discover a new interest. Build a new skill. Keep your curiosity growing."
        summary={[
          {
            value: catalog.length,
            label: catalog.length === 1 ? "course" : "courses",
          },
          {
            value: freeCount,
            label: freeCount === 1 ? "free course" : "free courses",
          },
        ]}
      />
      <div className="list-toolbar explore-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search catalog"
            placeholder="Find your next course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div
          className="explore-filters"
          role="group"
          aria-label="Filter courses"
        >
          {[
            ["all", "All courses"],
            ["free", "Free courses"],
            ["paid", "Paid courses"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={filter === value ? "primary" : "secondary"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <SectionHeading
        title="Discover something new"
        action={
          <span className="muted" role="status">
            {filtered.length} {filtered.length === 1 ? "course" : "courses"}{" "}
            available
          </span>
        }
      />
      <div className="course-grid">
        {filtered.map((c) => {
          const access = hasCourseAccess(c, viewer);
          const previewCount = lessons.filter(
            (l) =>
              l.courseId === c.id &&
              l.isFreePreview &&
              l.status === "published",
          ).length;
          return (
            <CourseCard
              key={c.id}
              course={c}
              detail={
                access
                  ? "Start learning"
                  : previewCount
                    ? `Preview course · ${previewCount} free ${previewCount === 1 ? "preview" : "previews"}`
                    : "View course"
              }
            />
          );
        })}
      </div>
      {!filtered.length && (
        <Empty
          title={
            search || filter !== "all"
              ? "No matching courses"
              : "New possibilities are on their way"
          }
          text={
            search || filter !== "all"
              ? "Try another search or choose All courses."
              : "Public courses available to you will appear here when your organization publishes them."
          }
        />
      )}
    </div>
  );
}
