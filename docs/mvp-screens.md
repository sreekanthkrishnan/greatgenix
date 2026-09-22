# Teacher and Student MVP — Proposed Screen Plan

Updated: 22 September 2026  
Status: screen recommendations, not an approved detailed backlog

## Confirmed direction

Great Genix is the first customer. Prioritize teacher and student screens, with live and recorded classes as initial needs. Selected teachers may also act as organization administrators. This requires an explicit assignment; ordinary teachers do not automatically receive administration privileges. A separate organization-admin experience is later. The platform starts with a minimal super-admin screen.

The organization remains the user-mapping boundary, independent of physical centers. Feature availability and individual permissions remain separate checks. No separate parent application is required. General role combinations and cross-organization memberships remain undecided beyond the confirmed teacher/admin combination.

Confirmed implementation direction: React frontend + Supabase backend for the MVP and initial release, with no Python backend now. Supabase's server-enforced policies and trusted functions protect these screens' operations; client-side visibility alone does not grant access. Edge Functions are the proposed place for privileged actions, video tokens, secrets and provider callbacks. Exact libraries, static hosting and video providers remain recommendations; Python is optional future work, not a scheduled migration.

## Proposed screens and boundaries

| Audience | Screen | Main content and actions | Access / scope |
| --- | --- | --- | --- |
| Common | Sign-in and account recovery | Sign in, accept invitation, recover access, view account status | Authenticated organization mapping; no assumed multi-organization switcher |
| Student | Dashboard / my courses | Upcoming sessions, enrolled courses, available recordings, outstanding work | Own enrollments and enabled features |
| Student | Course / lesson | Approved materials and recordings, lesson context, progress, report-content action | Published, suitable content in enrolled courses |
| Student | Live-session page | Session time, join action, microphone/camera checks, waiting/ended states | Enrollment, live feature, session access and time window |
| Student | Basic assessment / submission / result | Instructions, submit work, confirmation, published feedback/results | Own work; basic assessment scope remains a proposal |
| Teacher | Teaching dashboard | Assigned classes, next sessions, pending reviews, content status | Assigned teaching scope |
| Teacher | Courses / batches / roster | View assigned rosters and course structure; edit or invite where authorized | Creating courses/batches and managing enrollment require explicit permission; organization-wide actions restricted to admin-assigned teachers |
| Teacher | Session schedule | Schedule/update authorized sessions, start class, manage session status | Assigned course and live feature; hosting powers separate from student access |
| Teacher | Recording upload / review / publish | Authorized upload, processing state, grade/age/subject metadata, preview, review and publication | Assigned course, recorded-class feature, explicit publication authority |
| Teacher | Attendance | Record attendance, view history, correct with reason | Assigned sessions; proposed MVP addition awaiting confirmation |
| Teacher | Assessment review | Review submissions, draft feedback/grades, publish results | Assigned learners; proposed MVP addition awaiting confirmation |
| Selected teacher with admin assignment | Restricted organization settings | Member/invitation administration, course assignments, organization details; feature configuration only if separately authorized | Same app, explicit organization-admin assignment; default teachers denied |
| Platform super user | Minimal organization console | Create organizations, set status, select/enable features at creation and afterward, inspect usage totals | Platform role; detailed feature-change authority remains a proposal, not a confirmed permission matrix |

The screen list is a recommendation. Live and recorded learning and the role emphasis are confirmed; attendance, assessment details, roster operations, and exact screen groupings still need prioritization. A content review queue can be a tab in the teacher content screen. A full administrator dashboard, HR workspace, parent portal, and suite-wide productivity tools are later candidates.

## Proposed navigation and key journeys

Student navigation: **Home → My courses → Lesson or live session → Work/results**. Teacher navigation: **Home → Courses → Sessions / Recordings / Attendance / Assessments**, with **Organization settings** visible only to an explicitly assigned administrator.

Recorded lesson: teacher creates draft → adds metadata and uploads → provider processes → authorized teacher reviews → publishes → eligible students can watch. Processing completion alone must not publish content. Failed processing stays unpublished and offers retry; review rejection includes a reason.

Live lesson: teacher schedules → eligible student sees session → server validates membership, feature access, enrollment, time and usage budget → issues scoped expiring join credentials → browser joins provider directly. Unavailable quota, denied access, or provider outage produces a clear state. Live-session recording is a separate policy and cost decision, not automatically enabled by the need for recorded lessons.

Feature change: authorized actor selects organization features → system applies the agreed subscription/dependency rules → navigation and service access reflect effective features. A feature toggle cannot grant an ordinary teacher administrator powers.

## Privacy and educational content proposal

The confirmed goal is private, age-appropriate educational content, preventing explicit or unrelated results. Recommend a curated, teacher-approved library and search limited to approved content for the student's organization, enrollment and age/grade/subject. Do not include open-web search in the MVP.

Capture subject, curriculum/grade, intended age range, content owner, review status and publication status. Require review before publishing; provide reporting, temporary withdrawal, review reasons and an audit trail. Authority to review/publish and handling urgent reports need definition. Automated checks may assist reviewers, but cannot guarantee perfect filtering.

Context matters: legitimate, age-appropriate biology and reproductive-health curriculum must not be blanket-blocked as explicit content. Assess educational purpose and audience suitability through review. For live sessions, include host moderation and a reporting route; prerecorded-content review cannot prevent every live incident.

Organizations remain isolated by default. Future sharing between schools requires explicit, scoped grants and revocation, not global visibility. Minimize student identifiers sent to video providers and keep sensitive records and videos out of public caches. Recording consent, retention, region and learner-age policies remain open; no legal-compliance claim is made.

## Essential states and proposed acceptance checks

- Every screen: loading, empty, validation error, unavailable feature, denied permission and retryable service failure.
- Ordinary teacher requests to administrator endpoints fail, even if the interface is manipulated. Removing an admin assignment removes those powers without ending ordinary teaching access.
- Student requests for another organization's content, unpublished media, another student's work or an unauthorized live room fail.
- Library search returns only approved, audience-appropriate, authorized catalog entries; unavailable external search has no fallback to the open web.
- Uploads show progress/failure/processing/review states; only reviewed and published recordings are available to students.
- Feature disablement and expiring media credentials follow a defined revocation policy; existing short-lived credentials may remain usable until expiry.

See [the confirmed stack and architecture recommendations](architecture-recommendation.md) for implementation boundaries and pilot limits, and [the decision log](decision-log.md) for unresolved scope.
