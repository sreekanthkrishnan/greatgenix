import type { LessonType } from "../../../shared/types";

/** Local vector illustrations stay crisp at every card size. */
export function LessonArtwork({ type }: { type: LessonType }) {
  return (
    <svg
      className="lesson-artwork"
      viewBox="0 0 320 170"
      fill="none"
      aria-hidden="true"
    >
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
      {type === "video" && (
        <>
          <rect
            x="86"
            y="43"
            width="151"
            height="96"
            rx="13"
            fill="currentColor"
            opacity=".15"
            transform="rotate(-7 86 43)"
          />
          <rect
            x="81"
            y="34"
            width="158"
            height="104"
            rx="12"
            fill="#fffdf7"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect
            x="90"
            y="43"
            width="140"
            height="76"
            rx="6"
            fill="currentColor"
            opacity=".16"
          />
          <path
            d="m90 107 31-30 28 24 31-39 50 45v12H90z"
            fill="currentColor"
            opacity=".15"
          />
          <circle cx="160" cy="81" r="24" fill="currentColor" />
          <path d="m155 70 16 11-16 11z" fill="#fffdf7" />
          <path
            d="M96 129h111"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity=".25"
          />
          <path
            d="M96 129h44"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="140" cy="129" r="4" fill="currentColor" />
          <path
            d="m220 125 5 4-5 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {type === "audio" && (
        <>
          <path
            d="M115 102V76a45 45 0 0 1 90 0v26"
            stroke="currentColor"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            d="M115 79v21m90-21v21"
            stroke="#fffdf7"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".5"
          />
          <rect
            x="101"
            y="85"
            width="27"
            height="43"
            rx="12"
            fill="#fffdf7"
            stroke="currentColor"
            strokeWidth="3"
          />
          <rect
            x="192"
            y="85"
            width="27"
            height="43"
            rx="12"
            fill="#fffdf7"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M141 87v20m10-34v48m10-59v70m10-53v36m10-24v12"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            opacity=".55"
          />
          <path
            d="M244 65V45l15-4v19"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <ellipse cx="240" cy="66" rx="5" ry="4" fill="currentColor" />
          <ellipse cx="255" cy="61" rx="5" ry="4" fill="currentColor" />
        </>
      )}
      {type === "document" && (
        <>
          <rect
            x="105"
            y="33"
            width="103"
            height="116"
            rx="7"
            fill="currentColor"
            opacity=".2"
            transform="rotate(-9 105 33)"
          />
          <path
            d="M120 25h64l27 27v84a7 7 0 0 1-7 7h-84a7 7 0 0 1-7-7V32a7 7 0 0 1 7-7Z"
            fill="#fffdf7"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M183 25v28h28"
            fill="currentColor"
            fillOpacity=".12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M129 70h63M129 80h45M129 121h63"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity=".25"
          />
          <rect
            x="129"
            y="101"
            width="12"
            height="11"
            rx="2"
            fill="currentColor"
            opacity=".35"
          />
          <rect
            x="149"
            y="91"
            width="12"
            height="21"
            rx="2"
            fill="currentColor"
            opacity=".6"
          />
          <rect
            x="169"
            y="85"
            width="12"
            height="27"
            rx="2"
            fill="currentColor"
          />
          <circle cx="222" cy="115" r="20" fill="currentColor" />
          <path
            d="m213 115 6 6 12-13"
            stroke="#fffdf7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {type === "link" && (
        <>
          <rect
            x="78"
            y="36"
            width="164"
            height="105"
            rx="10"
            fill="currentColor"
            opacity=".15"
            transform="rotate(5 78 36)"
          />
          <rect
            x="78"
            y="30"
            width="164"
            height="108"
            rx="10"
            fill="#fffdf7"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M78 54h164"
            stroke="currentColor"
            strokeWidth="2"
            opacity=".25"
          />
          <circle cx="91" cy="42" r="3" fill="currentColor" />
          <circle cx="102" cy="42" r="3" fill="currentColor" opacity=".5" />
          <circle cx="113" cy="42" r="3" fill="currentColor" opacity=".25" />
          <rect
            x="130"
            y="38"
            width="92"
            height="8"
            rx="4"
            fill="currentColor"
            opacity=".08"
          />
          <g stroke="currentColor" strokeWidth="7" strokeLinecap="round">
            <path d="m153 101-9 9a16 16 0 0 1-23-23l17-17a16 16 0 0 1 23 0" />
            <path d="m167 83 9-9a16 16 0 0 1 23 23l-17 17a16 16 0 0 1-23 0" />
            <path d="m146 97 27-20" />
          </g>
          <path
            d="m222 109 7 32 7-11 12-3z"
            fill="currentColor"
            stroke="#fffdf7"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </>
      )}
      {type === "notes" && (
        <>
          <rect
            x="99"
            y="35"
            width="115"
            height="111"
            rx="7"
            fill="currentColor"
            opacity=".15"
            transform="rotate(-7 99 35)"
          />
          <rect
            x="103"
            y="26"
            width="114"
            height="117"
            rx="7"
            fill="#fffdf7"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M125 26v117"
            stroke="currentColor"
            strokeWidth="2"
            opacity=".25"
          />
          {[45, 65, 85, 105, 125].map((y) => (
            <path
              key={y}
              d={`M98 ${y}h12`}
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
          <path
            d="M137 54h60M137 70h48M137 86h59M137 102h34M137 118h43"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity=".3"
          />
          <g transform="rotate(27 210 92)">
            <path
              d="M204 46h13v77l-6.5 15-6.5-15z"
              fill="#deb36d"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M204 60h13M204 122h13"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="m208 131 3 7 3-7z" fill="currentColor" />
          </g>
        </>
      )}
    </svg>
  );
}
