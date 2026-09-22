import {
  UserRound,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  Building2,
  Settings2,
  UsersRound,
} from "lucide-react";

export const headerIcons = {
  profile: UserRound,
  overview: ChartNoAxesCombined,
  courses: BookOpen,
  schedule: CalendarDays,
  assessments: ClipboardCheck,
  attendance: UsersRound,
  settings: Settings2,
  organizations: Building2,
};
export type HeaderSection = keyof typeof headerIcons;

export function HeaderArtwork({ section }: { section: HeaderSection }) {
  const Icon = headerIcons[section];
  return (
    <svg viewBox="0 0 320 170" fill="none" aria-hidden="true">
      <circle cx="160" cy="84" r="68" fill="currentColor" opacity=".06" />
      <circle cx="54" cy="43" r="7" fill="currentColor" opacity=".18" />
      <circle cx="266" cy="119" r="12" fill="currentColor" opacity=".12" />
      <path
        d="M258 35v14m-7-7h14M59 118v10m-5-5h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".5"
      />
      <ellipse
        cx="163"
        cy="146"
        rx="74"
        ry="7"
        fill="currentColor"
        opacity=".08"
      />
      <rect
        x="103"
        y="31"
        width="117"
        height="112"
        rx="10"
        fill="currentColor"
        opacity=".16"
        transform="rotate(-8 103 31)"
      />
      <rect
        x="104"
        y="24"
        width="112"
        height="118"
        rx="10"
        fill="var(--paper)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M120 38h18"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".3"
      />
      <circle cx="200" cy="38" r="3" fill="currentColor" opacity=".4" />
      <Icon x={132} y={51} width={56} height={56} strokeWidth={1.4} />
      <path
        d="M128 120h64M142 129h36"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".22"
      />
      <path d="m233 84 5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#deb36d" />
    </svg>
  );
}
