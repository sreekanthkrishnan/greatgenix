import { useState } from "react";
import { Button, Field, Notice } from "../../../shared/components";
import { signOut } from "../../auth/api";
import { acceptInvitation } from "../../memberships/api";
import { createOrganization } from "../api";
export function Onboarding({ refresh }: { refresh: () => Promise<void> }) {
  const token = new URLSearchParams(location.search).get("invite");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (token) {
        await acceptInvitation(token);
        history.replaceState(null, "", location.pathname);
      } else
        await createOrganization(String(f.get("name")), String(f.get("slug")));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="onboarding">
      <section className="auth-card">
        <span className="eyebrow">ROOM TO GROW</span>
        <h1>
          {token ? "Your classroom is waiting." : "Make this space your own."}
        </h1>
        <p>
          {token
            ? "Accept this invitation with the email address your administrator invited."
            : "Create your organization, then invite your teachers and learners."}
        </p>
        <form className="form" onSubmit={submit}>
          {!token && (
            <>
              <Field label="Organization name">
                <input name="name" required maxLength={80} />
              </Field>
              <Field
                label="Organization handle"
                hint="Lowercase letters, numbers and hyphens. Used in your shared organization link."
              >
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={48}
                />
              </Field>
            </>
          )}
          {error && <Notice>{error}</Notice>}
          <Button disabled={busy}>
            {busy
              ? "Please wait…"
              : token
                ? "Accept invitation"
                : "Create organization"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => signOut().catch((e) => setError(e.message))}
          >
            Sign out
          </Button>
        </form>
      </section>
    </main>
  );
}
