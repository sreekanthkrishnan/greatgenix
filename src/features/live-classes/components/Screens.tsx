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
import { available } from "../../../shared/types";

export function Sessions({ id }: { id?: string }) {
  const { state, viewer } = useWorkspace();
  const { sessions, teacher } = useScope();
  const [form, setForm] = useState(false);
  if (!available(state, viewer, "live")) return <Unavailable />;
  const session = id ? sessions.find((s) => s.id === id) : undefined;
  if (id && !session)
    return (
      <Unavailable
        title="This session isn’t available"
        text="It may belong to another classroom or organization."
      />
    );
  const meetingUrl = session?.meetingUrl || session?.gmeetLink || "https://meet.google.com";

  function getPlatformInfo(url: string) {
    if (url.includes("zoom.us")) {
      return { name: "Zoom", label: "Join Zoom Meeting", badge: "ZOOM LIVE" };
    }
    if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) {
      return { name: "Microsoft Teams", label: "Join Teams Meeting", badge: "TEAMS LIVE" };
    }
    if (url.includes("webex.com")) {
      return { name: "Webex", label: "Join Webex Meeting", badge: "WEBEX LIVE" };
    }
    if (url.includes("meet.google.com")) {
      return { name: "Google Meet", label: "Join Google Meet", badge: "GOOGLE MEET LIVE" };
    }
    return { name: "Live Class", label: "Join Live Class", badge: "LIVE MEETING" };
  }

  const platform = getPlatformInfo(meetingUrl);

  function join() {
    window.open(meetingUrl, "_blank", "noopener,noreferrer");
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
          <div className="live-room-art">
            <Video size={48} />
            <h2>{`Interactive ${platform.name} Classroom`}</h2>
            <p>{`Attend live interactive sessions directly via ${platform.name}.`}</p>
            <Badge tone="light">{platform.badge}</Badge>
          </div>
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
            <div className="detail-row">
              <Video size={18} />
              <a
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                {meetingUrl}
              </a>
            </div>
            <p className="muted">
              Times follow your browser’s local time zone. Clicking join opens
              the meeting link in a new tab.
            </p>
            <Button onClick={join}>
              <Video size={17} />
              {teacher ? `Start / ${platform.label}` : platform.label}
            </Button>
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
        Live classes support any video conferencing link (Google Meet, Zoom, MS Teams, etc.).
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
