import { Palette, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import { Button, Field, Notice } from "../../../shared/components";
import {
  applyBranding,
  defaultBranding,
  validateLogo,
} from "../../../shared/utils/branding";
export function BrandingSettings() {
  const { state, viewer, act, busy } = useWorkspace();
  const org = state.orgs.find((o) => o.id === viewer.orgId)!;
  const saved = org.branding || defaultBranding;
  const [draft, setDraft] = useState(saved);
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(saved);
  }, [saved]);
  useEffect(() => {
    applyBranding(draft);
    return () => applyBranding(saved);
  }, [draft, saved]);
  return (
    <section className="panel branding-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">WHITE LABEL</span>
          <h2>Your identity, throughout the classroom.</h2>
        </div>
        <Palette size={24} />
      </div>
      <p className="muted">
        Preview changes instantly. Save to apply them for everyone in your
        organization.
      </p>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (
            !(await act(
              { type: "branding", branding: draft },
              "Organization appearance saved.",
            ))
          )
            setError(
              "Appearance was not saved. Your preview remains available to retry.",
            );
        }}
      >
        <div className="brand-logo-editor">
          {draft.logoUrl ? (
            <img src={draft.logoUrl} alt="Organization logo preview" />
          ) : (
            <span className="org-symbol">{org.name[0]}</span>
          )}
          <Field
            label="Organization logo"
            hint="PNG, JPEG or WebP, up to 200 KB. Stored with your organization."
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    setError("");
                    const logoUrl = await validateLogo(file);
                    setDraft((d) => ({ ...d, logoUrl }));
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }
              }}
            />
          </Field>
          {draft.logoUrl && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft({ ...draft, logoUrl: "" })}
            >
              Remove
            </Button>
          )}
        </div>
        <div className="form-row">
          <Field label="Primary color">
            <input
              type="color"
              value={draft.primaryColor}
              onChange={(e) =>
                setDraft({ ...draft, primaryColor: e.target.value })
              }
            />
          </Field>
          <Field label="Accent color">
            <input
              type="color"
              value={draft.accentColor}
              onChange={(e) =>
                setDraft({ ...draft, accentColor: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Font family">
            <select
              value={draft.fontFamily}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  fontFamily: e.target.value as typeof draft.fontFamily,
                })
              }
            >
              <option value="humanist">Humanist · Avenir / Segoe</option>
              <option value="system">Modern · System sans</option>
              <option value="serif">Editorial · Georgia</option>
            </select>
          </Field>
          <Field label="Base font size">
            <select
              value={draft.fontSize}
              onChange={(e) =>
                setDraft({ ...draft, fontSize: Number(e.target.value) })
              }
            >
              {[14, 15, 16, 17, 18, 19, 20].map((n) => (
                <option key={n} value={n}>
                  {n}px {n === 16 ? "· Default" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Theme">
            <select
              value={draft.theme}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: e.target.value as "light" | "dark",
                })
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
        </div>
        <Field label="Tagline">
          <input
            value={draft.tagline}
            maxLength={100}
            onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
          />
        </Field>
        {error && <Notice>{error}</Notice>}
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDraft(saved)}
          >
            Discard preview
          </Button>
          <Button disabled={busy} type="submit">
            <Upload size={16} />
            {busy ? "Saving…" : "Save appearance"}
          </Button>
        </div>
      </form>
    </section>
  );
}
