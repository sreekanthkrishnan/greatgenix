import { useEffect, useState } from "react";
import { ArrowUpRight, Download, ExternalLink, FileText, Play, Volume2 } from "lucide-react";
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

function dataURLtoBlob(dataurl: string): Blob | null {
  try {
    const arr = dataurl.split(",");
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return null;
  }
}

function DocumentViewer({ url, title, fileName }: { url: string; title: string; fileName: string }) {
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    if (url.startsWith("data:")) {
      const blob = dataURLtoBlob(url);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      }
    }
    setBlobUrl(url);
  }, [url]);

  const activeUrl = blobUrl || url;

  // Google Drive URL converter (/view -> /preview)
  let embedUrl = activeUrl;
  if (activeUrl.includes("drive.google.com/file/d/")) {
    embedUrl = activeUrl.replace(/\/view(\?.*)?$/, "/preview");
  }

  const isPdf = activeUrl.toLowerCase().includes(".pdf") || url.startsWith("data:application/pdf");
  const isImage = url.startsWith("data:image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(url);

  function handleOpenInNewTab() {
    if (activeUrl) {
      window.open(activeUrl, "_blank", "noopener,noreferrer");
    }
  }

  function handleDownload() {
    if (!activeUrl) return;
    const a = document.createElement("a");
    a.href = activeUrl;
    a.download = fileName || "Document";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="media-player-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "1rem" }}>{fileName}</span>
        <div style={{ display: "flex", gap: "10px" }}>
          {activeUrl && (
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="button button-secondary"
              style={{ padding: "6px 14px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              Open in New Tab <ArrowUpRight size={14} />
            </button>
          )}
          {activeUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="button"
              style={{ padding: "6px 14px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              Download <Download size={14} />
            </button>
          )}
        </div>
      </div>

      {activeUrl && (isPdf || embedUrl.includes("drive.google.com")) ? (
        <iframe
          src={embedUrl}
          title={title}
          style={{ width: "100%", height: "560px", border: "0", borderRadius: "10px", backgroundColor: "#fff" }}
        />
      ) : activeUrl && isImage ? (
        <div className="panel" style={{ padding: "20px", textAlign: "center", backgroundColor: "var(--surface-subtle, #f9fafb)" }}>
          <img src={activeUrl} alt={title} style={{ maxWidth: "100%", maxHeight: "550px", borderRadius: "8px", objectFit: "contain" }} />
        </div>
      ) : (
        <div className="panel" style={{ padding: "40px 24px", textAlign: "center" }}>
          <FileText size={48} style={{ color: "var(--green, #10b981)", marginBottom: "16px" }} />
          <h3 style={{ marginBottom: "8px" }}>{fileName}</h3>
          <p className="muted" style={{ marginBottom: "24px" }}>
            Click below to open or download the course document.
          </p>
          {activeUrl ? (
            <div style={{ display: "inline-flex", gap: "12px" }}>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="button"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                View Document <ArrowUpRight size={16} />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="button button-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                Download File <Download size={16} />
              </button>
            </div>
          ) : (
            <p className="muted">No document file available.</p>
          )}
        </div>
      )}
    </div>
  );
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
    return (
      <DocumentViewer
        url={url}
        title={lesson.title}
        fileName={lesson.fileName || "Course Document"}
      />
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
