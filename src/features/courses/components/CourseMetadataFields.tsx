import { Field } from "../../../shared/components";
import type { Course } from "../../../shared/types";

export function CourseMetadataFields({ course }: { course?: Course }) {
  return (
    <div className="form-row course-metadata-fields">
      <Field label="Subject (optional)">
        <input
          name="subject"
          aria-label="Subject"
          maxLength={40}
          defaultValue={course?.subject ?? ""}
        />
      </Field>
      <Field label="Grade (optional)">
        <input
          name="grade"
          aria-label="Grade"
          maxLength={40}
          defaultValue={course?.grade ?? ""}
        />
      </Field>
      <Field label="Batch (optional)">
        <input
          name="batch"
          aria-label="Batch"
          maxLength={40}
          defaultValue={course?.batch ?? ""}
        />
      </Field>
    </div>
  );
}
