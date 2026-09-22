import type Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Notice } from "../../../shared/components";
import { mediaGateway } from "../../../shared/lib/video-adapters";
export function VideoPlayer({ lessonId }: { lessonId: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState("");
  const position = useRef({ time: 0, playing: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video || !url) return;
    const restore = () => {
      if (position.current.time) video.currentTime = position.current.time;
      if (position.current.playing) void video.play().catch(() => {});
    };
    video.addEventListener("loadedmetadata", restore);
    let hls: Hls | undefined;
    let alive = true;
    if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = url;
    else
      import("hls.js")
        .then(({ default: Hls }) => {
          if (!alive) return;
          if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal)
                setError(
                  "Playback interrupted. Reopen the video to refresh access.",
                );
            });
          } else setError("This browser does not support streaming video.");
        })
        .catch(() => setError("Could not load the player. Please retry."));
    return () => {
      alive = false;
      position.current = { time: video.currentTime, playing: !video.paused };
      video.removeEventListener("loadedmetadata", restore);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const timer = setInterval(async () => {
      try {
        const next = await mediaGateway.getPlayback(lessonId);
        if (alive) setUrl(next.url);
      } catch (e) {
        if (alive) {
          setUrl("");
          setError((e as Error).message);
        }
      }
    }, 240000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [lessonId, url]);
  return (
    <>
      <div className="media-player">
        {url ? (
          <video
            ref={ref}
            controls
            playsInline
            preload="metadata"
            onError={() =>
              setError("Playback could not start. Please refresh access.")
            }
          />
        ) : (
          <div className="empty">
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  setUrl((await mediaGateway.getPlayback(lessonId)).url);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Opening…" : "Play lesson"}
            </Button>
          </div>
        )}
      </div>
      {error && (
        <Notice>
          {error}
          <Button
            variant="ghost"
            onClick={() => {
              setUrl("");
              setError("");
            }}
          >
            Refresh access
          </Button>
        </Notice>
      )}
    </>
  );
}
export function VideoUpload({
  lessonId,
  status,
}: {
  lessonId: string;
  status?: string;
}) {
  const { refresh } = useWorkspace();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useRef<XMLHttpRequest | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function upload(file: File) {
    if (!file.type.startsWith("video/") || file.size > 2 * 1024 ** 3) {
      setError("Choose a video file under 2 GB.");
      return;
    }
    setError("");
    setMessage("");
    setProgress(0);
    try {
      const { uploadUrl } = await mediaGateway.authorizeUpload(lessonId);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        request.current = xhr;
        xhr.open("PUT", uploadUrl);
        xhr.timeout = 30 * 60 * 1000;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onerror = () =>
          reject(new Error("Upload failed. Check your connection and retry."));
        xhr.ontimeout = () =>
          reject(
            new Error(
              "Upload timed out. Retry when your connection is stable.",
            ),
          );
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("The upload was rejected. Please retry."));
        xhr.send(file);
      });
      setMessage(
        "Uploaded. Video processing may take a few minutes; status refreshes automatically.",
      );
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
      request.current = null;
    }
  }
  return (
    <div className="upload-panel">
      <strong>Video · {status || "empty"}</strong>
      <p className="muted">
        Upload a video before submitting this draft for review.
      </p>
      <label className="field">
        <span>Video file (up to 2 GB)</span>
        <input
          type="file"
          accept="video/*"
          disabled={progress !== null || status === "ready"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </label>
      {progress !== null && (
        <>
          <progress max={100} value={progress} />
          <p role="status">{progress}% uploaded</p>
          <Button variant="ghost" onClick={() => request.current?.abort()}>
            Cancel upload
          </Button>
        </>
      )}
      {error && <Notice>{error}</Notice>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
