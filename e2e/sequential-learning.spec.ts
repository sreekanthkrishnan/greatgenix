import { expect, test, type Page } from "@playwright/test";
import { fixture, signIn, orgId, uid } from "./workspace-fixture";
const courseId = "00000000-0000-4000-8000-000000000700";
const baseCourse = {
  id: courseId,
  orgId,
  title: "Sequential algebra",
  subject: "Math",
  grade: "9",
  batch: "A",
  description: "One step at a time.",
  teacherId: uid,
  color: "sage",
  visibility: "public",
  pricing: "free",
  sequential: true,
};
const lesson = {
  id: "notes",
  orgId,
  courseId,
  title: "Start here",
  type: "notes",
  content: "Read these notes, then mark complete.",
  status: "published",
  duration: 1,
  subject: "Math",
};
async function setup(page: Page, role = "student") {
  const data = await fixture(page, role);
  data.courses.push({ ...baseCourse });
  data.lessons.push({ ...lesson });
  let enrolled = role !== "student";
  const completed = new Set<string>();
  let watched = 0;
  let eligible = false;
  let submissions = 0;
  const modules = [
    {
      id: "m1",
      title: "Foundations",
      items: [
        { id: "i1", kind: "notes", title: "Start here", lessonId: lesson.id },
        {
          id: "i2",
          kind: "assessment",
          title: "Try an assessment",
          assignmentId: "assessment",
        },
      ],
    },
    {
      id: "m2",
      title: "Practice together",
      items: [
        {
          id: "i3",
          kind: "video",
          title: "Watch the explanation",
          lessonId: "video",
          duration_seconds: 120,
        },
      ],
    },
  ];
  const ticks: { p_active: boolean; p_position: number }[] = [];
  await page.route("https://test.supabase.co/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const body = route.request().postDataJSON();
    if (name === "learning_entitlements")
      return route.fulfill({ json: [{ id: courseId, access: enrolled }] });
    if (name === "learning_outline") {
      let unlocked = enrolled;
      return route.fulfill({
        json: {
          access: enrolled,
          enrolled,
          modules: modules.map((m) => ({
            ...m,
            items: m.items.map((i) => {
              const state =
                role !== "student"
                  ? "available"
                  : completed.has(i.id)
                    ? "completed"
                    : unlocked
                      ? "available"
                      : "locked";
              if (!completed.has(i.id)) unlocked = false;
              return {
                ...i,
                state,
                completed: completed.has(i.id),
                watched,
                required: 60,
                eligible,
              };
            }),
          })),
        },
      });
    }
    if (name === "enroll_learning_course") {
      enrolled = true;
      data.enrollments.push({
        orgId,
        courseId,
        studentId: uid,
        source: "self",
      });
      return route.fulfill({ json: null });
    }
    if (name === "learning_item") {
      const item = modules
        .flatMap((m) => m.items)
        .find((i) => i.id === body.p_item)!;
      return route.fulfill({
        json: {
          ...item,
          lesson:
            item.id === "i1"
              ? lesson
              : item.id === "i3"
                ? {
                    ...lesson,
                    id: "video",
                    type: "video",
                    url: "https://media.test/lesson.mp4",
                  }
                : null,
          assignment:
            item.id === "i2"
              ? {
                  id: "assessment",
                  orgId,
                  courseId,
                  title: item.title,
                  prompt: "Explain your reasoning.",
                  points: 10,
                }
              : null,
          submission: submissions
            ? { id: "submitted", published: false }
            : null,
        },
      });
    }
    if (name === "complete_learning_item") {
      completed.add(body.p_item);
      return route.fulfill({ json: null });
    }
    if (name === "apply_action" && body.p_action.type === "submit") {
      completed.add("i2");
      submissions++;
      return route.fulfill({ json: null });
    }
    if (name === "start_learning_playback")
      return route.fulfill({ json: "test-playback-session" });
    if (name === "learning_playback_tick") {
      ticks.push(body);
      return route.fulfill({ json: { watched, eligible } });
    }
    if (name === "learning_roster") return route.fulfill({ json: [] });
    return route.fallback();
  });
  return {
    data,
    completed,
    ticks,
    enroll: () => {
      enrolled = true;
      data.enrollments.push({
        orgId,
        courseId,
        studentId: uid,
        source: "self",
      });
    },
    credit: (seconds: number) => {
      watched = seconds;
      eligible = seconds >= 60;
    },
  };
}
test("student enrolls, unlocks the next module by submitting without grading, and resumes after reload", async ({
  page,
}) => {
  await setup(page);
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await expect(
    page.getByRole("button", { name: /Start here Notes/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Enroll and start learning" }).click();
  await page.getByRole("button", { name: "Resume: Start here" }).click();
  await expect(
    page.getByText("Read these notes, then mark complete."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark as complete", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Watch the explanation Video lesson/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resume: Try an assessment" }).click();
  await page
    .getByLabel("Your answer")
    .fill("My answer need not pass to unlock the next item.");
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByText(/Evaluation: Pending evaluation/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume: Watch the explanation" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("2 of 3 items complete")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume: Watch the explanation" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/sequential-learning.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/sequential-learning-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("video completion stays disabled while idle and requires an explicit click after server eligibility", async ({
  page,
}) => {
  const f = await setup(page);
  f.enroll();
  f.completed.add("i1");
  f.completed.add("i2");
  await page.route("https://media.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "video/mp4",
      body: Buffer.from([]),
    }),
  );
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await page
    .getByRole("button", { name: "Resume: Watch the explanation" })
    .click();
  const button = page.getByRole("button", {
    name: "Mark as complete",
    exact: true,
  });
  await expect(button).toBeDisabled();
  await page.getByRole("button", { name: "Open video", exact: true }).click();
  await expect.poll(() => f.ticks.length).toBeGreaterThan(0);
  expect(f.ticks.every((t) => !t.p_active && t.p_position === 0)).toBe(true);
  await expect(button).toBeDisabled();
  // Server timing and forgery checks are exercised in PGlite; here test the UI's eligibility boundary.
  f.credit(59);
  await expect(page.getByText(/Active playback: 59 \/ 60/)).toBeVisible();
  await expect(button).toBeDisabled();
  f.credit(60);
  await expect(button).toBeEnabled();
  expect(f.completed.has("i3")).toBe(false);
  await button.click();
  await expect(
    page.getByText("3 of 3 items complete · Course completed"),
  ).toBeVisible();
});
test("teacher builds and reorders modules, then explicitly activates the path", async ({
  page,
}) => {
  const f = await fixture(page, "teacher");
  f.courses.push({ ...baseCourse, sequential: false });
  f.lessons.push(
    { ...lesson, id: "lesson1" },
    { ...lesson, id: "lesson2", title: "Second notes" },
  );
  let saved: any = null;
  await page.route(
    "https://test.supabase.co/rest/v1/rpc/save_learning_structure",
    async (route) => {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: null });
    },
  );
  await signIn(page);
  await page.goto(`/#/courses/${courseId}/edit`);
  await page.getByRole("button", { name: "Add module", exact: true }).click();
  await page.getByLabel("Module title", { exact: true }).fill("First module");
  await page
    .getByRole("button", { name: "Add learning item", exact: true })
    .click();
  await page.getByLabel("Item title", { exact: true }).fill("Read first");
  await page
    .getByRole("combobox", { name: "Published lesson", exact: true })
    .selectOption("lesson1");
  await page.getByRole("button", { name: "Add module", exact: true }).click();
  await page
    .getByLabel("Module title", { exact: true })
    .nth(1)
    .fill("Second module");
  await page
    .getByRole("button", { name: "Add learning item", exact: true })
    .nth(1)
    .click();
  await page
    .getByLabel("Item title", { exact: true })
    .nth(1)
    .fill("Read second");
  await page
    .getByRole("combobox", { name: "Published lesson", exact: true })
    .nth(1)
    .selectOption("lesson2");
  await page
    .getByRole("button", { name: "Move module up", exact: true })
    .nth(1)
    .click();
  await page
    .getByRole("checkbox", { name: /Activate sequential learning/ })
    .check();
  await page
    .getByRole("button", { name: "Save learning path", exact: true })
    .click();
  await expect(
    page.getByText("Sequential learning saved and active."),
  ).toBeVisible();
  expect(saved.p_modules.map((m: any) => m.title)).toEqual([
    "Second module",
    "First module",
  ]);
  expect(saved.p_activate).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/sequential-learning-editor-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("organization administrator confirms and revokes an offline student subscription", async ({
  page,
}) => {
  const f = await fixture(page, "teacher-admin");
  f.courses.push({
    ...baseCourse,
    pricing: "paid",
    coursePrice: 500,
    sequential: false,
  });
  const subscriptions: any[] = [];
  let saved: any;
  await page.route("https://test.supabase.co/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const body = route.request().postDataJSON();
    if (name === "course_access_students")
      return route.fulfill({
        json: [
          { id: "student", name: "Learner One", email: "learner@example.com" },
        ],
      });
    if (name === "student_subscription_records")
      return route.fulfill({ json: subscriptions });
    if (name === "save_student_subscription") {
      saved = body;
      if (body.p_revoke) subscriptions[0].revoked = true;
      else
        subscriptions.push({
          id: "subscription",
          studentId: body.p_student,
          ends_at: body.p_end,
          starts_at: new Date().toISOString(),
          revoked: false,
        });
      return route.fulfill({ json: null });
    }
    return route.fallback();
  });
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await page
    .getByRole("combobox", { name: "Student", exact: true })
    .selectOption("student");
  await page
    .getByLabel("Subscription expires at")
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  await page.getByLabel("Verified offline payment reference").fill("BANK-123");
  await page
    .getByRole("button", { name: "Payment confirmed — activate subscription" })
    .click();
  await expect(page.getByText(/Active · Expires/)).toBeVisible();
  expect(saved.p_reference).toBe("BANK-123");
  expect(saved.p_student).toBe("student");
  await page.getByRole("button", { name: "Revoke subscription" }).click();
  await expect(page.getByText(/Revoked · Expires/)).toBeVisible();
});

test("teacher records participation without grading, then awards zero marks separately", async ({
  page,
}) => {
  const f = await fixture(page, "teacher");
  f.courses.push({ ...baseCourse });
  let completed = false;
  let score: number | null = null;
  const calls: any[] = [];
  await page.route("https://test.supabase.co/rest/v1/rpc/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const body = route.request().postDataJSON();
    if (name === "learning_outline")
      return route.fulfill({
        json: {
          access: true,
          enrolled: false,
          modules: [
            {
              id: "module",
              title: "Practice module",
              items: [
                {
                  id: "practice",
                  title: "A little practice",
                  kind: "practice",
                  state: "available",
                },
              ],
            },
          ],
        },
      });
    if (name === "learning_item")
      return route.fulfill({
        json: {
          id: "practice",
          kind: "practice",
          title: "A little practice",
          content: "Try the activity.",
        },
      });
    if (name === "learning_roster")
      return route.fulfill({
        json: [
          {
            id: "student",
            name: "Learner One",
            items: [
              {
                id: "practice",
                completed,
                unlocked: true,
                score,
                evaluated_at: score === null ? null : new Date().toISOString(),
              },
            ],
          },
        ],
      });
    if (name === "record_learning_participation") {
      calls.push(body);
      completed = true;
      score = body.p_score;
      return route.fulfill({ json: null });
    }
    return route.fallback();
  });
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await page.getByRole("button", { name: "Resume: A little practice" }).click();
  await page
    .getByRole("combobox", { name: "Student", exact: true })
    .selectOption("student");
  await page
    .getByRole("button", { name: "Record participation / save evaluation" })
    .click();
  await expect(
    page.getByText("Completion: Completed. Evaluation: Pending evaluation."),
  ).toBeVisible();
  expect(calls[0].p_score).toBeNull();
  await page.getByLabel("Marks (optional)").fill("0");
  await page
    .getByRole("button", { name: "Record participation / save evaluation" })
    .click();
  await expect(
    page.getByText(/Completion: Completed. Evaluation: 0 marks/),
  ).toBeVisible();
});

test("playback telemetry distinguishes playing, seeking and a hidden document", async ({
  page,
}) => {
  const f = await setup(page);
  f.enroll();
  f.completed.add("i1");
  f.completed.add("i2");
  await page.route("https://media.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "video/mp4",
      body: Buffer.from([]),
    }),
  );
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await page
    .getByRole("button", { name: "Resume: Watch the explanation" })
    .click();
  await page.getByRole("button", { name: "Open video", exact: true }).click();
  const video = page.locator("video");
  await video.scrollIntoViewIfNeeded();
  // Drive native media events deterministically; database tests separately validate the received evidence.
  await video.evaluate((v: HTMLVideoElement) => {
    Object.defineProperty(v, "paused", {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(v, "readyState", {
      configurable: true,
      get: () => 4,
    });
    Object.defineProperty(v, "currentTime", {
      configurable: true,
      value: 1,
      writable: true,
    });
    v.dispatchEvent(new Event("playing"));
  });
  await expect
    .poll(() => f.ticks.some((t) => t.p_active && t.p_position === 1))
    .toBe(true);
  await video.evaluate((v: HTMLVideoElement) => {
    Object.defineProperty(v, "seeking", {
      configurable: true,
      get: () => true,
    });
    v.currentTime = 40;
    v.dispatchEvent(new Event("seeking"));
  });
  await expect
    .poll(() => f.ticks.some((t) => !t.p_active && t.p_position === 40))
    .toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => f.ticks.at(-1)?.p_active).toBe(false);
  await expect(
    page.getByRole("button", { name: "Mark as complete", exact: true }),
  ).toBeDisabled();
});
