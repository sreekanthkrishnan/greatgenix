import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Plus,
  Users,
  Video,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Badge,
  Button,
  Empty,
  Notice,
  PageHeading,
  Unavailable,
  dateLabel,
  timeLabel,
} from "../../../shared/components";
import { ActionForm } from "../../../shared/components/ActionForm";
import { useScope } from "../../../shared/hooks/useScope";
import { mediaGateway } from "../../../shared/lib/video-adapters";
import { available } from "../../../shared/types";

export function Sessions({ id }: { id?: string }) {
  const { state, viewer } = useWorkspace();
  const { sessions, teacher } = useScope();
  const [form, setForm] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState("");
  if (!available(state, viewer, "live")) return <Unavailable />;
  const session = id ? sessions.find((s) => s.id === id) : undefined;
  if (id && !session)
    return (
      <Unavailable
        title="This session isn’t available"
        text="It may belong to another classroom or organization."
      />
    );
  async function join() {
    setBusy(true);
    try {
      const result = await mediaGateway.joinSession(id!);
      const url = new URL(result.roomUrl);
      url.searchParams.set("t", result.token);
      setRoom(url.toString());
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (session) {
    const course = state.courses.find((c) => c.id === session.courseId)!;
    return (
      <>
        <a className="back-link" href="#/sessions">
          ← Class schedule
        </a>
        <PageHeading
          eyebrow="LEARN TOGETHER"
          title={session.title}
          description={`${course.subject} · ${course.grade} · ${course.batch}`}
        />
        <div className="live-room">
          {room ? (
            <div className="media-player">
              <iframe
                src={room}
                title="Live classroom"
                allow="camera; microphone; fullscreen; display-capture"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="live-room-art">
              <Video size={48} />
              <h2>A classroom, wherever you are.</h2>
              <p>Your private classroom opens when you join.</p>
              <Badge tone="light">PRIVATE CLASSROOM</Badge>
            </div>
          )}
          <div className="live-room-details">
            <h3>Before we begin</h3>
            <div className="detail-row">
              <CalendarDays size={18} />
              <span>{dateLabel(session.date)}</span>
            </div>
            <div className="detail-row">
              <Clock3 size={18} />
              <span>
                {timeLabel(session.time)} · {session.duration} minutes
              </span>
            </div>
            <div className="detail-row">
              <Users size={18} />
              <span>{course.studentIds.length} enrolled learners</span>
            </div>
            <p className="muted">
              Times follow your browser’s local time zone. Joining opens the
              classroom and may request camera and microphone access.
            </p>
            <Button onClick={join} disabled={busy}>
              <Video size={17} />
              {busy
                ? "Checking…"
                : teacher
                  ? "Start / join class"
                  : "Join class"}
            </Button>
            {message && (
              <div className="inline-error" role="status">
                {message}
              </div>
            )}
            <a className="text-link" href={`#/courses/${course.id}`}>
              Visit course <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE TIME FOR DISCOVERY"
        title="Class schedule"
        description="A little structure. A lot to look forward to."
        action={
          teacher && (
            <Button onClick={() => setForm(true)}>
              <Plus size={17} />
              Schedule a class
            </Button>
          )
        }
      />
      <Notice>
        Private rooms are available from 15 minutes before class until 30
        minutes after its scheduled end.
      </Notice>
      <div className="schedule-list">
        {sessions.map((s) => (
          <div className="schedule-card" key={s.id}>
            <div className="date-block">
              <strong>{new Date(`${s.date}T12:00`).getDate()}</strong>
              <span>
                {new Date(`${s.date}T12:00`).toLocaleDateString("en-IN", {
                  month: "short",
                })}
              </span>
            </div>
            <div>
              <span className="eyebrow">
                {timeLabel(s.time)} · {s.duration} MIN
              </span>
              <h3>{s.title}</h3>
              <p>
                {state.courses.find((c) => c.id === s.courseId)?.subject} · Live
                session
              </p>
            </div>
            <a className="button secondary" href={`#/sessions/${s.id}`}>
              View session <ArrowUpRight size={16} />
            </a>
          </div>
        ))}
      </div>
      {!sessions.length && (
        <Empty
          title="Your calendar has room to grow"
          text="Schedule a class to get started."
        />
      )}
      {form && <ActionForm kind="session" close={() => setForm(false)} />}
    </>
  );
}
