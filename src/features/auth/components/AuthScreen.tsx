import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { Button, Field, Notice } from "../../../shared/components";
import { isConfigured, rpc } from "../../../shared/lib/supabase";
import type { Branding } from "../../../shared/types";
import { applyBranding, defaultBranding } from "../../../shared/utils/branding";
import { recover, signIn, signUp, updatePassword } from "../api";
export function AuthScreen() {
  const slug = new URLSearchParams(location.search).get("org");
  const brand = useQuery({
    queryKey: ["public-brand", slug],
    queryFn: () =>
      rpc<{ name: string; branding: Branding } | null>("organization_brand", {
        p_slug: slug,
      }),
    enabled: Boolean(slug && isConfigured),
  });
  useEffect(() => {
    if (brand.data) {
      applyBranding(brand.data.branding);
      document.title = brand.data.name;
    }
    return () => {
      applyBranding(defaultBranding);
      document.title = "Learning workspace";
    };
  }, [brand.data]);
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "recover">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "");
    const password = String(f.get("password") || "");
    try {
      if (auth.recovery && auth.session) {
        await updatePassword(password);
        auth.finishRecovery();
      } else if (mode === "signin") await signIn(email, password);
      else if (mode === "signup") {
        if (!(await signUp(email, password, String(f.get("name")))))
          setMessage("Check your email to confirm your account, then sign in.");
      } else {
        await recover(email);
        setMessage("If an account exists, a recovery link has been sent.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const changingPassword = auth.recovery && Boolean(auth.session);
  return (
    <main className="auth-shell">
      <section className="auth-story">
        {brand.data?.branding.logoUrl ? (
          <img
            className="brand-image"
            src={brand.data.branding.logoUrl}
            alt={`${brand.data.name} logo`}
          />
        ) : (
          <GraduationCap size={44} />
        )}
        <span className="eyebrow">
          {brand.data?.name || "YOUR LEARNING SPACE"}
        </span>
        <h1>
          A little curiosity.
          <br />A world of possibility.
        </h1>
        <p>
          A home for your teachers, your learners,
          <br />
          and everything they’ll discover together.
        </p>
        <div className="auth-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="auth-card">
        <h2>
          {changingPassword
            ? "Choose a new password"
            : mode === "signup"
              ? "Start your learning journey"
              : mode === "recover"
                ? "Find your way back"
                : "Welcome back."}
        </h2>
        <p className="muted">
          {mode === "signup"
            ? "Create an account to accept an invitation or set up your organization."
            : "Sign in to your organization’s learning space."}
        </p>
        {!isConfigured ? (
          <>
            <Notice>
              The application is ready for a Supabase connection. Set
              VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local,
              then restart the development server.
            </Notice>
            <a className="button secondary" href="?demo=1">
              Explore the approved UI demo
            </a>
          </>
        ) : (
          <form className="form" onSubmit={submit}>
            {mode === "signup" && !changingPassword && (
              <Field label="Your name">
                <input
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </Field>
            )}
            {!changingPassword && (
              <Field label="Email address">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </Field>
            )}
            {(mode !== "recover" || changingPassword) && (
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                />
              </Field>
            )}
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            {message && <Notice>{message}</Notice>}
            <Button disabled={busy} type="submit">
              {busy
                ? "Please wait…"
                : changingPassword
                  ? "Save password"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send recovery link"}
            </Button>
            {!changingPassword && (
              <div className="auth-links">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signup" ? "signin" : "signup");
                    setError("");
                    setMessage("");
                  }}
                >
                  {mode === "signup"
                    ? "Already have an account? Sign in"
                    : "Create an account"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "recover" ? "signin" : "recover");
                    setError("");
                    setMessage("");
                  }}
                >
                  {mode === "recover" ? "Back to sign in" : "Forgot password?"}
                </button>
              </div>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
