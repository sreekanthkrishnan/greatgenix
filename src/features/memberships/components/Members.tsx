import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspace } from "../../../app/providers/OrgContextProvider";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Modal,
  Notice,
  SectionHeading,
} from "../../../shared/components";
import { createInvitation, listInvitations, revokeInvitation } from "../api";
export function InviteForm({
  close,
  courseId,
}: {
  close: () => void;
  courseId?: string;
}) {
  const { viewer, refresh } = useWorkspace();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Invite someone to grow with you" close={close}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            const token = await createInvitation(
              viewer.orgId,
              String(f.get("email")),
              String(f.get("name")),
              String(f.get("role")),
              courseId,
            );
            setLink(`${location.origin}/?invite=${token}`);
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {link ? (
          <>
            <Notice>
              Invitation created. Share this link with the intended recipient.
              It expires in 7 days and requires their verified email address.
            </Notice>
            <Field label="Invitation link">
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
            </Field>
            <Button
              type="button"
              onClick={() =>
                navigator.clipboard
                  .writeText(link)
                  .catch(() => setError("Select and copy the link above."))
              }
            >
              Copy invitation link
            </Button>
          </>
        ) : (
          <>
            <Field label="Name">
              <input name="name" required maxLength={100} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required />
            </Field>
            <Field label="Role">
              <select name="role" defaultValue="student">
                <option value="student">Student</option>
                {!courseId && (
                  <>
                    <option value="teacher">Teacher</option>
                    <option value="teacher-admin">
                      Teacher + organization admin
                    </option>
                  </>
                )}
              </select>
            </Field>
            <Notice>
              Create a link to share. No invitation email is sent automatically.
            </Notice>
            <Button disabled={busy}>
              {busy ? "Creating…" : "Create invitation link"}
            </Button>
          </>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
export function Members() {
  const { state, viewer, act, busy, notify } = useWorkspace();
  const [invite, setInvite] = useState(false);
  const invitations = useQuery({
    queryKey: ["invitations", viewer.orgId],
    queryFn: () => listInvitations(viewer.orgId),
  });
  return (
    <>
      <SectionHeading
        title="People in your organization"
        action={
          <Button variant="secondary" onClick={() => setInvite(true)}>
            Invite member
          </Button>
        }
      />
      <div className="panel">
        {state.members.map((m) => (
          <div className="roster-row" key={m.id}>
            <Avatar initials={m.initials} />
            <div>
              <strong>{m.name}</strong>
              <span>{m.email}</span>
            </div>
            <select
              aria-label={`Role for ${m.name}`}
              value={m.role}
              disabled={busy}
              onChange={(e) =>
                act({
                  type: "membership",
                  userId: m.id,
                  role: e.target.value as typeof m.role,
                  active: m.active !== false,
                })
              }
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="teacher-admin">Teacher + admin</option>
            </select>
            <Button
              disabled={busy}
              variant="ghost"
              onClick={() =>
                act({
                  type: "membership",
                  userId: m.id,
                  role: m.role,
                  active: m.active === false,
                })
              }
            >
              {m.active === false ? "Restore" : "Suspend"}
            </Button>
          </div>
        ))}
      </div>
      <section className="panel report-panel">
        <SectionHeading title="Invitations" />
        {invitations.error && <Notice>{invitations.error.message}</Notice>}
        {invitations.isPending && <p>Loading invitations…</p>}
        {invitations.data
          ?.filter((i) => !i.acceptedAt)
          .map((i) => (
            <div className="roster-row" key={i.id}>
              <div>
                <strong>{i.email}</strong>
                <span>
                  {i.role} · expires{" "}
                  {new Date(i.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <Badge>
                {i.revoked
                  ? "Revoked"
                  : new Date(i.expiresAt) < new Date()
                    ? "Expired"
                    : "Pending"}
              </Badge>
              {!i.revoked && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await revokeInvitation(i.id);
                      await invitations.refetch();
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        {invitations.data?.length === 0 && (
          <p className="muted">No invitations yet.</p>
        )}
      </section>
      {invite && (
        <InviteForm
          close={() => {
            setInvite(false);
            invitations.refetch();
          }}
        />
      )}
    </>
  );
}
