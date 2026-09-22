# Education SaaS · Great Genix

A React + Supabase education application using the approved Great Genix interface. Organizations have independent memberships, courses, learning records, enabled features, and white-label branding.

## Run

```sh
npm ci
cp .env.example .env.local
# Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local
npm run dev
```

The default route uses Supabase authentication. Missing configuration shows a setup screen; it never silently switches to fictional data. The original approved prototype remains available at `/?demo=1`, with clearly labeled browser-only data and persona controls.

## Backend setup

Use a dedicated Supabase project. The browser URL and public key connect the frontend; applying migrations and deploying functions additionally requires your authenticated Supabase CLI or Dashboard access.

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase secrets set --env-file supabase/.env.local
npx supabase functions deploy
```

Copy `supabase/.env.example` to `supabase/.env.local` and configure Daily/Mux credentials there. Do not place server secrets in any `VITE_` variable. For local Supabase, start Docker and run `npm run supabase:start`; use `npm run supabase:status` to get local connection values. Local confirmation mail appears in Inbucket at port 54324.

In Supabase Auth, set the Site URL and allowed redirect URLs to your actual frontend origin (including paths/query redirects for invitation acceptance and recovery). Enable email confirmation and configure SMTP for hosted signup/recovery mail. Use `docs/implementation.md` for the complete deployment and pilot checklist.

## First organization

1. Create and confirm your account, then sign in.
2. Create an organization with its own name and unique handle.
3. Open **Organization** to save its logo, primary/accent colors, font family, font size, theme, and tagline.
4. Create invitation links for teachers, students, or additional teacher-admins. Copy and share links with the intended recipients; invitation emails are not sent automatically.
5. Create courses and assign teachers. Enroll existing learners from the course roster, or invite a new learner directly into that course.
6. Schedule live classes; create recording drafts, upload videos, review, and publish.
7. Enable assessments and attendance if needed. Create assignments, submit/review work, and record session attendance.

Organization links (`/?org=your-handle`) show organization branding on sign-in and select that organization after authentication if the user belongs to it. Public branding does not grant membership. Custom domains/DNS and customer-specific hosting remain deployment configuration, not an automatically provisioned feature.

## Structure

```text
src/app/                     routing, auth/query/org providers, layout
src/features/                auth, organizations, feature-config, memberships,
                             courses, live-classes, recorded-classes,
                             assignments, attendance, reports
src/shared/                  UI, hooks, domain types, Supabase client, adapters
src/styles/                  responsive styles and organization theme tokens
src/demo/                    isolated original prototype
supabase/migrations/         relational schema, RLS, trusted RPCs
supabase/functions/          Daily/Mux and feature-change Edge Functions
supabase/tests/              executable PostgreSQL isolation tests
supabase/seed.sql             intentionally contains no real accounts
supabase/config.toml          local development and function configuration
docs/                        product documents and implementation notes
```

The workspace root is the application root; an extra nested `edu-saas` directory is unnecessary.

## Validation

```sh
npm run build
npm test
npm run test:e2e
npx --yes deno check supabase/functions/*/index.ts
```

Database tests execute the actual migrations and SQL authorization rules in PGlite (PostgreSQL compiled to WASM) with Supabase-style test auth roles. They do not mock SQL. Browser tests use mocked Supabase HTTP responses to check the React flows, error handling, persistence reload behavior, restricted navigation, and mobile layout; they do not substitute for hosted Supabase integration tests. Browser tests use installed Google Chrome.

No hosted project or paid video provider has been provisioned by this repository. Production deployment, real auth email delivery, and actual Daily/Mux calls must be verified against configured accounts before a pilot.
