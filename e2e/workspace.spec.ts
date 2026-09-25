import { expect, test } from "@playwright/test";
import { fixture, signIn, uid, orgId } from "./workspace-fixture";
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
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Organization appearance saved" }),
  ).toContainText("Organization appearance saved");
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

test("lesson republishing and typed references survive reload", async ({
  page,
}) => {
  await fixture(page);
  await signIn(page);
  await page.getByRole("link", { name: "My classroom", exact: true }).click();
  await page
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await page.getByLabel("Title / name").fill("Algebra course");
  await page.getByLabel("Subject", { exact: true }).fill("Math");
  await page.getByLabel("Grade", { exact: true }).fill("Grade 9");
  await page.getByLabel("Batch", { exact: true }).fill("A");
  await page.getByLabel("Introduction").fill("Equations");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/#/recordings");
  await page.getByRole("button", { name: "Add a lesson" }).click();
  await page.getByLabel("Title / name").fill("Linear equations");
  await page
    .getByRole("dialog")
    .getByLabel("Material type")
    .selectOption("notes");
  await page
    .getByLabel("Lesson Notes & Content")
    .fill("Start by balancing both sides.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Move to draft" }).click();
  await page.getByRole("button", { name: "Send to review" }).click();
  await expect(
    page.getByRole("button", { name: "Publish lesson" }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /I confirm approval/ }).check();
  await page.getByRole("button", { name: "Publish lesson" }).click();
  await expect(page.getByText("Visible to enrolled learners")).toBeVisible();
  await page.getByRole("button", { name: "Add reference" }).click();
  await page.getByLabel("Reference title").fill("Revision notes");
  await page.getByLabel("Reference notes").fill("Practice every day.");
  await page.getByRole("button", { name: "Save reference" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Add reference" }).click();
  await page.getByLabel("Reference type").selectOption("link");
  await page.getByLabel("Reference title").fill("Practice website");
  await page.getByLabel("Reference URL").fill("https://example.com/practice");
  await page.getByRole("button", { name: "Save reference" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Add reference" }).click();
  await page.getByLabel("Reference type").selectOption("document");
  await page.getByLabel("Reference title").fill("Worksheet");
  await page.getByLabel("Upload reference document").setInputFiles({
    name: "worksheet.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Solve x + 2 = 4"),
  });
  await page.getByRole("button", { name: "Save reference" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".reference-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Revision notes Notes" }).click();
  await expect(page.getByText("Practice every day.")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.screenshot({
    path: "artifacts/lesson-detail.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Remove Practice website" }).click();
  await expect(page.locator(".reference-card")).toHaveCount(2);
  await page.goto("/#/recordings");
  await page.getByLabel("Filter material type").selectOption("video");
  await expect(
    page.getByRole("heading", { name: "No lessons found" }),
  ).toBeVisible();
  await page.getByLabel("Filter material type").selectOption("notes");
  await expect(
    page.getByRole("heading", { name: "Linear equations" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/lesson-library.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".recording-card")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("completed lesson labels, header counts and progress filters follow the current learner", async ({
  page,
}) => {
  const data = await fixture(page, "student");
  const courseId = "00000000-0000-4000-8000-000000000020";
  const lessonId = "00000000-0000-4000-8000-000000000030";
  data.courses.push({
    id: courseId,
    orgId,
    teacherId: uid,
    title: "Algebra",
    subject: "Math",
    grade: "Grade 9",
    batch: "A",
    description: "Equations",
    color: "sage",
  });
  data.enrollments.push({ orgId, courseId, studentId: uid });
  data.lessons.push({
    id: lessonId,
    orgId,
    courseId,
    title: "Linear equations",
    duration: 20,
    age: "13–15 years",
    subject: "Math",
    status: "published",
    type: "notes",
    content: "Balance both sides.",
    references: [],
  });
  // Another learner's completion must not mark this learner's lesson complete.
  data.completions.push({ orgId, lessonId, studentId: "another-learner" });
  await signIn(page);
  await page.goto("/#/recordings");
  await expect(page.getByLabel("Library summary")).toContainText("0 completed");
  await expect(page.locator(".recording-card .lesson-completed")).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: /Linear equations/ }).click();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.locator(".lesson-sidebar .lesson-completed")).toHaveText(
    "Completed",
  );
  await page.goto("/#/recordings");
  await page.reload();
  await expect(page.locator(".recording-card .lesson-completed")).toHaveText(
    "Completed",
  );
  await expect(page.getByLabel("Library summary")).toContainText("1 completed");
  await page.getByLabel("Filter lesson progress").selectOption("incomplete");
  await expect(
    page.getByRole("heading", { name: "No lessons found" }),
  ).toBeVisible();
  await page.getByLabel("Filter lesson progress").selectOption("completed");
  await page.screenshot({
    path: "artifacts/lesson-library-completed.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/lesson-library-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: /Linear equations/ }).click();
  await page.getByRole("button", { name: "Undo completion" }).click();
  await expect(page.locator(".lesson-sidebar .lesson-completed")).toHaveCount(
    0,
  );
  await page.goto("/#/recordings");
  await expect(page.getByLabel("Library summary")).toContainText("0 completed");
});

test("profile edits persist, update identity, support cancel and retain failed edits", async ({
  page,
}) => {
  const f = await fixture(page);
  await signIn(page);
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "My profile", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("link", { name: "My profile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My profile", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Display name", { exact: true }).fill("Maya Sharma");
  await page
    .getByLabel("Headline", { exact: true })
    .fill("Mathematics teacher");
  await page
    .getByLabel("About me", { exact: true })
    .fill("Helping learners find patterns in everyday life.");
  f.fail();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Profile could not be saved",
  );
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Maya Sharma",
  );
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit profile", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".profile-link")).toContainText("Maya Sharma");
  await page.reload();
  await expect(page.locator(".profile-summary")).toContainText(
    "Mathematics teacher",
  );
  await expect(page.locator(".profile-details")).toContainText(
    "Helping learners find patterns in everyday life.",
  );
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Display name", { exact: true }).fill("Discarded name");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".profile-summary h2")).toHaveText("Maya Sharma");
  await page.screenshot({
    path: "artifacts/profile-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/profile-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});

for (const [role, space, library] of [
  ["student", "YOUR LEARNING SPACE", "YOUR LEARNING COLLECTION"],
  ["teacher", "YOUR TEACHING SPACE", "YOUR TEACHING RESOURCES"],
  [
    "teacher-admin",
    "YOUR TEACHING & ADMIN SPACE",
    "YOUR ORGANIZATION’S LESSON LIBRARY",
  ],
]) {
  test(`${role} sees relevant content and can access their profile`, async ({
    page,
  }) => {
    await fixture(page, role);
    await signIn(page);
    await expect(page.locator(".section-eyebrow")).toHaveText(space);
    await page.goto("/#/recordings");
    await expect(page.locator(".section-eyebrow")).toHaveText(library);
    await page.goto("/#/profile");
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: /role/i })).toHaveCount(0);
    if (role !== "teacher-admin") {
      await page.goto("/#/settings");
      await expect(
        page.getByRole("heading", {
          name: "Organization administrator access required",
        }),
      ).toBeVisible();
    }
  });
}

test("platform administrator has platform wording and editable profile", async ({
  page,
}) => {
  await fixture(page, "super-admin");
  await page.goto("/");
  await page.getByLabel("Email address").fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".section-eyebrow")).toHaveText(
    "YOUR PLATFORM SPACE",
  );
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open profile menu" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("link", { name: "My profile", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit profile", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".profile-summary .badge")).toHaveText(
    "Platform administrator",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My profile", exact: true }),
  ).toBeVisible();
});

test("dual administrators switch between permitted workspaces and preserve profile context on reload", async ({
  page,
}) => {
  const f = await fixture(page, "teacher-admin", true);
  const foreign = {
    ...f.org,
    id: "00000000-0000-4000-8000-000000000011",
    name: "Other Academy",
    slug: "other-academy",
  };
  f.accessData.orgs.unshift(foreign);
  await signIn(page);
  await expect(page.locator(".section-eyebrow")).toHaveText(
    "YOUR TEACHING & ADMIN SPACE",
  );
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(
    page.getByRole("button", { name: /Willow Academy Teacher administrator/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .locator(".workspace-switcher")
      .getByRole("button", { name: /Other Academy/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "artifacts/workspace-switcher.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", {
      name: /Platform administration Platform administrator/,
    })
    .click();
  await expect(page.locator(".section-eyebrow")).toHaveText(
    "YOUR PLATFORM SPACE",
  );
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Organization", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("link", { name: "My profile", exact: true }).click();
  await page.reload();
  await expect(page.locator(".profile-summary .badge")).toHaveText(
    "Platform administrator",
  );
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page
    .getByRole("button", { name: /Willow Academy Teacher administrator/ })
    .click();
  await expect(page.locator(".section-eyebrow")).toHaveText(
    "YOUR TEACHING & ADMIN SPACE",
  );
  await page.reload();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Organization", exact: true }),
  ).toBeVisible();
  // Membership alone remains usable if the separately assigned platform role is removed.
  f.accessData.platform = false;
  await page.reload();
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(
    page.getByRole("button", {
      name: /Platform administration Platform administrator/,
    }),
  ).toHaveCount(0);
});

test("organization admins cannot gain platform access through a URL or saved preference", async ({
  page,
}) => {
  await fixture(page);
  await signIn(page);
  await page.evaluate(
    (userId) =>
      sessionStorage.setItem(
        `workspace-choice:${userId}`,
        JSON.stringify({ platform: true, orgId: "not-a-membership" }),
      ),
    uid,
  );
  await page.goto("/#/organizations");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Platform access is restricted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.locator(".workspace-switcher")).toHaveCount(0);
  await page.getByRole("link", { name: "My profile", exact: true }).click();
  await expect(page.locator(".profile-summary .badge")).toHaveText(
    "Teacher administrator",
  );
});

test("platform-only admins can manage an empty platform without an organization membership", async ({
  page,
}) => {
  const f = await fixture(page, "super-admin");
  f.accessData.orgs.length = 0;
  await page.goto("/");
  await page.getByLabel("Email address").fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No organizations yet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await expect(page.locator(".workspace-switcher")).toHaveCount(0);
});

for (const [role, label] of [
  ["student", "Student"],
  ["teacher", "Teacher"],
  ["teacher-admin", "Teacher administrator"],
  ["super-admin", "Platform administrator"],
]) {
  test(`${role} can edit and reload their personal profile through the header avatar`, async ({
    page,
  }) => {
    const f = await fixture(page, role);
    // Personal profile access does not depend on enabled learning features or enrollment.
    f.org.features = {
      live: false,
      recordings: false,
      attendance: false,
      assessments: false,
    };
    await page.goto("/");
    await page.getByLabel("Email address").fill("admin@example.com");
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("button", { name: "Open profile menu" }).click();
    await page.getByRole("link", { name: "My profile", exact: true }).click();
    await expect(page).toHaveURL(/#\/profile$/);
    await expect(page.locator(".profile-summary .badge")).toHaveText(label);
    await page
      .getByRole("button", { name: "Edit profile", exact: true })
      .click();
    await page
      .getByLabel("Display name", { exact: true })
      .fill(`${label} Name`);
    await page
      .getByLabel("Headline", { exact: true })
      .fill(role === "student" ? "Learning mathematics" : "My introduction");
    await page
      .getByLabel("About me", { exact: true })
      .fill("This is my personal profile.");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit profile", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".profile-summary h2")).toHaveText(
      `${label} Name`,
    );
    await expect(page.locator(".profile-details")).toContainText(
      "This is my personal profile.",
    );
    await expect(page.locator(".profile-summary .badge")).toHaveText(label);
    if (role === "student") {
      await page.screenshot({
        path: "artifacts/student-profile.png",
        fullPage: true,
        animations: "disabled",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Open profile menu" }).click();
      await page.getByRole("link", { name: "My profile", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Edit profile", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
