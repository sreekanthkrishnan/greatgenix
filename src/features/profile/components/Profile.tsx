import { useState } from "react";
import { Pencil, UserRound, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Avatar,
  Badge,
  Button,
  Field,
  PageHeading,
} from "../../../shared/components";
import {
  initialsFor,
  profileText,
  roleContent,
} from "../../../shared/utils/roleContent";
import { updateProfile } from "../../auth/api";

export function Profile() {
  const { session } = useAuth();
  const { state, viewer, refresh, notify } = useWorkspace();
  const member = state.members.find((m) => m.id === viewer.userId);
  const metadata = session?.user.user_metadata || {};
  const saved = {
    name: profileText(metadata.name) || member?.name || "",
    headline: profileText(metadata.headline),
    bio: profileText(metadata.bio),
  };
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const copy = roleContent[viewer.role];
  const org = state.orgs.find((o) => o.id === viewer.orgId);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (!draft.name.trim()) {
      setError("Enter your display name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateProfile(draft);
      setEditing(false);
      notify("Profile updated.");
      // The Auth save has succeeded even if refreshing roster data fails.
      try {
        await refresh();
      } catch {
        notify("Profile saved. Reload to refresh organization details.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        section="profile"
        eyebrow={copy.workspace.toUpperCase()}
        title="My profile"
        description={copy.profileDescription}
        action={
          !editing && (
            <Button
              onClick={() => {
                setDraft(saved);
                setError("");
                setEditing(true);
              }}
            >
              <Pencil size={16} />
              Edit profile
            </Button>
          )
        }
      />
      <div className="profile-layout">
        <aside className="panel profile-summary">
          <Avatar initials={initialsFor(saved.name) || "?"} />
          <h2>{saved.name || "Your profile"}</h2>
          {saved.headline && <p>{saved.headline}</p>}
          <Badge>{copy.label}</Badge>
          <div className="profile-account-detail">
            <Mail size={17} />
            <span>{session?.user.email || member?.email}</span>
          </div>
          <div className="profile-account-detail">
            <ShieldCheck size={17} />
            <span>
              {viewer.role === "super-admin" ? "Platform workspace" : org?.name}
            </span>
          </div>
        </aside>
        <section className="panel profile-details">
          <h2>
            <UserRound size={20} />
            Profile details
          </h2>
          {editing ? (
            <form className="form" onSubmit={save}>
              <fieldset disabled={saving} className="profile-fields">
                <Field label="Display name">
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Headline">
                  <input
                    maxLength={120}
                    placeholder={
                      viewer.role === "student"
                        ? "What you’re interested in learning"
                        : "Your subject or area of expertise"
                    }
                    value={draft.headline}
                    onChange={(e) =>
                      setDraft({ ...draft, headline: e.target.value })
                    }
                  />
                </Field>
                <Field label="About me">
                  <textarea
                    rows={5}
                    maxLength={1000}
                    value={draft.bio}
                    onChange={(e) =>
                      setDraft({ ...draft, bio: e.target.value })
                    }
                  />
                </Field>
                <p className="muted profile-help">
                  Your profile applies across your organizations. Your account
                  email and assigned roles stay managed separately.
                </p>
                <div className="form-actions">
                  <Button type="submit">
                    {saving ? "Saving…" : "Save profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditing(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </fieldset>
            </form>
          ) : (
            <dl className="profile-info">
              <div>
                <dt>Display name</dt>
                <dd>{saved.name || "Not added"}</dd>
              </div>
              <div>
                <dt>Headline</dt>
                <dd>
                  {saved.headline ||
                    "Add a short introduction to your profile."}
                </dd>
              </div>
              <div>
                <dt>About me</dt>
                <dd>{saved.bio || "Tell us a little about yourself."}</dd>
              </div>
            </dl>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
