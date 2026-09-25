import { useState } from "react";
import { ArrowUpRight, BookOpen, Compass, Search } from "lucide-react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { useScope } from "../../../shared/hooks/useScope";
import { hasCourseAccess } from "../../../shared/types";
import { Empty } from "../../../shared/components";
export function ExploreCourses() {
  const { viewer } = useWorkspace();
  const { courses, lessons } = useScope();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const catalog = courses.filter((c) => c.visibility === "public");
  const filtered = catalog.filter(
    (c) =>
      (filter === "all" || (c.pricing || "free") === filter) &&
      `${c.title} ${c.subject} ${c.description}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <div className="course-catalog">
      <header className="catalog-heading">
        <div>
          <span className="eyebrow">
            <Compass size={15} /> YOUR NEXT CHAPTER
          </span>
          <h1>Explore courses</h1>
          <p>
            Discover a new interest. Build a new skill. Keep your curiosity
            growing.
          </p>
        </div>
        <div className="catalog-emblem" aria-hidden="true">
          <BookOpen size={38} />
          <span>Room to grow.</span>
        </div>
      </header>
      <div className="catalog-toolbar">
        <div
          className="catalog-filters"
          role="group"
          aria-label="Filter courses"
        >
          {[
            ["all", "All courses"],
            ["free", "Free courses"],
            ["paid", "Paid courses"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search catalog"
            placeholder="Find your next course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="catalog-section-title">
        <h2>Discover something new</h2>
        <span>
          {filtered.length} {filtered.length === 1 ? "course" : "courses"}{" "}
          available
        </span>
      </div>
      <div className="catalog-grid">
        {filtered.map((c, i) => {
          const paid = c.pricing === "paid";
          const access = hasCourseAccess(c, viewer);
          const previewCount = lessons.filter(
            (l) =>
              l.courseId === c.id &&
              l.isFreePreview &&
              l.status === "published",
          ).length;
          return (
            <a href={`#/courses/${c.id}`} className="catalog-card" key={c.id}>
              <div className={`catalog-cover cover-${i % 4}`}>
                <span className="catalog-cover-label">{c.subject}</span>
                <strong>{c.title}</strong>
                <BookOpen
                  className="catalog-cover-art"
                  size={94}
                  strokeWidth={1}
                />
                <span className="catalog-cover-grade">{c.grade}</span>
              </div>
              <div className="catalog-card-body">
                <span className={`catalog-access-badge ${paid ? "paid" : ""}`}>
                  {paid ? "Paid course" : "Free course"}
                </span>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <div className="catalog-card-meta">
                  <span>{c.batch}</span>
                  <span>
                    {paid
                      ? previewCount
                        ? `${previewCount} free ${previewCount === 1 ? "preview" : "previews"}`
                        : "Manual payment"
                      : "Open to your organization"}
                  </span>
                </div>
                <span className={`catalog-cta ${access ? "filled" : ""}`}>
                  {access
                    ? "Start learning"
                    : previewCount
                      ? "Preview course"
                      : "View course"}
                  <ArrowUpRight size={16} />
                </span>
              </div>
            </a>
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
