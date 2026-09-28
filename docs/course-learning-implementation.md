# Course management and sequential learning

Implemented in the existing Courses feature. This repository has no Goals feature or Goals table. The existing React, React Query, Supabase authentication, organization boundaries, teacher ownership, and teacher-admin permissions are retained.

## Confirmed behavior

The user confirmed: extend Courses; explicitly opt existing courses into sequencing; keep offline payments; add separate student subscriptions; preserve progress and purchased access on subscription expiry; teachers record practice/workshop participation; count only visible active video playback, exclude pauses and seeks, and require full playback for short videos.

### Courses and migration

Teachers create courses using the existing course form, publish lessons/notes/documents and create assessments using existing tools, then configure the learning path under **Edit course → Modules and sequential learning**. Modules and their items can be reordered, and items can move between modules. All six types are supported. Notes/documents/videos reuse published lessons; assessments reuse assignments; workshops optionally reuse scheduled sessions and attendance; practices and workshop instructions live in the path.

The additive migration `supabase/migrations/202609260001_sequential_learning.sql` leaves existing courses in legacy library mode. Saving a draft path does not change access. Explicit activation imports historical lesson completions and submitted assessments for the linked resources, preserving earned progress without fabricating playback evidence. Existing direct enrollments remain direct access. No legacy content is deleted or assigned an inferred order. Once activated, sequencing cannot be toggled off through the UI/API.

Every module must contain at least one item. Activation makes unlisted lessons, assessments, and sessions inaccessible to students; the teacher editor states this consequence. Items with student progress cannot be removed or changed to a different resource. Teachers can correct verified video duration; incomplete eligibility is re-evaluated, while completed items remain complete. Reordering preserves completed-item review and recomputes the next incomplete available item using the new order. Active path dependencies cannot be unpublished or deleted while referenced. Remove unused dependencies from the path first; completed items remain preserved.

### Discovery, enrollment, and payments

Public discovery remains scoped to active students in the same organization. Private courses require direct assignment and remain visible only to assigned students and authorized course teachers/organization administrators. Public sequential courses require enrollment before learning. Students enroll in free courses directly. Paid-course learning requires an individual direct access grant/coupon or an active student subscription, followed by enrollment.

Student subscriptions are separate from existing organization licensing. Organization administrators confirm offline payment by selecting a student, expiry, and payment reference on a paid course page. The subscription covers all public paid courses in that organization, never private courses. Administrators can revoke subscriptions. Students see subscription status/expiry on paid course pages. Organization licensing and feature availability still apply.

Subscription enrollment is stored as `self`; teacher grants and redeemed purchases are `direct`. Expiry/revocation removes subscription-derived access immediately at the database boundary. Neither expiry nor removing enrollment deletes progress. Renewing or purchasing resumes the same progress. Teachers can upgrade a self-enrollment to purchased access; coupon redemption also upgrades it atomically. No payment processor or automatic charge verification was added.

Legacy courses retain their existing free-access behavior until activated. Legacy paid courses also recognize active student subscriptions. New courses can be assembled before activating their path.

### Progress and evaluation

Each student's completion and playback progress is persisted in PostgreSQL independently. Initially only the first item is available. All prior items must be complete to open the next item or module; all items complete means course complete. The learning screen shows ordered modules, item states, completed/total progress, and Resume for the next incomplete available item. Completed items remain reviewable while access is valid.

Notes and reading documents have an immediate **Mark as complete** button. Assessment submission records completion in the same transaction as the existing submission operation. No passing mark, publication, evaluation, or approval is required. Resubmission and zero marks do not roll back completion. Existing assessment grading remains in **My work & results** / the teacher assessment screen.

Teachers record practice/workshop participation from the item view; optional marks and feedback are stored separately from completion. A linked workshop also advances when the teacher records present/late attendance for a currently unlocked workshop. Absent attendance does not complete an item. Participation recorded before the student reaches a workshop does not automatically bypass the path; the teacher records participation once reachable. Re-recording participation without marks retains existing evaluation. The roster endpoint exposes individual student completion and evaluation to authorized teachers.

### Video playback

Sequential videos use the existing protected streaming gateway or a direct HTTPS MP4/WebM/Ogg source. Teacher-configured duration is authoritative for the short-video threshold; teachers must enter the verified actual duration. Unsupported iframe-only sources are rejected by the structure API to avoid creating an unfinishable lesson.

The player samples real playback positions while the document and video are visible. Play alone, idle pages, paused/buffering time, hidden/offscreen playback, and seeking do not earn credit. Server RPCs bound credit by elapsed server time and plausible position advancement, reject replayed sequences/stale sessions, and rotate a single per-student/item playback token so multiple tabs cannot accumulate duplicate intervals. Watched time persists across openings/sessions.

For videos of at least 60 seconds, eligibility requires 60 active seconds. Short videos additionally track continuous coverage through the full video; replaying only the beginning cannot meet that condition. There is a capped timing tolerance (at most 250 ms, and at most 1% of short-video duration) for player/event precision. Eligibility never automatically completes an item: the student must click **Mark as complete**. Completion is idempotent, including imported historical completions.

Browser telemetry cannot prove human attention or prevent a determined client from fabricating realistic playback over real elapsed time. The server rejects instant credit, direct completion without earned eligibility, arbitrary duration/total claims, and sequence bypasses. Externally public media URLs remain governed by the host; protected streaming is required when the media itself must not be publicly accessible. Existing issued media URLs may remain valid until their provider expiry; all new API/media access checks re-evaluate entitlement and locks.

## Backend enforcement

Progress, structure, playback sessions, and student subscriptions are private tables without client table privileges. Security-definer RPCs validate organization, course ownership, enrollment, entitlement, resource identity, and prerequisites. Resource foreign keys preserve dependencies; the structure API verifies every linked resource belongs to the same course and organization.

RLS on lessons, assignments, and sessions uses centralized sequential access checks. Existing completion/submission RPCs and the media gateway are guarded too; superseded security-definer entry points are revoked from client roles. Locked outline entries expose titles/type/state, never bodies, prompts, media URLs, or meeting links. Course locks serialize path editing, completion, submission, participation, and playback updates. Existing table-level authentication and organization isolation remain intact.

## Deployment and dependencies

Apply the new migration before deploying this frontend: workspace loading now calls `learning_entitlements`. The migration has been exercised against the full migration chain in isolated PGlite tests; it has not been applied to a hosted Supabase project by this task. Back up the database before normal production rollout and inspect the migration in your usual review process.

No payment-gateway credentials are required for the confirmed offline flow. Automated checkout would need a separate provider integration. Existing protected video delivery still needs the application's configured media provider and Edge Functions. Iframe-only video providers need a playback-event adapter before being used in sequential paths. The isolated `?demo=1` prototype remains unchanged.

## Validation

Validation completed on 28 September 2026: `npm test` passed 114 tests (including 102 database integration tests); the 39-test desktop regression run passed, and the expanded six-test course workflow suite passed. `npm run build` passed with the existing large-chunk warning. Desktop and mobile screenshots were inspected, and student/editor views were checked for horizontal overflow. Tests cover migration/RLS, direct resource and mutation bypasses, private/unrelated/cross-organization access, enrollment, student subscription expiry and purchase upgrades, independent student progress, both sequencing levels, persistence, zero/pending grades, teacher participation/attendance, duration thresholds, inactive and replayed playback, and short-video coverage. Playwright tests exercise student enrollment/resume/reload, explicit video completion eligibility, and teacher ordering/activation in the actual UI with mocked network responses; database enforcement is tested separately against PostgreSQL-compatible PGlite.
