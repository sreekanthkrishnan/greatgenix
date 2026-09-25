import { useState } from "react";
import {
  Button,
  CourseArt,
  CourseThumbnail,
  Field,
} from "../../../shared/components";
import type { Course } from "../../../shared/types";
import { validateImage } from "../../../shared/utils/imageUpload";

export function CourseThumbnailField({
  value,
  onChange,
  onLoadingChange,
  color = "sage",
  onColorChange,
  disabled = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  onLoadingChange: (loading: boolean) => void;
  color?: Course["color"];
  onColorChange: (color: Course["color"]) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="course-thumbnail-editor">
      <CourseThumbnail thumbnailUrl={value} color={color} />
      <fieldset className="thumbnail-options" disabled={disabled || loading}>
        <legend>System thumbnails</legend>
        <div className="thumbnail-option-grid">
          {(
            [
              ["sage", "Garden"],
              ["peach", "Orbit"],
              ["lavender", "Library"],
            ] as const
          ).map(([option, label]) => (
            <button
              type="button"
              key={option}
              className="thumbnail-option"
              aria-pressed={!value && color === option}
              onClick={() => {
                onColorChange(option);
                onChange(null);
                setError("");
              }}
            >
              <CourseArt color={option} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Field
        label="Course thumbnail (optional)"
        hint="PNG, JPEG or WebP under 200 KB. A landscape image works best. Leave empty to use the built-in artwork."
      >
        <input
          type="file"
          aria-label="Course thumbnail (optional)"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || loading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError("");
            setLoading(true);
            onLoadingChange(true);
            try {
              onChange(await validateImage(file, "thumbnail"));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setLoading(false);
              onLoadingChange(false);
            }
          }}
        />
      </Field>
      {loading && <p role="status">Loading thumbnail…</p>}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {value && (
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || loading}
          onClick={() => {
            onChange(null);
            setError("");
          }}
        >
          Remove thumbnail
        </Button>
      )}
    </div>
  );
}
