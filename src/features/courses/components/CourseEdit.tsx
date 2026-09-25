import { useEffect, useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { useScope } from "../../../shared/hooks/useScope";
import {
  Button,
  Modal,
  Notice,
  PageHeading,
  Unavailable,
} from "../../../shared/components";
import { canAdmin, type Course } from "../../../shared/types";
import { CourseMetadataFields } from "./CourseMetadataFields";
import { CourseThumbnailField } from "./CourseThumbnailField";
import { CoursePricingFields, parseCoursePricing } from "./CoursePricing";
import { AccessOptions, type AccessKind } from "./AccessOptions";

function CourseEditForm({ course }: { course: Course }) {
  const { act, busy } = useWorkspace();
  const [color, setColor] = useState(course.color);
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnailUrl ?? null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [kind, setKind] = useState<AccessKind>(
    course.visibility === "public" ? course.pricing || "free" : "private",
  );
  const [coursePrice, setCoursePrice] = useState(
    String(course.coursePrice ?? ""),
  );
  const [discountedPrice, setDiscountedPrice] = useState(
    String(course.discountedPrice ?? ""),
  );
  const [error, setError] = useState("");
  useEffect(
    () => setThumbnailUrl(course.thumbnailUrl ?? null),
    [course.thumbnailUrl],
  );
  return (
    <section className="panel report-panel course-access-panel">
      <div className="access-section-heading">
        <h2>Course settings</h2>
      </div>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const fields = new FormData(e.currentTarget);
          try {
            await act(
              {
                type: "course-access",
                id: course.id,
                thumbnailUrl,
                color,
                subject: String(fields.get("subject") || "").trim(),
                grade: String(fields.get("grade") || "").trim(),
                batch: String(fields.get("batch") || "").trim(),
                visibility: kind === "private" ? "private" : "public",
                pricing: kind === "paid" ? "paid" : "free",
                ...parseCoursePricing(kind, coursePrice, discountedPrice),
              },
              "Course settings saved.",
            );
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <CourseMetadataFields course={course} />
        <CourseThumbnailField
          value={thumbnailUrl}
          color={color}
          onColorChange={setColor}
          onChange={setThumbnailUrl}
          onLoadingChange={setThumbnailLoading}
          disabled={busy}
        />
        <AccessOptions value={kind} onChange={setKind} disabled={busy} />
        {kind === "paid" && (
          <CoursePricingFields
            coursePrice={coursePrice}
            discountedPrice={discountedPrice}
            onPriceChange={setCoursePrice}
            onDiscountChange={setDiscountedPrice}
          />
        )}
        <Notice>
          Public courses are visible to students in this organization. In paid
          courses, only lessons marked as free previews are available before
          access is granted. Existing enrolled students keep full access.
        </Notice>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="form-actions">
          <a className="button secondary" href={`#/courses/${course.id}`}>
            Back to course
          </a>
          <Button disabled={busy || thumbnailLoading}>Save changes</Button>
        </div>
      </form>
    </section>
  );
}

export function CourseEdit({ id }: { id: string }) {
  const { viewer, act, busy } = useWorkspace();
  const { courses, teacher } = useScope();
  const course = courses.find((c) => c.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (
    !course ||
    !teacher ||
    !(canAdmin(viewer.role) || course.teacherId === viewer.userId)
  ) {
    return (
      <Unavailable
        title="Course editing unavailable"
        text="Only the assigned teacher or an organization administrator can edit this course."
      />
    );
  }
  async function handleDeleteCourse() {
    const ok = await act(
      { type: "delete-course", id: course!.id },
      "Course deleted successfully.",
    );
    if (ok) {
      location.hash = "#/courses";
    }
  }

  return (
    <>
      <a className="back-link" href={`#/courses/${course.id}`}>
        ← Course details
      </a>
      <PageHeading
        section="courses"
        eyebrow={course.title}
        title="Edit course"
        description="Update course details, thumbnail, pricing, and access settings."
      />
      <CourseEditForm key={course.id} course={course} />
      <div className="form-actions">
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
        >
          Delete course
        </Button>
      </div>
      {confirmDelete && (
        <Modal title="Delete Course?" close={() => setConfirmDelete(false)}>
          <p
            style={{
              marginBottom: "1.25rem",
              color: "var(--text-color, currentColor)",
            }}
          >
            Are you sure you want to delete <strong>{course.title}</strong>?
            This action cannot be undone and will permanently remove this course
            along with all associated lessons, class schedules, assignments, and
            enrollment records.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteCourse} disabled={busy}>
              {busy ? "Deleting…" : "Yes, delete course"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
