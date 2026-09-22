# Education SaaS — Product Documentation

This workspace contains the planning documents for an education SaaS application with multiple user levels. Great Genix is the first and primary customer; current development should address its needs.

Start with the [product specification](docs/product-specification.md), then use the [decision log](docs/decision-log.md) to resolve open questions.

The [MVP screen plan](docs/mvp-screens.md) develops the teacher/student experience. The [architecture document](docs/architecture-recommendation.md) includes the confirmed React + Supabase stack, a Mermaid diagram, remaining implementation recommendations, verified pilot limits and a paid growth path.

## Document status

- Stage: discovery and requirements.
- Confirmed: education SaaS, documentation before implementation, Great Genix as the primary customer, and the hierarchy of platform super users → customer organizations → organization-mapped users.
- Confirmed: an organization is the account/user-mapping boundary, independent of physical centers or online delivery. Organization administrator, teacher, student, and HR are identified role examples; the full role list and permissions remain open.
- Confirmed: the SaaS serves multiple independent customer organizations. Each organization can select and enable features during creation and afterward; subscription plans or amounts may vary with selected features. Organization feature access is distinct from individual user permissions.
- Confirmed MVP direction: teacher/student emphasis, live and recorded classes, selected teachers explicitly assigned organization-admin responsibilities, and minimal platform super-admin screens. A separate organization-admin experience is later; ordinary teachers receive no default admin privileges.
- Confirmed priorities: privacy and age-appropriate educational content. A curated teacher-approved library/search with no open-web search is the proposed MVP approach.
- Long-term vision: digitize school registers/processes and provide education document, file, productivity and collaboration tools, eventually with explicit scoped connections between otherwise isolated organizations.
- Future intent: serve other education customers through SaaS subscriptions or potentially the whole application as a separate project; offering details remain undefined.
- Proposed or open: launch features beyond live/recorded classes, feature bundles and dependencies, feature-change authority, billing and removal rules, detailed workflows, architecture, delivery phases, exact permissions, role combinations beyond selected teacher-admins, and cross-organization membership. Parent-facing and teacher-facing functionality are feature examples, not commitments to separate applications.
- Confirmed technology decision: React frontend + Supabase backend for the MVP and initial release. Avoid Python now; future adoption is optional and unscheduled. Supabase provides PostgreSQL, Auth, storage and APIs/functions as appropriate; trusted logic stays server-side, with Edge Functions proposed.
- Near-zero initial investment and a free recorded-video pilot with a later paid path are design goals; production scale is not guaranteed free. Finer libraries, hosting and video providers remain recommendations. No implementation, purchase, deployment or delivery date has been approved.

The product specification is a living draft. Proposed requirements become confirmed only after an explicit product decision is recorded in the decision log.
# greatgenix
