import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { rpc } from "../../../shared/lib/supabase";
import { mediaGateway } from "../../../shared/lib/video-adapters";
import { Button, Notice } from "../../../shared/components";
import type { Lesson } from "../../../shared/types";
export type PlaybackCredit = { watched: number; eligible: boolean };

export function Playback({
  orgId,
  itemId,
  lesson,
  onCredit,
}: {
  orgId: string;
  itemId: string;
  lesson: Lesson;
  onCredit: (credit: PlaybackCredit) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<{ url: string; token: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const creditRef = useRef(onCredit);
  creditRef.current = onCredit;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    let alive = true;
    let hls: Hls | undefined;
    let sequence = 0;
    let chain = Promise.resolve();
    let visible = true;
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      sample(
        visible && !video.paused && !video.seeking && video.readyState >= 3,
        !visible,
      );
    });
    observer.observe(video);
    function sample(active: boolean, flush = false) {
      if (!alive || !video || !source) return;
      const position = video.currentTime;
      const counted = active && !document.hidden && visible;
      // Serialize requests so events and timer ticks cannot race or replay a sequence number.
      chain = chain.then(async () => {
        if (!alive) return;
        try {
          const credit = await rpc<PlaybackCredit>("learning_playback_tick", {
            p_org: orgId,
            p_item: itemId,
            p_token: source!.token,
            p_sequence: ++sequence,
            p_position: position,
            p_active: counted,
            p_flush: flush,
          });
          if (alive) creditRef.current(credit);
        } catch (e) {
          if (alive) {
            setError((e as Error).message);
            alive = false;
            video!.pause();
          }
        }
      });
    }
    const active = () =>
      !video.paused && !video.seeking && video.readyState >= 3;
    const stop = () => sample(false, true);
    const seek = () => sample(false);
    const start = () => sample(active());
    const end = () => {
      if (video.ended) sample(true);
    };
    const visibility = () =>
      sample(active() && !document.hidden, document.hidden);
    const events = ["waiting", "ratechange"] as const;
    video.addEventListener("seeking", seek);
    events.forEach((e) => video.addEventListener(e, stop));
    const pause = () => {
      if (!video.ended) stop();
    };
    video.addEventListener("pause", pause);
    video.addEventListener("playing", start);
    video.addEventListener("seeked", start);
    video.addEventListener("ended", end);
    document.addEventListener("visibilitychange", visibility);
    if (lesson.url || video.canPlayType("application/vnd.apple.mpegurl"))
      video.src = source.url;
    else
      void import("hls.js")
        .then(({ default: Hls }) => {
          if (alive) {
            hls = new Hls();
            hls.loadSource(source.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) {
                video.pause();
                setError(
                  "Video interrupted. Reopen the video to refresh access.",
                );
              }
            });
          }
        })
        .catch((e) => setError(String(e)));
    const timer = setInterval(() => sample(active()), 1000);
    const refreshTimer = lesson.url
      ? undefined
      : setInterval(async () => {
          try {
            const next = await mediaGateway.getPlayback(lesson.id);
            if (!alive) return;
            const time = video.currentTime;
            const playing = !video.paused;
            sample(false);
            video.addEventListener(
              "loadedmetadata",
              () => {
                if (!alive) return;
                video.currentTime = time;
                if (playing) void video.play().catch(() => {});
              },
              { once: true },
            );
            if (hls) hls.loadSource(next.url);
            else video.src = next.url;
          } catch (e) {
            if (alive) {
              setError((e as Error).message);
              alive = false;
              video.pause();
            }
          }
        }, 240000);
    return () => {
      alive = false;
      clearInterval(timer);
      if (refreshTimer) clearInterval(refreshTimer);
      observer.disconnect();
      hls?.destroy();
      events.forEach((e) => video.removeEventListener(e, stop));
      video.removeEventListener("seeking", seek);
      video.removeEventListener("pause", pause);
      video.removeEventListener("playing", start);
      video.removeEventListener("seeked", start);
      video.removeEventListener("ended", end);
      document.removeEventListener("visibilitychange", visibility);
      video.pause();
    };
  }, [source, orgId, itemId, lesson.url]);
  return (
    <div className="learning-playback">
      {source ? (
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          onError={() =>
            setError(
              "Playback unavailable. Reopen the video to refresh access.",
            )
          }
        />
      ) : null}
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          setSource(null);
          try {
            const url =
              lesson.url || (await mediaGateway.getPlayback(lesson.id)).url;
            const token = await rpc<string>("start_learning_playback", {
              p_org: orgId,
              p_item: itemId,
            });
            setSource({ url, token });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening…" : source ? "Reopen video" : "Open video"}
      </Button>
      <p className="muted">
        Only visible, active playback counts. Pauses, buffering and seeking do
        not count. Short videos must be watched in full. Click Mark as complete
        when eligible.
      </p>
      {error && <Notice>{error}</Notice>}
    </div>
  );
}
