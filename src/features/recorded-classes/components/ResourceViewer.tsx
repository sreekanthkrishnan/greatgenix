import { ArrowUpRight, ExternalLink, FileText, Play, Volume2 } from "lucide-react";
import type { Lesson } from "../../../shared/types";

function getYouTubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const regExp = /(?:vimeo\.com\/)(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/;
  const match = url.match(regExp);
  return match && match[3] ? `https://player.vimeo.com/video/${match[3]}` : null;
}

export function ResourceViewer({ lesson }: { lesson: Lesson }) {
  const type = lesson.type || "video";
  const url = lesson.url || "";

  if (type === "notes") {
    return (
      <div className="panel" style={{ padding: "24px", lineHeight: "1.8", fontSize: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "var(--green)" }}>
          <FileText size={20} />
          <strong style={{ fontSize: "1.1rem" }}>Lesson Notes</strong>
        </div>
        <div style={{ whiteSpace: "pre-wrap" }}>
          {lesson.content || "No notes content provided."}
        </div>
      </div>
    );
  }

  if (type === "link") {
    return (
      <div className="panel" style={{ padding: "32px", textAlign: "center" }}>
        <ExternalLink size={40} style={{ color: "var(--green)", marginBottom: "16px" }} />
        <h3 style={{ marginBottom: "8px" }}>External Learning Resource</h3>
        <p className="muted" style={{ marginBottom: "20px" }}>
          This lesson links to an external web resource.
        </p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="button"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            Open Resource <ArrowUpRight size={16} />
          </a>
        ) : (
          <p className="muted">No URL provided for this link lesson.</p>
        )}
      </div>
    );
  }

  if (type === "document") {
    const isPdf = url.toLowerCase().includes(".pdf");
    return (
      <div className="media-player-container">
        {url && isPdf ? (
          <iframe
            src={url}
            title={lesson.title}
            style={{ width: "100%", height: "540px", border: "0", borderRadius: "10px" }}
          />
        ) : (
          <div className="panel" style={{ padding: "32px", textAlign: "center" }}>
            <FileText size={40} style={{ color: "var(--green)", marginBottom: "16px" }} />
            <h3 style={{ marginBottom: "8px" }}>Lesson Document</h3>
            <p className="muted" style={{ marginBottom: "20px" }}>
              View or download the course document below.
            </p>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="button"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                Open Document <ArrowUpRight size={16} />
              </a>
            ) : (
              <p className="muted">No document URL available.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="panel" style={{ padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <Volume2 size={24} style={{ color: "var(--green)" }} />
          <div>
            <strong style={{ fontSize: "1.1rem" }}>Audio Lesson</strong>
            <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
              {lesson.duration} minutes audio recording
            </span>
          </div>
        </div>
        {url ? (
          <div>
            <audio controls src={url} style={{ width: "100%", marginBottom: "12px" }}>
              Your browser does not support the audio element.
            </audio>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
              style={{ fontSize: "0.85rem" }}
            >
              Direct Audio Link <ArrowUpRight size={14} />
            </a>
          </div>
        ) : (
          <p className="muted">No audio URL provided.</p>
        )}
      </div>
    );
  }

  // Default type: "video"
  const ytEmbed = url ? getYouTubeEmbedUrl(url) : null;
  const vimeoEmbed = url ? getVimeoEmbedUrl(url) : null;

  if (ytEmbed) {
    return (
      <div className="media-player" style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "10px" }}>
        <iframe
          src={ytEmbed}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
    );
  }

  if (vimeoEmbed) {
    return (
      <div className="media-player" style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "10px" }}>
        <iframe
          src={vimeoEmbed}
          title={lesson.title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
    );
  }

  return (
    <div className="media-player">
      {url ? (
        <video
          controls
          playsInline
          src={url}
          style={{ width: "100%", borderRadius: "10px" }}
        />
      ) : (
        <div className="empty" style={{ padding: "40px", textAlign: "center" }}>
          <Play size={36} style={{ color: "var(--green)", marginBottom: "12px" }} />
          <h3>Video Lesson</h3>
          <p className="muted">No video link has been attached to this lesson yet.</p>
        </div>
      )}
    </div>
  );
}
