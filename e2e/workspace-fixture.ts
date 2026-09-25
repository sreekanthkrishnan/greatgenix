import { expect, type Page } from "@playwright/test";
export const uid = "00000000-0000-4000-8000-000000000001";
export const orgId = "00000000-0000-4000-8000-000000000010";
const user = {
  id: uid,
  aud: "authenticated",
  role: "authenticated",
  email: "admin@example.com",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: { name: "Maya Rao" },
  created_at: new Date().toISOString(),
};
const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })).toString("base64url")}.test`;
export async function fixture(
  page: Page,
  role = "teacher-admin",
  platformAccess = role === "super-admin",
) {
  const account = { ...user, user_metadata: { ...user.user_metadata } };
  const org = {
    id: orgId,
    name: "Willow Academy",
    slug: "willow-academy",
    active: true,
    features: {
      live: true,
      recordings: true,
      attendance: true,
      assessments: true,
    },
    branding: {
      logoUrl: "",
      primaryColor: "#365840",
      accentColor: "#dce6bf",
      fontFamily: "humanist",
      fontSize: 16,
      theme: "light",
      tagline: "Room to grow.",
    },
  };
  const accessData = {
    platform: platformAccess,
    orgs: [org],
    memberships: role === "super-admin" ? [] : [{ orgId, role }],
  };
  const courses: Record<string, unknown>[] = [];
  const sessions: Record<string, unknown>[] = [];
  const lessons: Record<string, any>[] = [];
  const assignments: Record<string, unknown>[] = [];
  const enrollments: Record<string, unknown>[] = [];
  const completions: { orgId: string; lessonId: string; studentId: string }[] =
    [];
  let failNext = false;
  await page.route("https://test.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.postDataJSON();
    if (url.pathname.startsWith("/auth/v1/")) {
      if (url.pathname.endsWith("/user") && req.method() === "PUT") {
        if (failNext) {
          failNext = false;
          return route.fulfill({
            status: 400,
            json: {
              msg: "Profile could not be saved",
              code: "validation_failed",
            },
          });
        }
        account.user_metadata = { ...account.user_metadata, ...body.data };
        return route.fulfill({ json: account });
      }
      if (url.pathname.endsWith("/logout"))
        return route.fulfill({ status: 204 });
      return route.fulfill({
        json: url.pathname.endsWith("/user")
          ? account
          : {
              access_token: token,
              refresh_token: "test-refresh",
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: "bearer",
              user: account,
            },
      });
    }
    if (url.pathname.includes("/rpc/")) {
      const name = url.pathname.split("/").pop();
      if (name === "my_access")
        return route.fulfill({
          json: accessData,
        });
      if (name === "apply_action") {
        if (failNext) {
          failNext = false;
          return route.fulfill({
            status: 403,
            json: { message: "Organization permission denied", code: "42501" },
          });
        }
        const a = body.p_action;
        if (a.type === "branding") org.branding = a.branding;
        if (a.type === "rename") org.name = a.name;
        if (a.type === "course") courses.push(a.course);
        if (a.type === "course-access")
          Object.assign(courses.find((c) => c.id === a.id) || {}, a);
        if (a.type === "enroll") {
          const i = enrollments.findIndex(
            (e) => e.courseId === a.courseId && e.studentId === a.studentId,
          );
          if (!a.enrolled && i >= 0) enrollments.splice(i, 1);
          if (a.enrolled && i < 0)
            enrollments.push({
              orgId,
              courseId: a.courseId,
              studentId: a.studentId,
            });
        }
        if (a.type === "session") sessions.push(a.session);
        if (a.type === "assignment") assignments.push(a.assignment);
        if (a.type === "lesson")
          lessons.push({ ...a.lesson, mediaStatus: "pending", references: [] });
        const lesson = lessons.find((l) => l.id === a.id);
        if (a.type === "complete" && lesson) {
          const index = completions.findIndex(
            (c) => c.lessonId === a.id && c.studentId === uid,
          );
          if (index >= 0) completions.splice(index, 1);
          else completions.push({ orgId, lessonId: a.id, studentId: uid });
        }
        if (a.type === "lesson-preview" && lesson)
          lesson.isFreePreview = a.isFreePreview;
        if (a.type === "lesson-status" && lesson) lesson.status = a.status;
        if (a.type === "lesson-reference" && lesson)
          lesson.references.push(a.reference);
        if (a.type === "remove-lesson-reference" && lesson)
          lesson.references = lesson.references.filter(
            (r: { id: string }) => r.id !== a.referenceId,
          );
        return route.fulfill({ json: null });
      }
      if (name === "organization_brand")
        return route.fulfill({
          json: { name: org.name, branding: org.branding },
        });
      if (name === "create_invitation")
        return route.fulfill({ json: "safe-fixture-invite-token" });
    }
    const table = url.pathname.split("/").pop();
    const data =
      table === "enrollments"
        ? enrollments
        : table === "completions"
          ? completions
          : table === "lessons"
            ? lessons
            : table === "memberships"
              ? [
                  {
                    orgId,
                    userId: uid,
                    name: account.user_metadata.name,
                    email: "admin@example.com",
                    role,
                    active: true,
                  },
                ]
              : table === "courses"
                ? courses
                : table === "sessions"
                  ? sessions
                  : table === "assignments"
                    ? assignments
                    : [];
    return route.fulfill({ json: data });
  });
  return {
    org,
    accessData,
    courses,
    lessons,
    enrollments,
    completions,
    fail: () => {
      failNext = true;
    },
  };
}
export async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email address").fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good to see you, Maya." }),
  ).toBeVisible();
}
