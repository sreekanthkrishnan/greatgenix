# Education SaaS — Product Specification

> Implementation update — 22 September 2026: the current UI and Supabase implementation, feature-based structure, and per-organization white labeling are now user-approved. See [implementation and deployment notes](implementation.md) for what is built, implementation choices, validation, and remaining hosted integration work. Earlier proposal language below is retained as product history.

Version: 0.5  
Created: 22 September 2026  
Status: discovery draft

## 1. Confirmed requirements

| ID    | Requirement                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-001 | Build an education SaaS application.                                                                                                                                                                                                                                                                                                                                                                                 |
| C-002 | Support multiple levels of users.                                                                                                                                                                                                                                                                                                                                                                                    |
| C-003 | Document the product before implementation begins.                                                                                                                                                                                                                                                                                                                                                                   |
| C-004 | Great Genix is the first and primary customer. Current development should address this organization's needs.                                                                                                                                                                                                                                                                                                         |
| C-005 | The organization is the account/user-mapping boundary. Great Genix uses one centralized application as one organization, regardless of physical centers or online delivery.                                                                                                                                                                                                                                          |
| C-006 | The hierarchy is platform-level super users (the product owner/operator team) → customer organizations → users mapped to each organization. An organization is an entity; organization administrator is a user role.                                                                                                                                                                                                 |
| C-007 | Identified organization role examples are organization administrator, teacher, student, and HR. Other roles and exact permissions remain to be defined. Selected teachers may also be organization admins in the MVP (C-016); broader role combinations remain open.                                                                                                                                                 |
| C-008 | Future intended customers include tuition centers, individual educators conducting classes, schools, colleges, institutions, and umbrella organizations operating several schools or colleges.                                                                                                                                                                                                                       |
| C-009 | Future customers may subscribe to the SaaS or potentially obtain the whole application as a separate project. The details of these offerings remain undefined.                                                                                                                                                                                                                                                       |
| C-010 | The SaaS serves multiple independent customer organizations, with Great Genix first. Vedantu, Byju’s, and Sarvodaya were illustrative possibilities, not actual customers.                                                                                                                                                                                                                                           |
| C-011 | Each organization can choose/customize which product features it needs. Feature selection and enabling must be available during organization creation and after creation.                                                                                                                                                                                                                                            |
| C-012 | Subscription plans or amounts may vary according to selected features. Organization-specific feature configuration and subscription-linked access are distinct from individual user-role permissions. No prices or exact billing rules are decided.                                                                                                                                                                  |
| C-013 | Example selectable capabilities include attendance and registration (grouping to clarify), live online classes, recorded classes, assessments/assessment sessions, webinars, workshops, report cards, parent communication/parent-facing functionality, and teacher-facing functionality. The full list is not a committed launch scope; live and recorded classes are subsequently confirmed initial needs (C-017). |
| C-014 | The product provides multiple features. Parent-facing and teacher-facing functionality do not imply separate applications, deployments, or particular clients.                                                                                                                                                                                                                                                       |
| C-015 | Focus the MVP heavily on teacher and student screens, with minimal platform super-admin screens. Detailed screen contents remain proposed.                                                                                                                                                                                                                                                                           |
| C-016 | Selected teachers may also act as organization admins initially through explicit assignment. Do not give all teachers admin privileges. A separate organization-admin experience is later.                                                                                                                                                                                                                           |
| C-017 | Live classes and recorded classes are initial needs. Provider choices and automatic recording of live sessions are not decided.                                                                                                                                                                                                                                                                                      |
| C-018 | Prioritize privacy and age-appropriate educational content, preventing explicit and noneducational results. Contextual, age-appropriate biology/reproductive-health education should remain distinguishable from explicit material; no perfect filtering or compliance guarantee is assumed.                                                                                                                         |
| C-019 | Long-term vision: digitize paper school registers/processes and eventually provide education document/file/productivity/collaboration tools, with schools able to interconnect. This is separate from the MVP; organizations remain isolated by default and future sharing must be explicit and scoped.                                                                                                              |
| C-020 | Seek scalable technology with essentially no initial investment, especially free recorded-video hosting with a later paid path. This is a design goal, not a guarantee of zero-cost production or approval of any provider.                                                                                                                                                                                          |
| C-021 | Final MVP and initial-release stack: React frontend + Supabase backend, using PostgreSQL, Auth, storage and APIs/functions as appropriate. Avoid Python in the initial phase. Finer libraries, hosting and video providers remain recommendations.                                                                                                                                                                   |
| C-022 | Trusted organization/feature/role checks, video-token issuance, secrets and provider callbacks remain server-side. Supabase Edge Functions are a proposed runtime; an additional standalone Hono/Cloudflare Workers backend is not required.                                                                                                                                                                         |
| C-023 | A Python backend may be introduced in the future, but is optional and unscheduled. Preserve frontend/backend interfaces and provider integration boundaries; adopting Python or replacing Supabase requires deliberate work.                                                                                                                                                                                         |

Sections below distinguish confirmed direction from proposals and open questions. Existing feature suggestions are not approved scope. This document uses the established project spelling **Great Genix**; “Great Genics” in the voice planning conversation refers to the same organization.

## 2. Product purpose

Proposed purpose: give an education organization a shared place to manage people, learning activities, and progress, with each user seeing only the information and actions relevant to their responsibilities.

Confirmed focus: Great Genix is the first and primary customer. Its operational needs should determine current priorities, terminology, workflows, and the initial feature set.

Confirmed product model: the SaaS serves multiple independent organizations, each with its own selected features. Vedantu, Byju’s, and Sarvodaya were illustrative examples only, not actual customers. Feature choice enables organizations to use the capabilities they need; it does not establish a bespoke codebase or application per feature or customer.

Confirmed future audience: tuition centers, individual educators conducting classes, schools, colleges, institutions, and umbrella organizations operating several schools or colleges. SRM was an illustrative example of an umbrella organization, not an actual customer. Future audience breadth does not make all customer-specific features part of the initial release.

Proposed outcomes:

- Administrators can set up their organization and manage access without engineering assistance.
- Educators can organize learning activities and track learners' progress.
- Learners can find their classes, learning materials, assignments, and results.
- Organization data remains isolated from other customers.

Confirmed MVP emphasis is teacher/student use, live and recorded learning, selected teacher-admins and minimal platform administration. The broader education-suite vision covers paper-register digitization, institutional processes and future productivity/collaboration tools. Future inter-school connections require explicit, scoped sharing and revocation; they do not imply shared visibility of student records.

## 3. Organization and account model

### 3.1 Confirmed organization boundary

Platform super users (product owner/operator team) → customer organizations, including Great Genix → organization-mapped users.

An **organization** is an entity and the account/user-mapping boundary. An **organization administrator** is a user role within that organization. These are distinct concepts.

Great Genix is one organization with a centralized application whether it operates one center, multiple centers, online-only classes, or a mix. Physical centers are not mandatory, and no center count is assumed. A physical location does not define a separate organization or user-mapping boundary.

Course/class and batch/section structures remain proposed academic concepts. Optional center, branch, or campus records may be considered if needed for operations; they are not prerequisites for user mapping. The internal structure of future umbrella customers remains to be defined.

### 3.2 Account and role rules still to decide

- Users are mapped to organizations; the identity and membership implementation is undecided.
- Selected teachers may also act as organization admins through explicit assignment. Broader role combinations and their implementation remain undecided; teachers have no administrator powers by default.
- Whether a user may be mapped to more than one organization is undecided; no organization-switching workflow is assumed.
- Exact role permissions, assignment scopes, delegation rules, and account lifecycle policies remain open.
- Platform-level super users and organization roles are distinct; their precise access powers remain open.

Proposed safeguards: organization mapping should not implicitly grant access to other organizations, and authorization should consider the applicable role and resource scope. These safeguards do not decide membership cardinality or a permission matrix.

## 4. User levels and roles

| Level or role              | Confirmation status                                                           | Details still open                                                                   |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Platform super users       | Confirmed: product owner/operator team at platform level                      | Administrative powers, support access, and operational responsibilities              |
| Customer organization      | Confirmed entity: Great Genix is the primary example; this is not a user role | Organization setup and lifecycle                                                     |
| Organization administrator | Confirmed role; selected teachers may hold this responsibility in the MVP     | Exact permissions and assignment authority; separate admin experience is later       |
| Teacher / instructor       | Confirmed example of an organization role                                     | Teaching scope and permissions                                                       |
| Student / learner          | Confirmed example of an organization role                                     | Learning access and permissions                                                      |
| HR                         | Confirmed example of an organization role                                     | Responsibilities, records, and permissions; no HR module or payroll scope is implied |
| Other organization roles   | To be defined                                                                 | Names, responsibilities, and release priority                                        |

Earlier suggestions for a separate organization owner, platform support agent, branch/campus admin, parent/guardian, and finance staff remain optional proposals. None is required by the confirmed hierarchy. Fixed versus custom roles, combinations beyond the selected teacher/admin case, and the complete release role set remain undecided.

## 5. Permissions to define

### 5.1 Open permission decisions

No exact permission matrix is confirmed. The earlier draft allocation is replaced by the questions below so it does not become an implementation assumption.

| Capability area              | Decision needed                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Organization administration  | Who may create, configure, suspend, or restore an organization?                                          |
| User and role management     | Who may map users, invite administrators, assign roles, or revoke access?                                |
| Academic setup               | Who may create classes, assign teachers, and enroll learners?                                            |
| Teaching and assessment      | Who may publish materials, submit work, grade, and release results, and within what scope?               |
| HR                           | What responsibilities and records belong to HR, and who else may access them?                            |
| Reporting and communications | Who may view progress, send announcements, export records, and review audit history?                     |
| Commercial administration    | Who manages any subscription or separate-project arrangement?                                            |
| Feature configuration        | Which roles may select, enable, change, or remove an organization's features during setup and afterward? |
| Platform support             | When may platform super users access organization data, and through what controls?                       |

### 5.2 Proposed enforcement safeguards

- Check authorization on the server for every protected action, including downloads and exports.
- Check organization membership, permission, and resource scope together.
- Hiding a button is not an authorization control.
- Teachers must not gain access to learners outside their assignments by changing an identifier.
- Learners must not see other learners' private submissions or unpublished grades.
- Users cannot grant permissions they are not authorized to assign.
- Administrator succession and access recovery require a deliberate process; whether a separate organization-owner role exists remains open.
- Suspending a user or revoking a membership must invalidate relevant access promptly.
- Background jobs, search results, caches, file storage, and reporting must preserve organization boundaries.
- Platform support access to educational records must be explicitly granted, limited, and audited; platform ownership alone does not imply routine access.
- Guardian access, if included, requires a verified relationship and an explicit policy defining visible records.

### 5.3 Organization feature access and user permissions

Confirmed requirement: feature configuration belongs to each organization, with access linked to its subscription arrangement. User-role permissions separately determine which actions a user may perform within the available features.

Design implications to refine:

- Evaluate organization context, effective feature availability under the subscription rules, and the user's authorized action/resource scope together.
- Enabling a feature for an organization does not grant every user permission to use every action in it.
- Assigning a user a role does not by itself enable an unavailable organization feature.
- Changing one organization's feature configuration must not alter another organization's configuration or access.
- Enforce effective feature availability on protected service operations as well as in navigation; record configuration changes for traceability.

The feature-change authority, entitlement representation, activation timing, dependencies, and effect of billing status remain undecided. Selecting a feature is not assumed to activate it immediately before any applicable subscription conditions are satisfied.

## 6. Feature selection and candidate modules

### 6.1 Confirmed configurable-feature requirement

Each organization must be able to select and enable the features it needs both during creation and after creation. Exact bundles, dependencies, defaults, mandatory foundational capabilities, and configuration controls remain open. Great Genix needs live and recorded classes initially; the rest of its launch selection is still to be decided.

### 6.2 User-provided capability examples

| Example capability                                 | Definition still needed                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attendance and registration                        | Spoken as “attendance registrations”; clarify whether these are separate capabilities, a combined workflow, or another grouping, and what registration covers |
| Live online classes                                | Session workflow and delivery/integration approach                                                                                                            |
| Recorded classes                                   | Recording access and content workflow                                                                                                                         |
| Assessments / assessment sessions                  | Assessment types, session behavior, and evaluation workflow                                                                                                   |
| Webinars                                           | Event and participation workflow                                                                                                                              |
| Workshops                                          | Event and participation workflow                                                                                                                              |
| Report cards                                       | Contents, publication, and visibility                                                                                                                         |
| Parent communication / parent-facing functionality | Communication needs, relationships, and permitted views                                                                                                       |
| Teacher-facing functionality                       | Required teaching workflows and actions                                                                                                                       |

These examples describe multiple features, not multiple applications. No separate parent app, teacher app, deployed application, or specific client is implied. Live and recorded classes were subsequently confirmed as initial needs; the other examples still do not establish a release date, bundle, or launch commitment.

### 6.3 Earlier module proposals for refinement

The following candidate breakdown is retained for planning. “Core candidate” is a proposal, not a decision that a module is mandatory for all organizations. Its grouping must be reconciled with the feature catalog above.

| Module                             | Candidate capabilities                                                                                            | Proposed scope / open detail                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Identity and access                | Sign-in, recovery, invitations, memberships, role assignment, account suspension                                  | Core candidate                                                                  |
| Organization setup                 | Organization profile, authorized administrators, academic settings                                                | Core candidate; physical centers are not required                               |
| User management                    | Organization user directory, role mapping, invitations, status management                                         | Core candidate; includes defining administrator, teacher, student, and HR needs |
| Center / campus operations         | Optional location records and operational workflows                                                               | Only if Great Genix needs them; not an account boundary                         |
| HR workflows                       | Capabilities to be defined with Great Genix                                                                       | Role identified; module scope undecided                                         |
| Academic structure                 | Courses/classes, batches/sections, terms, teacher assignments, enrollment                                         | Core candidate; terminology TBD                                                 |
| Learning content                   | Publish materials, organize lessons, control learner access                                                       | Core candidate                                                                  |
| Assignments                        | Due dates, submissions, grading, feedback, publication of results                                                 | Core candidate                                                                  |
| Attendance                         | Session attendance, corrections, learner history                                                                  | Customer-dependent                                                              |
| Announcements                      | Organization and class notices, notification preferences                                                          | Core candidate                                                                  |
| Reports                            | Membership, enrollment, completion, attendance, and result summaries                                              | Metrics depend on approved modules                                              |
| Organization feature configuration | Feature selection and enabling at creation and afterward                                                          | Confirmed capability; bundles, authority, and lifecycle rules TBD               |
| SaaS subscriptions                 | Feature-linked organization access and potentially varying plans/amounts; candidate trial and lifecycle workflows | Feature relationship confirmed; exact commercial model TBD                      |
| Learner fee management             | Charges, collections, receipts, refunds                                                                           | Separate from SaaS subscriptions; later candidate                               |
| Parent-facing functionality        | Candidate linked learner progress and notices                                                                     | User-provided feature example; no separate application implied                  |
| Live / recorded learning           | Live online classes and recorded classes                                                                          | Confirmed initial needs; detailed workflows/provider choices TBD                |
| Events                             | Webinars and workshops                                                                                            | User-provided feature examples; launch priority TBD                             |
| Assessments and report cards       | Assessment sessions, evaluation, published report cards                                                           | User-provided feature examples; scope TBD                                       |
| Other learning features            | Quizzes, certificates, discussions                                                                                | Earlier proposals; grouping and priority TBD                                    |

AI features, a public course marketplace, native mobile apps, payroll, transport, library management, and hostel management are outside the proposed first release unless explicitly prioritized.

## 7. Proposed primary workflows

The following workflows are candidates for refinement with Great Genix. Actor assignments are proposals pending the permission decisions in section 5. Feature selection at creation and afterward is confirmed; the detailed flows are still to be designed.

### 7.1 Organization onboarding

1. An organization is created through a platform-admin process or self-service signup; the route is undecided.
2. During creation, the organization selects the features it needs through an authorized actor whose role is still to be decided. Subscription conditions and activation timing are applied under rules still to be defined.
3. An authorized organization administrator verifies their account and completes the organization profile.
4. An authorized administrator configures applicable academic features and invites users into the organization.
5. An authorized admin creates courses/classes and enrolls learners if those capabilities are enabled.
6. Each member receives access according to the organization's effective features and their individual permissions and scope.

Acceptance considerations: prevent duplicate onboarding submissions, define administrator recovery, and define what happens if verification or setup is abandoned. Center creation is not a required onboarding step.

### 7.2 Invitation and access

1. An authorized user selects the intended role and scope.
2. The invited person receives an expiring invitation.
3. The person signs in or creates an account and accepts the invitation.
4. The system creates the intended membership and records the event.

Acceptance considerations: expired, revoked, reused, or incorrect-recipient invitations do not grant access. Define handling for existing accounts after deciding role cardinality and cross-organization membership.

### 7.3 Teaching and learning

1. An admin creates a course/class and assigns a teacher.
2. Learners are enrolled in that course/class.
3. The teacher publishes materials and an assignment.
4. An enrolled learner submits work and receives a submission confirmation.
5. The teacher grades the work and publishes feedback.
6. The learner sees the published result.

Acceptance considerations: define late submissions, resubmissions, permitted attachment types and sizes, grading scales, and how historical work behaves after unenrollment.

### 7.4 Attendance, if selected

1. A teacher opens an assigned teaching session.
2. The teacher records attendance for enrolled learners.
3. Authorized users can view the resulting history.
4. Corrections record the actor, time, and reason.

Attendance statuses, correction windows, and guardian visibility remain undecided.

### 7.5 Suspension and offboarding

1. An authorized administrator suspends a membership or a platform operator suspends an organization.
2. The system applies the agreed access restrictions and records the reason.
3. Data remains subject to the agreed retention and export policy.
4. Restoration, permanent deletion, and administrator access recovery use separate workflows.

Suspension is not deletion. The effect of an unpaid subscription on student access must be explicitly decided.

### 7.6 Feature changes after organization creation

1. An authorized actor reviews the organization's selected and available features; the role with this authority is undecided.
2. The actor requests a feature change after creation.
3. The system evaluates applicable dependencies and subscription effects under rules to be defined.
4. The organization's effective feature access is updated at the agreed activation time, without changing another organization's configuration.
5. Users can perform only actions allowed by both effective feature access and their individual permissions.

Open behavior: bundles, dependencies, pricing calculation, confirmation/approval flow, proration, effective dates, and handling of failed changes. For removal or disabling, decide what happens to existing data, reports, scheduled sessions, in-progress work, access, exports, and later re-enabling. Feature removal must not be assumed to delete data automatically.

## 8. Initial screen inventory

Confirmed emphasis: teacher/student screens, selected teacher-admins in the same initial experience, and minimal super-admin screens. The following details are proposed; see the [MVP screen plan](mvp-screens.md) for workflows and access boundaries.

| Audience                                                     | Candidate screens                                                                                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared                                                       | Sign-in, account recovery, invitation acceptance, profile, notifications, access-denied state; organization switching only if cross-organization membership is approved |
| Platform super users                                         | Minimal organization creation/status, feature enablement and usage console; detailed controls remain proposed                                                           |
| Selected teacher with explicit organization-admin assignment | Restricted organization settings, members/invites and authorized setup; separate organization-admin experience later                                                    |
| Teacher                                                      | Dashboard, authorized course/batch and roster management, session schedule, recording upload/review/publish, proposed attendance and basic assessment review            |
| Learner                                                      | Dashboard/my courses, lesson and live-session page, proposed basic assessment/submission/results                                                                        |
| HR                                                           | Later candidate; screens to be defined once responsibilities are established                                                                                            |
| Guardian, if selected later                                  | Linked learners, permitted progress, attendance, notices; no separate app required                                                                                      |
| Feature configuration — authorized actor TBD                 | Feature selection during organization creation and post-creation settings; subscription effects and effective availability once rules are defined                       |

Every approved screen needs loading, empty, success, validation-error, permission-error, and unavailable states documented during detailed design.

## 9. Conceptual data model

This is a vocabulary and relationship sketch, not a database schema. The organization boundary and mapping of users to organizations are confirmed; other entities and implementation details are proposals.

| Entity                             | Purpose and relationships                                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| User                               | Account identity; selected teachers may also be admins; broader role combinations and cross-organization mapping remain open                         |
| Organization                       | Confirmed account/user-mapping boundary, independent of physical locations; distinct from the administrator role                                     |
| Membership / user mapping          | Proposed representation of the confirmed user-to-organization mapping; cardinality and lifecycle remain open                                         |
| Role assignment                    | Proposed representation of organization role/scope, including explicit teacher-admin assignments; broader combinations remain open                   |
| Invitation                         | Intended recipient, organization, role/scope, expiry, acceptance status                                                                              |
| Center / branch / campus           | Optional operational location within an organization; not a prerequisite or account boundary                                                         |
| Academic period                    | Optional term or academic year                                                                                                                       |
| Course                             | Subject or learning offering                                                                                                                         |
| Class / cohort                     | Delivery of a course to a particular group                                                                                                           |
| Teaching assignment                | Connects a teacher membership to a class/cohort                                                                                                      |
| Enrollment                         | Connects a learner membership to a class/cohort                                                                                                      |
| Material                           | Learning content and publication/access state                                                                                                        |
| Assignment                         | Task, due date, submission rules, grading configuration                                                                                              |
| Submission                         | Learner work, timestamps, and any permitted revisions                                                                                                |
| Grade / feedback                   | Evaluation with draft and published states                                                                                                           |
| Attendance record                  | Optional learner status for a teaching session                                                                                                       |
| Guardian relationship              | Optional verified guardian-to-learner link                                                                                                           |
| Announcement                       | Message and its intended audience                                                                                                                    |
| Subscription                       | Organization's SaaS plan, status, and entitlements                                                                                                   |
| Feature definition                 | Proposed catalog representation of selectable capabilities; bundles and dependencies TBD                                                             |
| Organization feature configuration | Proposed representation of an organization's selected features and effective availability under subscription rules; lifecycle and storage design TBD |
| Audit event                        | Actor, organization context, action, target, time, and permitted change metadata                                                                     |

Organization-scoped relationships must not accidentally connect records belonging to different organizations. Any future cross-organization sharing requires a separately designed explicit grant and scope; no such sharing is included in the MVP. Sensitive content should not be copied indiscriminately into audit logs.

## 10. Intended offerings and open commercial model

Confirmed future intent: customers may subscribe to the SaaS or potentially obtain the whole application as a separate project. Great Genix remains the current development priority. No specific subscription arrangement for Great Genix is assumed.

Confirmed for the SaaS offering: subscription plans or amounts may vary according to an organization's selected features, and feature access is linked to its subscription arrangement. This does not establish per-feature pricing, fixed bundles, or a particular billing formula. The payer, pricing unit, plan definitions, prices, trial policy, billing process, and payment provider are undecided.

For the potential whole-application offering, scope, licensing, ownership, hosting, deployment, delivery, pricing, maintenance, and support arrangements remain undefined. This intent does not commit the project to a separate deployment model, code transfer, or licensing arrangement.

Before implementing billing, document:

- Which plan features and limits are enforced, and where.
- How selected features relate to the subscription plan, amount, and effective feature access.
- Feature bundles, dependencies, change authority, activation dates, billing/proration, and failed-change handling.
- Feature removal behavior for data, scheduled or in-progress activity, read access, exports, and later re-enabling.
- Trial conversion, renewal, cancellation, grace periods, and failed-payment behavior.
- Upgrade and downgrade behavior when current usage exceeds the new plan.
- Currency, invoicing requirements, refunds, and applicable markets.
- Who may view billing data and change the subscription.

The organization's payment to the SaaS provider is separate from any learner tuition or course payments collected by the organization.

## 11. Quality and operational requirements

The following are proposed design requirements; numeric targets and jurisdiction-specific obligations remain open.

| Area           | Requirement to define and validate                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Security       | Server-side authorization, secure account recovery, session revocation, privileged-user authentication controls, abuse protection   |
| Data isolation | No cross-organization exposure through APIs, files, jobs, search, exports, or caches                                                |
| Privacy        | Minimum necessary data, retention and deletion rules, export rights, guardian access, handling of minors' data where relevant       |
| Accessibility  | Keyboard operation, readable contrast, labeled inputs, understandable validation, assistive-technology support; target standard TBD |
| Device support | Responsive web interface; supported browsers and low-bandwidth expectations TBD                                                     |
| Reliability    | Backup and restore process, incident visibility, recovery targets, availability target TBD                                          |
| Performance    | Agree expected organizations, concurrent users, roster sizes, and response-time targets before choosing infrastructure              |
| Localization   | Time zones, date formats, languages, and currencies based on launch markets                                                         |
| Observability  | Operational errors and actionable alerts without exposing sensitive learner information                                             |
| File handling  | Authorized uploads/downloads, file limits, validation, and retention policy                                                         |

No jurisdiction-specific legal compliance claim is made in this draft. Applicable requirements depend on launch markets, customer type, and learner ages.

### Educational content and privacy approach — recommendation

Use a curated, teacher-approved educational catalog/search with grade/age/subject metadata, review before publication, reports and withdrawal, scoped to the learner's organization and access. Exclude open-web search from the proposed MVP. Contextual, age-appropriate biology and reproductive-health lessons are legitimate curriculum content; review educational purpose and audience rather than blanket-blocking those subjects. Automated filtering may assist but cannot guarantee perfect results. Live sessions need host moderation and reporting as well. Detailed review authority, recording consent, retention and escalation policies remain open; see [the screen plan](mvp-screens.md).

## 12. Proposed delivery phases

### Phase 0 — Confirm the product

Document Great Genix's detailed operational needs within the confirmed organization boundary. Define its launch feature selection, feature catalog/grouping, configuration and subscription rules, role responsibilities and cardinality, the core learning workflow, launch market, and first-release boundaries. Expand approved modules into user stories and screen flows.

### Phase 1 — Access and organization foundation

Implement organization setup, authentication, user mapping, the approved role model, invitations, scoped access, and audit events. Include organization-specific feature configuration at creation and afterward, with feature-access enforcement separate from individual permissions. Validate organization isolation and access revocation before adding educational records. Do not require physical center setup.

Use the confirmed React + Supabase stack. Keep trusted checks in server-side policies/functions; use the proposed Edge Functions approach for privileged operations and provider integrations. Python is outside this initial phase. Detailed runtime, hosting and library choices remain proposals.

### Phase 2 — Core education workflow

Prioritize teacher/student live and recorded learning, with selected teacher-admin controls. Implement approved academic setup, teaching assignments, enrollment and content review. Basic assessments/submissions/results and attendance are proposed additions awaiting scope confirmation.

### Phase 3 — Pilot readiness

Complete billing if approved for the pilot, essential reports, notifications, operational monitoring, backup restoration checks, accessibility review, and Great Genix pilot onboarding.

These phases express dependencies, not delivery estimates or a committed backlog.

## 13. Candidate first-release acceptance criteria

- An authorized organization administrator can complete setup and invite a teacher and learner without creating a physical center.
- Great Genix's users map to the Great Genix organization independently of whether teaching occurs online or at physical centers.
- An authorized actor can select features during organization creation and change them afterward, according to the agreed configuration and subscription rules.
- Changing one organization's features leaves other organizations' configuration and access unchanged.
- An enabled feature still requires the user's action/resource permission; a user role alone cannot activate an unavailable feature.
- Effective feature access follows the agreed subscription rules, including activation and removal behavior once defined.
- Students can join authorized live classes and watch approved published recordings in their enrolled courses.
- An ordinary teacher cannot use organization-admin actions; explicitly assigned teacher-admins can use only their authorized administrative scope.
- Revoking an admin assignment removes administrative powers while preserving any remaining teaching permissions.
- Proposed catalog search returns approved, age/grade-appropriate, authorized content; reports and withdrawal support content review.
- An admin can create a class, assign its teacher, and enroll its learners.
- A teacher can publish an assignment, review a submission, and publish a result.
- A learner can submit work and see only their own published result.
- Direct requests for another organization's records are rejected.
- A teacher cannot access an unassigned class; a learner cannot access another learner's private work.
- Expired or revoked invitations cannot create access.
- Revoked memberships stop granting access, including through existing sessions.
- Role changes, membership changes, and sensitive administrative actions produce audit records.
- Empty data, failed uploads, validation errors, and unauthorized requests have usable interface states.
- Backup restoration and required account-recovery flows are demonstrated before production use.

These are proposed validation details for confirmed needs and candidate features. They do not approve optional features for release or reopen the confirmed teacher/student emphasis and live/recorded learning needs.

## 14. Success measures

Candidate measures include organization setup completion, time to first active class, invitation acceptance, weekly active educators and learners, assignment submission completion, and support issues per organization.

Definitions, targets, measurement consent where applicable, and reporting cadence are undecided. No numeric business target is assumed.

## 15. Documentation still to develop

The [MVP screen plan](mvp-screens.md) and [architecture document](architecture-recommendation.md) provide proposed flows, a compact Supabase-first diagram and dated provider research. React + Supabase is confirmed for the MVP and initial release. Next refine user stories, acceptance criteria per feature, permissions, a schema/ER diagram, API/function contracts, remaining architecture choices, release backlog and operational procedures. Finer libraries, hosting and video providers remain recommendations. Python adoption is optional future work, with no committed migration.

Open decisions and their effect on this draft are tracked in [the decision log](decision-log.md).
