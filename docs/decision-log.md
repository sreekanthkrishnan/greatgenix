# Education SaaS — Decision Log

Updated: 22 September 2026

## Confirmed decisions

| ID | Decision | Source |
| --- | --- | --- |
| D-001 | The product is an education SaaS application. | Initial user request |
| D-002 | The product supports multiple user levels. | Initial user request |
| D-003 | Document the product before implementation. | Initial user request |
| D-004 | Great Genix is the first and primary customer; current development addresses its needs. “Great Genics” in the voice conversation refers to this organization. | User-confirmed voice planning, 22 September 2026 |
| D-005 | Organization is the account/user-mapping boundary. Great Genix is one organization with a centralized application for one center, multiple centers, online-only classes, or a mix. No physical center or center count is required or assumed. | User correction in voice planning, 22 September 2026 |
| D-006 | The hierarchy is platform super users (product owner/operator team) → customer organizations → organization-mapped users. An organization is an entity, distinct from the organization administrator role. | User-confirmed voice planning, 22 September 2026 |
| D-007 | Organization administrator, teacher, student, and HR are identified role examples. The complete role set, permissions, roles per user, and cross-organization memberships were left undecided; D-016 subsequently confirms the selected teacher/admin combination. | User-confirmed voice planning, 22 September 2026 |
| D-008 | Future audiences include tuition centers, individual educators conducting classes, schools, colleges, institutions, and umbrella organizations operating several schools or colleges. SRM was illustrative, not an actual customer. | User-confirmed voice planning, 22 September 2026 |
| D-009 | Future customers may subscribe to the SaaS or potentially obtain the whole application as a separate project. Commercial, licensing, hosting, and delivery details remain undefined. | User-confirmed voice planning, 22 September 2026 |
| D-010 | The SaaS serves multiple independent customer organizations, with Great Genix first. Vedantu, Byju’s, and Sarvodaya were illustrative possibilities, not actual customers. | User-confirmed voice planning, 22 September 2026 |
| D-011 | Each organization can choose/customize its needed features during organization creation and afterward. | User-confirmed voice planning, 22 September 2026 |
| D-012 | Subscription plans or amounts may vary with selected features. Organization configuration and subscription-linked feature access are distinct from user-role permissions; prices and exact billing rules are undecided. | User-confirmed voice planning, 22 September 2026 |
| D-013 | Selectable capability examples include attendance and registration (spoken grouping to clarify), live online classes, recorded classes, assessments/assessment sessions, webinars, workshops, report cards, parent communication/parent-facing functionality, and teacher-facing functionality. These do not commit Great Genix's launch scope. | User-confirmed voice planning, 22 September 2026 |
| D-014 | The user corrected “multiple applications” to “multiple features.” No separate parent/teacher applications, deployments, or particular clients are implied. | User correction in voice planning, 22 September 2026 |
| D-015 | MVP emphasis is teacher and student screens with minimal platform super-admin screens. Detailed screen lists remain proposed. | User-confirmed voice planning, 22 September 2026 |
| D-016 | Selected teachers may also act as organization admins initially through explicit assignment; no default admin access for all teachers. A separate organization-admin experience is later. | User-confirmed voice planning, 22 September 2026 |
| D-017 | Live and recorded classes are initial needs. Other capability examples are not automatically launch commitments; recording live sessions is a separate decision. | User-confirmed voice planning, 22 September 2026 |
| D-018 | Prioritize privacy and age-appropriate educational content, preventing explicit/noneducational results while distinguishing legitimate contextual curriculum content. No guarantee of perfect filtering or legal compliance is made. | User-confirmed voice planning and scope clarification, 22 September 2026 |
| D-019 | Long-term education-suite vision includes digitizing paper registers/processes, document/file/productivity/collaboration tools and inter-school connections. Keep this separate from MVP; organizations remain isolated by default with explicit scoped future sharing. | User-confirmed voice planning, 22 September 2026 |
| D-020 | Seek scalable technology with essentially no initial investment, especially free recorded-video hosting and later paid migration. This is a design goal, not provider approval or guaranteed free production. | User-confirmed voice planning, 22 September 2026 |
| D-021 | Final MVP and initial-release choice is React frontend + Supabase backend. The user rejected Python for the initial phase after discussing Python/Django; no Django-first recommendation applies. Supabase includes PostgreSQL, Auth, storage and APIs/functions as appropriate. | Final user-confirmed voice decision, 22 September 2026 |
| D-022 | Trusted checks, media-token issuance, secrets and provider callbacks remain server-side. Edge Functions are a proposed Supabase runtime; the earlier standalone Hono/Cloudflare Workers API proposal is superseded. Finer libraries, hosting and video providers remain recommendations. | Final decision and documented design implications, 22 September 2026 |
| D-023 | Python may be introduced later, with no mandatory or scheduled migration. Adding Python alongside Supabase differs from replacing all its services; interfaces/adapters support portability but migration requires work. | Final user-confirmed direction and design implications, 22 September 2026 |

## Resolved and superseded questions

| Original question | Resolution | Affected sections |
| --- | --- | --- |
| Q-001: Which initial customer group? | D-004 confirms Great Genix as the primary customer; D-008 records future audiences. Detailed Great Genix workflows still need discovery. | Product specification 1–2, 12; README |
| Q-002: Which user levels and powers? | D-006–D-007 confirm the hierarchy and role examples. Remaining role and permission questions continue under Q-002 below. | Product specification 3–5, 8–9; README |
| Q-004: Are organizations or branches the boundary? | D-005 confirms the organization boundary and supersedes the draft's branch-focused hierarchy. Cross-organization membership and optional operational location needs remain open below. | Product specification 3, 6–9, 12–13; README |

The version 0.1 permission matrix and multiple-membership account rules were draft proposals, not user decisions. Version 0.2 replaces those assumptions with open questions. D-009 updates product specification section 10 and the README with the confirmed offering intent.

Version 0.3 incorporated D-010–D-014 across product specification sections 1–2, 5–10, and 12–13, and the README. Feature-based subscription variation was confirmed as a possibility, partially resolving Q-008 without deciding prices or billing rules. At that stage, all user-provided capability examples awaited launch prioritization; the version 0.4 decisions below supersede that status for live and recorded classes.

Version 0.4 records D-015–D-020. D-017 resolves live/recorded classes as initial needs, superseding their earlier undecided priority. D-016 partially resolves role combinations while preserving other membership questions. Added [MVP screen proposals](mvp-screens.md) and [architecture/provider recommendations](architecture-recommendation.md); neither constitutes approval of the detailed screen list or technology choices. Curated catalog/search, metadata/review/reporting and no open-web search are recommended ways to meet D-018.

Version 0.5 records the final React + Supabase decision (D-021–D-023), superseding the earlier unapproved stack status and standalone API recommendation. It updates the architecture diagram, screen plan, specification and README. Python/Django was considered in conversation but rejected for the initial phase; it is not an MVP dependency or planned migration. Prior provider pilot limits, upgrade options and backup requirements still apply.

## Open decisions

Prioritize Great Genix's core workflow, detailed role responsibilities, and initial module scope before treating the proposed first-release scope as a backlog. The remaining questions can be handled progressively; they do not all need answers at once.

| ID | Decision needed | Why it matters | Status |
| --- | --- | --- | --- |
| Q-002 | What exact permissions apply, who assigns selected teacher-admins, and which role combinations beyond teacher/admin are supported? | Completes roles without giving all teachers admin powers | Partially resolved by D-006–D-007 and D-016 |
| Q-003 | What are the exact teacher/student live and recorded learning flows, and which proposed screens are essential? | Refines confirmed MVP direction | Partially resolved by D-015–D-017 |
| Q-004 | May a user be mapped to more than one organization? What optional operational location records, if any, does Great Genix need? How should future umbrella organizations represent their constituent institutions? | Refines implementation within the confirmed organization boundary; does not make centers mandatory | Boundary resolved by D-005; remaining details open |
| Q-005 | Will onboarding be self-service or managed by the platform team? | Determines signup, approval, and provisioning flows | Open |
| Q-006 | Beyond live and recorded classes, which proposed features—including attendance and basic assessments—are needed at launch? | Remaining examples are not committed; HR role does not imply an MVP HR module | Partially resolved by D-017 |
| Q-007 | Which countries, languages, and learner age groups are in scope? | Determines localization and privacy requirements | Open |
| Q-008 | How do selected features affect the subscription plan or amount? Who pays, what are the prices and pricing unit, and is online billing required at launch? | Feature-linked variation is confirmed as a possibility; commercial details remain open | Partially resolved by D-012 |
| Q-009 | How many initial active students/teachers and organizations? What are typical/max live class size, length, weekly sessions and concurrency, and recording count/duration/resolution/monthly viewing? | Determines whether free pilot quotas fit and when paid capacity is needed | Open |
| Q-010 | Are external integrations or existing data imports required? | Identifies dependencies and migration work | Open |
| Q-011 | Is a responsive web app sufficient for launch? | Determines platform scope | Open |
| Q-012 | What are the retention, deletion, export, and support-access policies? | Determines the data lifecycle | Open |
| Q-013 | What are the available team, budget, and launch constraints? | Enables realistic release planning | Open |
| Q-014 | Which finer frontend libraries, hosting and Supabase function/runtime choices should be adopted within the confirmed React + Supabase stack? | Completes implementation details without reopening the initial stack choice | Partially resolved by D-021–D-022 |
| Q-015 | What does obtaining the whole application as a separate project include, and what are its licensing, hosting, delivery, maintenance, support, and commercial terms? | Defines the potential offering without assuming a delivery model | Intent confirmed by D-009; details open |
| Q-016 | Does “attendance registrations” mean separate attendance and registration features, a combined workflow, or another grouping? What does registration cover? | Defines the example accurately without inventing scope | Open |
| Q-017 | What are the feature catalog, bundles, dependencies, defaults, and mandatory foundational capabilities? | Defines organization-specific configuration | Open |
| Q-018 | Which roles may select, enable, change, or remove features at creation and afterward? Is approval needed? | Separates configuration authority from ordinary feature-use permissions | Open |
| Q-019 | What are the activation dates, billing/proration rules, subscription-state effects, and failed-change handling? | Defines when a requested selection becomes effective access | Open |
| Q-020 | What happens to data, reports, scheduled sessions, in-progress work, read access, exports, and re-enabling when a feature is removed? | Defines feature removal without assuming automatic data deletion | Open |
| Q-021 | Which video providers and pilot limits should be adopted, and what happens at shared-account quota exhaustion? What future paid budget is acceptable? | React + Supabase is confirmed; provider choices and cost policies remain open | Stack resolved by D-021; remaining details open |
| Q-022 | Who reviews/publishes content and responds to reports, for which ages/grades/curricula? What live moderation, recording consent and retention policies apply? | Turns privacy and age-appropriate content goals into operational rules | Open |
| Q-023 | Must live classes be recorded, or are independently uploaded recorded lessons sufficient initially? | Live recording has separate cost, consent and review implications | Open |
| Q-024 | What backup/recovery process, region, private-file volume and transactional-email delivery are required before using the app as a school system of record? | Free-tier availability is not sufficient production assurance | Open |

## Recording a decision

For each resolved question, record the decision, date, user confirmation, and affected document sections. Update the product specification to match. If a decision is reversed, preserve the previous entry and identify the replacement.
