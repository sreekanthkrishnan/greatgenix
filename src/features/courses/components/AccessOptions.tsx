import { useId } from "react";
import { Check, Globe2, LockKeyhole, Ticket } from "lucide-react";
export type AccessKind = "private" | "free" | "paid";
const options = [
  {
    value: "private",
    title: "Private",
    subtitle: "By invitation",
    description: "Only students you add or invite can join.",
    icon: LockKeyhole,
  },
  {
    value: "free",
    title: "Public · Free",
    subtitle: "Open learning",
    description: "Everyone in your organization can learn for free.",
    icon: Globe2,
  },
  {
    value: "paid",
    title: "Public · Paid",
    subtitle: "Preview, then purchase",
    description: "Offer free previews and unlock access after payment.",
    icon: Ticket,
  },
] as const;
export function AccessOptions({
  value,
  onChange,
  disabled = false,
}: {
  value: AccessKind;
  onChange: (value: AccessKind) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="access-options" disabled={disabled}>
      <legend>Course access</legend>
      <p className="access-intro">
        Choose who can join and how they access your lessons.
      </p>
      <div className="access-option-grid">
        {options.map(
          ({ value: kind, title, subtitle, description, icon: Icon }) => (
            <label
              key={kind}
              className={`access-option ${value === kind ? "selected" : ""}`}
            >
              <input
                type="radio"
                name={name}
                value={kind}
                checked={value === kind}
                onChange={() => onChange(kind)}
                aria-label={title}
              />
              <span className="access-option-top">
                <span className="access-icon">
                  <Icon size={20} />
                </span>
                <span className="access-check">
                  {value === kind && <Check size={13} />}
                </span>
              </span>
              <strong>{title}</strong>
              <span className="access-subtitle">{subtitle}</span>
              <span className="access-description">{description}</span>
            </label>
          ),
        )}
      </div>
    </fieldset>
  );
}
