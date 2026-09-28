import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Notice } from "../../../shared/components";
import { rpc } from "../../../shared/lib/supabase";
import type { Course } from "../../../shared/types";
import {
  itemLabels,
  type ItemKind,
  type LearningItem,
  type LearningModule,
  type Outline,
} from "./types";
function move<T>(list: T[], index: number, delta: number) {
  const next = [...list];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}
export function StructureEditor({ course }: { course: Course }) {
  const { viewer } = useWorkspace();
  const outline = useQuery({
    queryKey: ["structure", viewer.orgId, viewer.userId, course.id],
    queryFn: () =>
      rpc<Outline>("learning_outline", {
        p_org: viewer.orgId,
        p_course: course.id,
      }),
  });
  return (
    <section className="panel report-panel">
      <h2>Modules and sequential learning</h2>
      {outline.isPending && <p>Loading structure…</p>}
      {outline.error && <Notice>{outline.error.message}</Notice>}
      {outline.data && (
        <Editor
          key={course.id}
          course={course}
          initial={outline.data.modules}
        />
      )}
    </section>
  );
}
function Editor({
  course,
  initial,
}: {
  course: Course;
  initial: LearningModule[];
}) {
  const { viewer, state, refresh } = useWorkspace();
  const [modules, setModules] = useState<LearningModule[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activate, setActivate] = useState(course.sequential || false);
  function changeModule(id: string, patch: Partial<LearningModule>) {
    setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function changeItem(
    m: LearningModule,
    id: string,
    patch: Partial<LearningItem>,
  ) {
    changeModule(m.id, {
      items: m.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  }
  return (
    <form
      className="form learning-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          await rpc("save_learning_structure", {
            p_org: viewer.orgId,
            p_course: course.id,
            p_modules: modules,
            p_activate: activate,
          });
          await refresh();
          setMessage(
            activate
              ? "Sequential learning saved and active."
              : "Draft structure saved. Legacy learning remains active.",
          );
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Notice>
        Existing courses keep their lesson library until you activate a learning
        path. Activation imports historical lesson completions and assessment
        submissions. Completed items stay available after reordering; incomplete
        items follow the new order. Items with progress cannot be removed or
        changed to a different resource.
      </Notice>
      {modules.map((m, n) => (
        <fieldset key={m.id} disabled={busy} className="learning-module">
          <legend>Module {n + 1}</legend>
          <label className="field">
            Module title
            <input
              required
              maxLength={100}
              value={m.title}
              onChange={(e) => changeModule(m.id, { title: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              disabled={n === 0}
              onClick={() => setModules(move(modules, n, -1))}
            >
              Move module up
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={n === modules.length - 1}
              onClick={() => setModules(move(modules, n, 1))}
            >
              Move module down
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModules(modules.filter((x) => x.id !== m.id))}
            >
              Remove module
            </Button>
          </div>
          {m.items.map((i, k) => (
            <fieldset key={i.id} className="learning-editor-item">
              <legend>Item {k + 1}</legend>
              <label className="field">
                Item title
                <input
                  required
                  maxLength={100}
                  value={i.title}
                  onChange={(e) =>
                    changeItem(m, i.id, { title: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Type
                <select
                  value={i.kind}
                  onChange={(e) =>
                    changeItem(m, i.id, {
                      kind: e.target.value as ItemKind,
                      lessonId: null,
                      assignmentId: null,
                      sessionId: null,
                      duration_seconds: null,
                    })
                  }
                >
                  {Object.entries(itemLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {["video", "notes", "document"].includes(i.kind) && (
                <label className="field">
                  Published lesson
                  <select
                    required
                    value={i.lessonId || ""}
                    onChange={(e) =>
                      changeItem(m, i.id, { lessonId: e.target.value })
                    }
                  >
                    <option value="">Choose lesson</option>
                    {state.lessons
                      .filter(
                        (l) =>
                          l.courseId === course.id &&
                          l.status === "published" &&
                          (l.type || "video") === i.kind,
                      )
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {i.kind === "video" && (
                <label className="field">
                  Verified video duration in seconds
                  <input
                    required
                    type="number"
                    min="0.1"
                    max="86400"
                    step="0.1"
                    value={i.duration_seconds ?? ""}
                    onChange={(e) =>
                      changeItem(m, i.id, {
                        duration_seconds: Number(e.target.value),
                      })
                    }
                  />
                  <small>
                    Use the actual video duration. Uploaded videos and direct
                    HTTPS MP4, WebM or Ogg URLs support playback tracking.
                    Embedded video pages cannot be activated.
                  </small>
                </label>
              )}
              {i.kind === "assessment" && (
                <label className="field">
                  Assessment
                  <select
                    required
                    value={i.assignmentId || ""}
                    onChange={(e) =>
                      changeItem(m, i.id, { assignmentId: e.target.value })
                    }
                  >
                    <option value="">Choose assessment</option>
                    {state.assignments
                      .filter((a) => a.courseId === course.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {i.kind === "workshop" && (
                <label className="field">
                  Scheduled session (optional)
                  <select
                    value={i.sessionId || ""}
                    onChange={(e) =>
                      changeItem(m, i.id, { sessionId: e.target.value || null })
                    }
                  >
                    <option value="">No scheduled session</option>
                    {state.sessions
                      .filter((s) => s.courseId === course.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {["practice", "workshop"].includes(i.kind) && (
                <label className="field">
                  Instructions
                  <textarea
                    required
                    maxLength={20000}
                    value={i.content || ""}
                    onChange={(e) =>
                      changeItem(m, i.id, { content: e.target.value })
                    }
                  />
                </label>
              )}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={k === 0}
                  onClick={() =>
                    changeModule(m.id, { items: move(m.items, k, -1) })
                  }
                >
                  Move item up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={k === m.items.length - 1}
                  onClick={() =>
                    changeModule(m.id, { items: move(m.items, k, 1) })
                  }
                >
                  Move item down
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    changeModule(m.id, {
                      items: m.items.filter((x) => x.id !== i.id),
                    })
                  }
                >
                  Remove item
                </Button>
              </div>
              <label className="field">
                Move to module
                <select
                  value={m.id}
                  onChange={(e) => {
                    const target = e.target.value;
                    setModules((ms) =>
                      ms.map((x) =>
                        x.id === m.id
                          ? {
                              ...x,
                              items: x.items.filter((a) => a.id !== i.id),
                            }
                          : x.id === target
                            ? { ...x, items: [...x.items, i] }
                            : x,
                      ),
                    );
                  }}
                >
                  {modules.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title || "Untitled module"}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              changeModule(m.id, {
                items: [
                  ...m.items,
                  { id: crypto.randomUUID(), title: "", kind: "notes" },
                ],
              })
            }
          >
            Add learning item
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() =>
          setModules((ms) => [
            ...ms,
            { id: crypto.randomUUID(), title: "", items: [] },
          ])
        }
      >
        Add module
      </Button>
      <label>
        <input
          type="checkbox"
          checked={activate}
          disabled={course.sequential || busy}
          onChange={(e) => setActivate(e.target.checked)}
        />{" "}
        Activate sequential learning. Students will need enrollment and must
        complete items in order. Unlisted lessons, assessments and sessions
        become unavailable to students.
      </label>
      {message && <p role="status">{message}</p>}
      <Button disabled={busy || !modules.length}>
        {busy ? "Saving…" : "Save learning path"}
      </Button>
    </form>
  );
}
