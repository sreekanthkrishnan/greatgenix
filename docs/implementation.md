# Implementation and deployment notes

Updated 22 September 2026. The user approved the current interface, implementation with Supabase, the feature-based directory structure, and organization-controlled white labeling. This supersedes the earlier documents’ “prototype only / no implementation authorized” status for this work.

## Implemented scope

- Supabase email/password signup, sign-in, account recovery, session handling, and verified-email onboarding.
- Self-service organization creation, a unique organization handle, and membership-based organization switching.
- One active role per user per organization: student, teacher, or teacher-admin. Teacher-admin combines teaching and organization management. Optional platform administrators are assigned only out-of-band in SQL.
- Single-use, email-bound invitations with seven-day expiry, revocation, and optional course enrollment. The UI creates copyable invitation links; it does not send invitation messages automatically.
- Course creation, teaching assignment/reassignment, enrollment and unenrollment; live-class scheduling; recording draft/upload/review/publication/withdrawal; completion and content reporting.
- Optional assignments, learner submissions/revisions, grading and publication, and session attendance. These tools default off on new organizations.
- Organization profile and branding: PNG/JPEG/WebP logo, colors, local font stacks, base type size 14–20px, light/dark theme, and tagline. Logo uploads are validated and limited to 200 KB. Small logo data URLs are saved in the organization branding record; there is no public arbitrary-file bucket.
- Features can be changed by an organization teacher-admin or platform administrator. Attendance depends on live classes; disabling live classes also disables attendance. Disabled modules keep their data. Billing is not changed.
- Minimal platform organization status and feature administration, content reports for org administrators, and recent audit activity.

Self-service setup, multiple organization memberships, one role per membership, and link-based invitations are implementation choices to make this release functional. They do not define commercial subscriptions, customer licensing, or jurisdiction-specific policy.

## Security boundaries

All public education tables use RLS. The browser has read-only table privileges and explicitly granted RPC execution. Mutations execute in a single checked PostgreSQL transaction, validate the current caller against current membership, and write an audit event without copying answers or branding blobs to the audit log. Cross-organization foreign keys bind course records, enrollment, invitations, attendance and submissions to the same organization. Member revocation takes effect on the next database/media authorization request even for an existing Auth session. Client caches are scoped by user and organization and cleared on sign-out.

`private` is not exposed through the Supabase API. RLS helper functions and trusted RPCs pin their search paths. Platform administrator status is stored in a table that ordinary users cannot write, rather than user-editable Auth metadata. Removing the last organization administrator is rejected; a teacher’s courses must be reassigned before suspension/demotion to student.

Organization public branding is a narrow anonymous RPC returning only the organization name and branding. A guessed handle never grants access to courses or users. Anonymous callers cannot read membership or learning tables. Custom CSS, JavaScript, remote font URLs, SVGs and arbitrary external logo URLs are not accepted.

## Video integration

Daily and Mux are isolated behind browser adapters and server functions:

| Function                 | Behavior                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `video-upload-authorize` | Checks assigned-teacher/admin access and draft status; creates or reuses a direct Mux upload using signed playback policy.                                                         |
| `video-webhook`          | Validates HMAC over the raw request body with a five-minute tolerance; applies deduplicated processing updates transactionally. Unresolved mapping races request a provider retry. |
| `live-room-create`       | Checks teacher/admin session access and join window; creates/reuses a private deterministic Daily room.                                                                            |
| `live-token-issue`       | Checks enrollment/teaching scope, features, and join window; issues a room-bound token with owner status only for teachers/admins.                                                 |
| `playback-token-issue`   | Checks current enrollment/teaching scope and ready/published state; signs a short-lived Mux playback token.                                                                        |
| `feature-change-apply`   | Authenticates the caller and delegates to the same checked feature RPC used by the application.                                                                                    |

Auth functions use `verify_jwt=false` because the handlers explicitly validate the bearer token with Supabase `getUser`, supporting current signing keys. Every authenticated handler calls this check before privileged work. The webhook instead requires a verified Mux signature and is the only provider callback without a user session.

Provider credentials stay in Edge Function secrets. `media_upload_saved` and `media_webhook_apply` are granted only to `service_role`, never browser roles. Service callbacks cannot be invoked with a public project key.

Live rooms are available from 15 minutes before the stored UTC start through 30 minutes after the scheduled duration. Session dates/times are entered and displayed in the browser’s timezone; UTC instants are persisted. Teachers have Daily owner moderation controls. Recording is not automatically enabled for live sessions.

Previously issued provider tokens are capabilities: disabling a feature, suspending a member or withdrawing content prevents new issuance, but does not instantly revoke an already issued token. Mux tokens last five minutes; Daily tokens expire at the session’s end plus grace period. A requirement to forcibly eject someone immediately needs an additional Daily management operation. Do not represent these as instantaneous provider revocation.

## Hosting / connection

1. Use a dedicated Supabase project and apply the four ordered migration files with authenticated CLI `supabase db push`, or in order with the SQL editor. Do not put database/service secrets in chat or frontend environment variables.
2. Set the project URL and public publishable key in `.env.local` for development and the hosting build environment for deployed Vite assets. The public key does not authorize applying migrations or deploying functions.
3. Set the Supabase Auth Site URL and redirect allowlist to the frontend origin, including invitation and recovery redirects. Enable email confirmation, configure SMTP, and exercise confirmation/recovery on the deployed origin.
4. Configure `APP_ORIGINS`, `DAILY_API_KEY`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`, `MUX_SIGNING_KEY_ID`, and `MUX_SIGNING_PRIVATE_KEY` as Edge Function secrets. `MUX_SIGNING_PRIVATE_KEY` is the base64-encoded PEM supplied by Mux.
5. Deploy the functions. Configure a Mux webhook for `video.upload.asset_created`, `video.asset.ready` and `video.asset.errored` at `https://PROJECT.supabase.co/functions/v1/video-webhook`.
6. Build and serve `dist/` over HTTPS. Hash routes need no per-feature server routing. Signup/recovery redirects must reach the app root. Set a referrer policy of `no-referrer`, and do not log invitation query strings or signed playback URLs in analytics.
7. Create an organization and exercise the test workflow with confirmed test users. If needed, a trusted DB operator may insert a verified Auth user ID into `public.platform_admins`.

Separate client deployments can use their own Supabase projects and configured public values. Shared hosting uses tenant memberships and organization links. Automatic domain registration, DNS verification, per-domain tenant resolution, paid subscriptions, license sales, backup operations and notification delivery are not implemented by these screens.

## Validation and remaining pilot work

Automated validation includes TypeScript/Vite builds, actual migration execution and authorization tests in PGlite, webhook signature tests, preserved prototype tests, and browser flow tests with mocked Supabase transport. Browser screenshots are generated under ignored `artifacts/`.

PGlite reproduces PostgreSQL SQL/RLS but is not the full Supabase Auth/PostgREST/Edge stack. Before a pilot, verify hosted Auth email and recovery, two organizations through real REST requests, role changes and cache refresh, invitations across browser sessions, migration application, actual Mux upload/webhook/playback, Daily host/student calls, and configured origin handling. Test database backups/restoration and decide retention and billing policy separately. No live provider calls or hosted deployment are claimed until credentials and a project are configured.

Provider references used during implementation: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Edge authentication](https://supabase.com/docs/guides/functions/auth-legacy-jwt), [Mux direct uploads](https://www.mux.com/docs/guides/upload-files-directly), [Mux webhook validation](https://www.mux.com/docs/core/listen-for-webhooks), [Mux signed playback](https://www.mux.com/docs/guides/secure-video-playback), [Daily room-bound meeting tokens](https://docs.daily.co/reference/rest-api/meeting-tokens/create-meeting-token).
