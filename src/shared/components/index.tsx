import { CoursePrice } from "./CoursePrice";
import {
  HeaderArtwork,
  headerIcons,
  type HeaderSection,
} from "./HeaderArtwork";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  LockKeyhole,
  X,
} from "lucide-react";
import type { Course } from "../types";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button {...props} className={`button ${variant} ${className}`}>
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "sage",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <BookOpen size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Unavailable({
  title = "This feature is resting for now",
  text = "This organization has not enabled this feature. Try another screen or ask your organization administrator.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="unavailable">
      <LockKeyhole size={30} />
      <h2>{title}</h2>
      <p>{text}</p>
      <a className="button secondary" href="#/dashboard">
        Back to overview
      </a>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  section = "courses",
  artwork,
  summary,
  summaryLabel = "Section summary",
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  section?: HeaderSection;
  artwork?: ReactNode;
  summary?: { value: ReactNode; label: string }[];
  summaryLabel?: string;
}) {
  const Icon = headerIcons[section];
  return (
    <header className="section-header">
      <div className="section-header-content">
        <span className="section-eyebrow">
          <Icon size={15} aria-hidden="true" />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
        {!!summary?.length && (
          <div className="section-summary" aria-label={summaryLabel}>
            {summary.map((item) => (
              <span key={item.label}>
                <strong>{item.value}</strong> {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="section-header-side">
        <div className="section-header-art" aria-hidden="true">
          {artwork ?? <HeaderArtwork section={section} />}
        </div>
        {action}
      </div>
    </header>
  );
}
export function SectionHeading({
  title,
  href,
  action,
}: {
  title: string;
  href?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {href ? (
        <a className="text-link" href={href}>
          View all <ArrowUpRight size={15} />
        </a>
      ) : (
        action
      )}
    </div>
  );
}
export function CourseArt({
  color,
  large = false,
}: {
  color: Course["color"];
  large?: boolean;
}) {
  return (
    <div
      className={`course-art ${color} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 300 150">
        <defs>
          <pattern
            id={`grid-${color}-${large}`}
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 22 0 L 0 0 0 22"
              fill="none"
              stroke="currentColor"
              opacity=".11"
            />
          </pattern>
        </defs>
        <rect width="300" height="150" fill={`url(#grid-${color}-${large})`} />
        {color === "sage" ? (
          <>
            <path d="M84 137V67a45 45 0 0 1 90 0v70z" fill="#54725b" />
            <path d="M107 137V72a22 22 0 0 1 44 0v65z" fill="#c6d9b1" />
            <circle cx="209" cy="47" r="25" fill="#e5bd71" />
            <path d="M180 122l35-59 35 59z" fill="#8ba683" />
            <path d="M54 43h24m-12-12v24" stroke="#54725b" strokeWidth="4" />
          </>
        ) : color === "peach" ? (
          <>
            <circle cx="150" cy="79" r="46" fill="#be745a" />
            <ellipse
              cx="150"
              cy="79"
              rx="85"
              ry="24"
              transform="rotate(-28 150 79)"
              fill="none"
              stroke="#f7ead8"
              strokeWidth="9"
            />
            <circle cx="225" cy="37" r="13" fill="#e7b761" />
            <path
              d="M58 102l7-15 7 15 15 7-15 7-7 15-7-15-15-7z"
              fill="#965a4e"
            />
            <circle cx="246" cy="122" r="4" fill="#965a4e" />
          </>
        ) : (
          <>
            <path d="M89 37q36-13 61 6v81q-30-19-61-6z" fill="#74628d" />
            <path d="M150 43q31-19 61-6v81q-32-6-61 6z" fill="#a797ba" />
            <path
              d="M101 54l33 2m-33 15l33 2m-33 15l33 2"
              stroke="#e9dfef"
              strokeWidth="3"
            />
            <path
              d="M230 25l5 11 11 5-11 5-5 11-5-11-11-5 11-5z"
              fill="#cda554"
            />
            <circle cx="65" cy="113" r="15" fill="#d8c290" />
          </>
        )}
      </svg>
    </div>
  );
}
export function CourseThumbnail({
  thumbnailUrl,
  color,
}: Pick<Course, "thumbnailUrl" | "color">) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className="course-thumbnail">
      {thumbnailUrl && thumbnailUrl !== failedUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(thumbnailUrl)}
        />
      ) : (
        <CourseArt color={color} />
      )}
    </div>
  );
}
export function CourseCard({
  course,
  detail,
  description,
}: {
  course: Course;
  detail: string;
  description?: string;
}) {
  return (
    <a className="course-card" href={`#/courses/${course.id}`}>
      <CourseThumbnail
        thumbnailUrl={course.thumbnailUrl}
        color={course.color}
      />
      <div className="course-card-body">
        <div className="course-meta">
          <span>{course.subject}</span>
          <span>{course.grade}</span>
        </div>
        <h3>{course.title}</h3>
        <p>{course.batch}</p>
        {description && <p className="course-description">{description}</p>}
        <Badge tone={course.visibility === "public" ? "sage" : "peach"}>
          {course.visibility === "public"
            ? course.pricing === "paid"
              ? "Public · Paid"
              : "Public · Free"
            : "Private"}
        </Badge>
        {(course.pricing === "paid" || course.visibility === "public") && (
          <CoursePrice course={course} />
        )}
        <div className="course-foot">
          <span>{detail}</span>
          <span className="circle-arrow">
            <ChevronRight size={17} />
          </span>
        </div>
      </div>
    </a>
  );
}
export function Modal({
  title,
  description,
  children,
  close,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={close}>
      <div className="modal-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <LockKeyhole size={16} />
      <span>{children}</span>
    </div>
  );
}
export function Avatar({
  initials,
  small = false,
}: {
  initials: string;
  small?: boolean;
}) {
  return <span className={`avatar ${small ? "small" : ""}`}>{initials}</span>;
}
export function CheckLabel({ children }: { children: ReactNode }) {
  return (
    <span className="check-label">
      <Check size={14} />
      {children}
    </span>
  );
}
export function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
export function timeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
