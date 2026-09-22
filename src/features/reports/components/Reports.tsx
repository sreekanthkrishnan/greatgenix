import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Notice, SectionHeading } from "../../../shared/components";
import { loadAudit } from "../api";
export function Reports() {
  const { state, viewer } = useWorkspace();
  const audit = useQuery({
    queryKey: ["audit", viewer.orgId],
    queryFn: () => loadAudit(viewer.orgId),
  });
  return (
    <>
      <section className="panel report-panel">
        <SectionHeading title="Content reports" />
        {state.reports.length ? (
          state.reports.map((r, i) => (
            <div className="report-row" key={i}>
              <strong>
                {state.lessons.find((l) => l.id === r.lessonId)?.title ||
                  "Lesson"}
              </strong>
              <p>{r.reason}</p>
              <a className="text-link" href={`#/recordings/${r.lessonId}`}>
                Review lesson →
              </a>
            </div>
          ))
        ) : (
          <p className="muted">No content reports.</p>
        )}
      </section>
      <section className="panel report-panel">
        <SectionHeading title="Recent organization activity" />
        {audit.error && <Notice>{audit.error.message}</Notice>}
        {audit.data?.map((a) => (
          <div className="setting-row" key={a.id}>
            <span>{a.action}</span>
            <small>{new Date(a.createdAt).toLocaleString()}</small>
          </div>
        ))}
      </section>
    </>
  );
}
