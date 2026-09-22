import { expect, test, type Page } from "@playwright/test";
const uid = "00000000-0000-4000-8000-000000000001";
const orgId = "00000000-0000-4000-8000-000000000010";
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
async function fixture(page: Page, role = "teacher-admin") {
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
  const courses: Record<string, unknown>[] = [];
  const sessions: Record<string, unknown>[] = [];
  const assignments: Record<string, unknown>[] = [];
  let failNext = false;
  await page.route("https://test.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.postDataJSON();
    if (url.pathname.startsWith("/auth/v1/")) {
      if (url.pathname.endsWith("/logout"))
        return route.fulfill({ status: 204 });
      return route.fulfill({
        json: url.pathname.endsWith("/user")
          ? user
          : {
              access_token: token,
              refresh_token: "test-refresh",
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: "bearer",
              user,
            },
      });
    }
    if (url.pathname.includes("/rpc/")) {
      const name = url.pathname.split("/").pop();
      if (name === "my_access")
        return route.fulfill({
          json: {
            platform: false,
            orgs: [org],
            memberships: [{ orgId, role }],
          },
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
        if (a.type === "session") sessions.push(a.session);
        if (a.type === "assignment") assignments.push(a.assignment);
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
      table === "memberships"
        ? [
            {
              orgId,
              userId: uid,
              name: "Maya Rao",
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
    fail: () => {
      failNext = true;
    },
  };
}
async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email address").fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good to see you, Maya." }),
  ).toBeVisible();
}
test("sign in, create persistent course and assessment, and save organization branding", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page);
  await signIn(page);
  await expect(page.getByLabel("Demo role")).toHaveCount(0);
  await page.getByRole("link", { name: "My classroom", exact: true }).click();
  await page
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await page.getByLabel("Title / name").fill("The language of numbers");
  await page.getByLabel("Subject", { exact: true }).fill("Mathematics");
  await page.getByLabel("Grade", { exact: true }).fill("Grade 9");
  await page.getByLabel("Batch", { exact: true }).fill("Curiosity A");
  await page
    .getByLabel("Introduction")
    .fill("Discover the patterns behind everyday life.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "The language of numbers" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "The language of numbers" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Assessments", exact: true }).click();
  await page.getByRole("button", { name: "Create assessment" }).click();
  await page.getByLabel("Title / name").fill("A little algebra");
  await page
    .getByLabel("Prompt", { exact: true })
    .fill("Solve x + 2 = 4 and explain your answer.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little algebra" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Organization", exact: true }).click();
  await page.getByLabel("Primary color").fill("#673a87");
  await page.getByLabel("Font family").selectOption("serif");
  await page.getByLabel("Base font size").selectOption("18");
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await page.getByLabel("Tagline").fill("Every mind belongs.");
  await page.getByRole("button", { name: "Save appearance" }).click();
  await expect(page.getByRole("status").filter({hasText:"Organization appearance saved"})).toContainText(
    "Organization appearance saved",
  );
  await page.reload();
  await expect(page.getByLabel("Primary color")).toHaveValue("#673a87");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("font-size", "18px");
  await page.screenshot({
    path: "artifacts/organization-branding.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});
test("failed saves retain the form and never claim success", async ({
  page,
}) => {
  const f = await fixture(page);
  await signIn(page);
  await page.getByRole("link", { name: "My classroom", exact: true }).click();
  await page.getByRole("button", { name: "Create course" }).click();
  await page.getByLabel("Title / name").fill("Unsaved course");
  await page.getByLabel("Subject", { exact: true }).fill("Math");
  await page.getByLabel("Grade", { exact: true }).fill("9");
  await page.getByLabel("Batch", { exact: true }).fill("A");
  await page.getByLabel("Introduction").fill("Test");
  f.fail();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Not saved");
});
test("student navigation has no administrator controls, even via direct route", async ({
  page,
}) => {
  await fixture(page, "student");
  await signIn(page);
  await expect(
    page.getByRole("link", { name: "Organization", exact: true }),
  ).toHaveCount(0);
  await page.goto("/#/settings");
  await expect(
    page.getByRole("heading", {
      name: "Organization administrator access required",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Primary color")).toHaveCount(0);
});
test("mobile navigation opens without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await signIn(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Organization", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Organization settings" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/organization-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
