import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  Lesson,
  LessonReference,
  LessonType,
} from "../../../shared/types";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Field, Modal } from "../../../shared/components";
import { LessonArtwork } from "./LessonArtwork";
import { ResourceViewer } from "./ResourceViewer";

const labels = {
  video: "Video",
  audio: "Audio",
  document: "Document",
  link: "Link",
  notes: "Notes",
};
export function MaterialThumbnail({
  type,
  title,
  fileName,
}: {
  type: LessonType;
  title?: string;
  fileName?: string;
}) {
  const extension = fileName?.split(".").pop()?.toUpperCase();
  return (
    <div className={`material-thumbnail material-${type}`} aria-hidden="true">
      <LessonArtwork type={type} />
      <span>{type === "document" && extension ? extension : labels[type]}</span>
      {title && <small>{title}</small>}
    </div>
  );
}

export function LessonReferences({
  lesson,
  editable,
}: {
  lesson: Lesson;
  editable: boolean;
}) {
  const { act, busy } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<LessonReference>();
  const [type, setType] = useState<LessonReference["type"]>("notes");
  const [file, setFile] = useState<{ url: string; name: string }>();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const references = lesson.references || [];
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (key: string) => String(data.get(key) || "").trim();
    const url = type === "document" && file ? file.url : value("url");
    if (type !== "notes" && !file && !/^https?:\/\//i.test(url)) {
      setError("Use an http or https URL.");
      return;
    }
    if (!value("title") || (type === "notes" && !value("content"))) {
      setError("Add a title and reference content.");
      return;
    }
    const ok = await act(
      {
        type: "lesson-reference",
        id: lesson.id,
        reference: {
          id: crypto.randomUUID(),
          type,
          title: value("title"),
          ...(type === "notes" ? { content: value("content") } : { url }),
          ...(type === "document" && file ? { fileName: file.name } : {}),
        },
      },
      "Reference added.",
    );
    if (ok) setAdding(false);
    else setError("Could not save the reference. Please try again.");
  }
  if (!editable && !references.length) return null;
  return (
    <section className="lesson-references">
      <div className="reference-heading">
        <div>
          <h2>Lesson references</h2>
          <p className="muted">Notes, links and documents for this lesson.</p>
        </div>
        {editable && (
          <Button
            variant="secondary"
            onClick={() => {
              setAdding(true);
              setFile(undefined);
              setError("");
              setType("notes");
            }}
          >
            <Plus size={16} />
            Add reference
          </Button>
        )}
      </div>
      {references.length ? (
        <div className="reference-grid">
          {references.map((reference) => (
            <article className="reference-card" key={reference.id}>
              <button
                className="reference-open"
                onClick={() => setSelected(reference)}
              >
                <MaterialThumbnail
                  type={reference.type}
                  fileName={reference.fileName}
                />
                <strong>{reference.title}</strong>
                <small>{reference.fileName || labels[reference.type]}</small>
              </button>
              {editable && (
                <button
                  className="reference-remove"
                  aria-label={`Remove ${reference.title}`}
                  disabled={busy}
                  onClick={() =>
                    act(
                      {
                        type: "remove-lesson-reference",
                        id: lesson.id,
                        referenceId: reference.id,
                      },
                      "Reference removed.",
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="reference-empty">
          Add supporting material to help learners revisit this lesson.
        </p>
      )}
      {selected && (
        <Modal title={selected.title} close={() => setSelected(undefined)}>
          <ResourceViewer lesson={{ ...lesson, ...selected }} />
        </Modal>
      )}
      {adding && (
        <Modal title="Add lesson reference" close={() => setAdding(false)}>
          <form onSubmit={submit} className="form-grid">
            <Field label="Reference type">
              <select
                disabled={reading || busy}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as LessonReference["type"]);
                  setFile(undefined);
                  setError("");
                }}
              >
                <option value="notes">Notes</option>
                <option value="link">Link</option>
                <option value="document">Document</option>
              </select>
            </Field>
            <Field label="Reference title">
              <input name="title" required maxLength={180} autoFocus />
            </Field>
            {type === "notes" ? (
              <Field label="Reference notes">
                <textarea name="content" rows={6} required maxLength={20000} />
              </Field>
            ) : (
              <>
                {type === "document" && (
                  <Field label="Upload reference document">
                    <input
                      disabled={reading || busy}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp"
                      onChange={async (e) => {
                        const chosen = e.target.files?.[0];
                        setFile(undefined);
                        setError("");
                        if (!chosen) return;
                        if (chosen.size > 5 * 1024 * 1024) {
                          setError("Choose a file smaller than 5 MB.");
                          e.target.value = "";
                          return;
                        }
                        setReading(true);
                        const reader = new FileReader();
                        reader.onload = () => {
                          setFile({
                            url: String(reader.result),
                            name: chosen.name,
                          });
                          setReading(false);
                        };
                        reader.onerror = () => {
                          setError(
                            "Could not read this file. Please try again.",
                          );
                          setReading(false);
                        };
                        reader.readAsDataURL(chosen);
                      }}
                    />
                    <small>
                      PDF, Word, slides, text or images · up to 5 MB
                    </small>
                  </Field>
                )}
                <Field
                  label={
                    type === "document" ? "Or document URL" : "Reference URL"
                  }
                >
                  <input
                    name="url"
                    type="url"
                    required={!file}
                    placeholder="https://"
                    disabled={Boolean(file)}
                  />
                </Field>
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <Button type="submit" disabled={busy || reading}>
              {reading ? "Reading file…" : busy ? "Saving…" : "Save reference"}
            </Button>
          </form>
        </Modal>
      )}
    </section>
  );
}
