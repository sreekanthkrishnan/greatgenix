import { expect, test } from "@playwright/test";
import { fixture, signIn, uid, orgId } from "./workspace-fixture";
const thumbnail =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=";
const thumbnailFile = {
  name: "cover.png",
  mimeType: "image/png",
  buffer: Buffer.from(thumbnail.split(",")[1], "base64"),
};
const courseId = "00000000-0000-4000-8000-000000000020";
const studentId = "00000000-0000-4000-8000-000000000003";
const paidCourse = {
  id: courseId,
  orgId,
  title: "Practical algebra",
  subject: "Math",
  grade: "9",
  batch: "A",
  description: "Learn algebra",
  teacherId: uid,
  color: "sage",
  visibility: "public",
  pricing: "paid",
  coursePrice: 5000,
  discountedPrice: 3999,
};
const lesson = {
  id: "00000000-0000-4000-8000-000000000030",
  orgId,
  courseId,
  title: "First look",
  subject: "Math",
  age: "13–15",
  duration: 10,
  status: "published",
  type: "notes",
  content: "Try a simple equation.",
  isFreePreview: true,
};

test("teacher creates a paid public course and marks a lesson as a free preview", async ({
  page,
}) => {
  const data = await fixture(page, "teacher");
  await signIn(page);
  await page.goto("/#/courses");
  await page
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await page.getByLabel("Title / name").fill("Practical algebra");
  await page.getByLabel("Subject", { exact: true }).fill("Math");
  await page.getByLabel("Grade", { exact: true }).fill("9");
  await page.getByLabel("Batch", { exact: true }).fill("A");
  await page.getByLabel("Introduction").fill("Learn algebra");
  await page
    .getByLabel("Course thumbnail (optional)", { exact: true })
    .setInputFiles(thumbnailFile);
  await expect(
    page.getByRole("button", { name: "Remove thumbnail" }),
  ).toBeVisible();
  await expect(page.getByLabel("Assigned teacher")).toHaveCount(0);
  await page.getByRole("radio", { name: "Public · Paid", exact: true }).check();
  await expect(page.getByLabel("Manual payment instructions")).toHaveCount(0);
  for (const invalid of ["", "0", "-1"]) {
    await page.getByLabel("Course Price", { exact: true }).fill(invalid);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect(data.courses).toHaveLength(0);
    expect(
      await page
        .getByLabel("Course Price", { exact: true })
        .evaluate((input: HTMLInputElement) => input.checkValidity()),
    ).toBe(false);
  }
  await page.getByLabel("Course Price", { exact: true }).fill("5000");
  await page.getByLabel("Discounted Price", { exact: true }).fill("5000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Discounted Price must be less than Course Price.",
  );
  await page.getByLabel("Discounted Price", { exact: true }).fill("3999");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(data.courses[0]).toMatchObject({
    visibility: "public",
    pricing: "paid",
    coursePrice: 5000,
    discountedPrice: 3999,
    thumbnailUrl: thumbnail,
    teacherId: uid,
  });
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Practical algebra" }) })
    .click();
  await page.getByRole("button", { name: "Add recording" }).click();
  await page.getByLabel("Title / name").fill("First look");
  await page.getByLabel("Material type").selectOption("notes");
  await page
    .getByLabel("Lesson Notes & Content")
    .fill("Try a simple equation.");
  await page.getByLabel("Free preview in paid public courses").check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "First look" })).toBeVisible();
  expect(data.lessons[0].isFreePreview).toBe(true);
  await page.getByLabel("Free preview in paid public courses").click();
  await expect(
    page.getByLabel("Free preview in paid public courses"),
  ).not.toBeChecked();
});

test("student sees previews, handles coupon errors, and unlocks full course access", async ({
  page,
}) => {
  const data = await fixture(page, "student");
  data.courses.push(paidCourse);
  data.lessons.push(lesson, {
    ...lesson,
    id: "00000000-0000-4000-8000-000000000031",
    title: "Paid lesson",
    isFreePreview: false,
  });
  await page.route(
    "**/rest/v1/rpc/redeem_course_access_coupon",
    async (route) => {
      if (route.request().postDataJSON().p_token !== "VALID-COUPON")
        return route.fulfill({
          status: 403,
          json: { message: "Coupon is invalid or belongs to another student" },
        });
      data.enrollments.push({ orgId, courseId, studentId: uid });
      return route.fulfill({ json: null });
    },
  );
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await expect(
    page.getByRole("heading", {
      name: "Preview this course before purchasing",
    }),
  ).toBeVisible();
  await expect(page.locator(".notice")).toContainText(
    "Please contact your teacher to complete the payment and receive your access coupon.",
  );
  await expect(page.locator(".course-price-values del")).toContainText("5,000");
  await expect(page.locator(".course-price-values strong")).toContainText(
    "3,999",
  );
  await expect(page.getByRole("link", { name: /First look/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Paid lesson/ })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Class schedule" })).toHaveCount(
    0,
  );
  await page.getByLabel("Your course access coupon").fill("WRONG");
  await page.getByRole("button", { name: "Redeem access coupon" }).click();
  await expect(page.getByRole("alert")).toContainText("invalid");
  await page.getByLabel("Your course access coupon").fill("VALID-COUPON");
  await page.getByRole("button", { name: "Redeem access coupon" }).click();
  await expect(
    page.getByRole("heading", { name: "You have full course access" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Paid lesson/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Class schedule" })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "You have full course access" }),
  ).toBeVisible();
});

test("teacher issues and revokes coupons and directly grants access to organization students", async ({
  page,
}) => {
  const data = await fixture(page, "teacher");
  data.courses.push(paidCourse);
  const coupons: any[] = [];
  await page.route("**/rest/v1/rpc/course_access_students", (route) =>
    route.fulfill({
      json: [{ id: studentId, name: "Sam Student", email: "sam@example.com" }],
    }),
  );
  await page.route("**/rest/v1/rpc/list_course_access_coupons", (route) =>
    route.fulfill({ json: coupons }),
  );
  await page.route("**/rest/v1/rpc/create_course_access_coupon", (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      p_org: orgId,
      p_course: courseId,
      p_student: studentId,
    });
    coupons.push({
      id: "coupon-1",
      studentId,
      expiresAt: "2099-01-01",
      redeemedAt: null,
      revoked: false,
    });
    return route.fulfill({ json: "STUDENT-BOUND-COUPON" });
  });
  await page.route("**/rest/v1/rpc/revoke_course_access_coupon", (route) => {
    coupons[0].revoked = true;
    return route.fulfill({ json: null });
  });
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await page.getByRole("tab", { name: "Class roster" }).click();
  await page
    .getByRole("button", { name: "Payment confirmed — create coupon" })
    .click();
  await expect(page.getByLabel("Access coupon for Sam Student")).toHaveValue(
    "STUDENT-BOUND-COUPON",
  );
  await page.getByRole("button", { name: "Revoke coupon" }).click();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Payment confirmed — grant access" })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove from course" }),
  ).toBeVisible();
  expect(data.enrollments).toContainEqual({ orgId, courseId, studentId });
  await page.getByRole("button", { name: "Remove from course" }).click();
  await expect(
    page.getByRole("button", { name: "Payment confirmed — grant access" }),
  ).toBeVisible();
});

test("catalog filters public courses and keeps locked courses out of My courses", async ({
  page,
}, testInfo) => {
  const data = await fixture(page, "student");
  data.courses.push(
    paidCourse,
    {
      ...paidCourse,
      id: "free-course",
      title: "Creative thinking",
      subject: "Design",
      pricing: "free",
    },
    {
      ...paidCourse,
      id: "private-course",
      title: "Private workshop",
      visibility: "private",
      pricing: "free",
    },
  );
  data.lessons.push(lesson);
  await signIn(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Explore courses", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Explore courses", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Practical algebra", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Private workshop", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("catalog-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Free courses", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Creative thinking", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Practical algebra", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Paid courses", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Practical algebra", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search catalog").fill("no such subject");
  await expect(
    page.getByRole("heading", { name: "No matching courses" }),
  ).toBeVisible();
  await page.getByLabel("Search catalog").fill("");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("catalog-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: "My courses", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Practical algebra", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Creative thinking", exact: true }),
  ).toBeVisible();
});

test("access option cards save course settings and fit a narrow screen", async ({
  page,
}, testInfo) => {
  const data = await fixture(page, "teacher");
  data.courses.push({ ...paidCourse });
  await signIn(page);
  await page.goto(`/#/courses/${courseId}/edit`);
  await expect(
    page.getByRole("radio", { name: "Public · Paid", exact: true }),
  ).toBeChecked();
  await page.screenshot({
    path: testInfo.outputPath("access-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("radio", { name: "Public · Free", exact: true }).check();
  await expect(page.getByLabel("Manual payment instructions")).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => data.courses[0].pricing).toBe("free");
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Public · Free", exact: true }),
  ).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("radio", { name: "Public · Paid", exact: true }).check();
  await expect(page.getByLabel("Course Price", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Discounted Price", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("access-mobile.png"),
    fullPage: true,
  });
});

test("teacher edits saved prices and clears a discount", async ({ page }) => {
  const data = await fixture(page, "teacher");
  data.courses.push({ ...paidCourse });
  await signIn(page);
  await page.goto(`/#/courses/${courseId}/edit`);
  const price = page.getByLabel("Course Price", { exact: true });
  const discount = page.getByLabel("Discounted Price", { exact: true });
  await expect(price).toHaveValue("5000");
  await expect(discount).toHaveValue("3999");
  await price.fill("3000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Discounted Price must be less than Course Price.",
  );
  expect(data.courses[0].coursePrice).toBe(5000);
  await discount.fill("2499.50");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => data.courses[0].discountedPrice).toBe(2499.5);
  await page.reload();
  await expect(price).toHaveValue("3000");
  await expect(discount).toHaveValue("2499.5");
  await discount.fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => data.courses[0].discountedPrice).toBeNull();
  await page.reload();
  await expect(discount).toHaveValue("");
});

for (const [name, price, discount] of [
  ["no discount", 5000, null],
  ["invalid discount", 5000, 6000],
  ["missing price", null, null],
  ["invalid price", -1, 10],
] as const) {
  test(`student pricing handles ${name} on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const data = await fixture(page, "student");
    data.courses.push({
      ...paidCourse,
      coursePrice: price,
      discountedPrice: discount,
    });
    await signIn(page);
    await page.goto(`/#/courses/${courseId}`);
    await expect(
      page.getByText("Payment Information", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".course-price-values del")).toHaveCount(0);
    if (price != null && price > 0)
      await expect(page.locator(".course-price-values strong")).toContainText(
        "5,000",
      );
    else
      await expect(
        page.getByText("Contact your teacher for the course price.", {
          exact: true,
        }),
      ).toBeVisible();
    await expect(page.getByLabel("Your course access coupon")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("teacher replaces and removes a thumbnail and rejects invalid uploads", async ({
  page,
}) => {
  const data = await fixture(page, "teacher");
  data.courses.push({ ...paidCourse });
  await signIn(page);
  await page.goto(`/#/courses/${courseId}/edit`);
  const upload = page.getByLabel("Course thumbnail (optional)", {
    exact: true,
  });
  await upload.setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg />"),
  });
  await expect(page.getByRole("alert")).toContainText("PNG, JPEG or WebP");
  await upload.setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(200001),
  });
  await expect(page.getByRole("alert")).toContainText("under 200 KB");
  await upload.setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("broken image"),
  });
  await expect(page.getByRole("alert")).toContainText("not a valid image");
  await upload.setInputFiles(thumbnailFile);
  await expect(page.locator(".course-thumbnail-editor img")).toHaveAttribute(
    "src",
    thumbnail,
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => data.courses[0].thumbnailUrl).toBe(thumbnail);
  await page.reload();
  await expect(page.locator(".course-thumbnail-editor img")).toHaveAttribute(
    "src",
    thumbnail,
  );
  await page.getByRole("link", { name: "My courses", exact: true }).click();
  await expect(
    page.locator(".course-card .course-thumbnail img"),
  ).toHaveAttribute("src", thumbnail);
  await expect(
    page.locator(".course-card .course-price-values del"),
  ).toContainText("5,000");
  await expect(
    page.locator(".course-card .course-price-values strong"),
  ).toContainText("3,999");
  await page.goto(`/#/courses/${courseId}/edit`);
  await page.getByRole("button", { name: "Remove thumbnail" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => data.courses[0].thumbnailUrl).toBeNull();
  await page.reload();
  await expect(
    page.locator(".course-thumbnail-editor > .course-thumbnail .course-art"),
  ).toBeVisible();
});

test("catalog shows prices and falls back to artwork for a broken thumbnail", async ({
  page,
}) => {
  const data = await fixture(page, "student");
  data.courses.push({
    ...paidCourse,
    thumbnailUrl: "data:image/png;base64,AAAA",
  });
  await signIn(page);
  await page.goto("/#/explore");
  await expect(
    page.locator(".course-card .course-thumbnail .course-art"),
  ).toBeVisible();
  await expect(page.locator(".course-card .course-thumbnail img")).toHaveCount(
    0,
  );
  await expect(
    page.locator(".course-card .course-price-values del"),
  ).toContainText("5,000");
  await expect(
    page.locator(".course-card .course-price-values strong"),
  ).toContainText("3,999");
});

test("optional metadata and built-in thumbnail choices save and edit correctly", async ({
  page,
}, testInfo) => {
  const data = await fixture(page, "teacher");
  await signIn(page);
  await page.goto("/#/courses");
  await page
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await page.getByLabel("Title / name").fill("A fresh start");
  await page.getByLabel("Introduction").fill("Learning for everyone");
  await page.getByRole("button", { name: "Orbit", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Orbit", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(data.courses[0]).toMatchObject({
    subject: "",
    grade: "",
    batch: "",
    color: "peach",
    thumbnailUrl: null,
  });
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "A fresh start" }) })
    .click();
  await page.getByRole("link", { name: "Edit course", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Orbit", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Subject", { exact: true }).fill("Math");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => data.courses[0].color).toBe("lavender");
  await page.reload();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue("Math");
  await expect(
    page.getByRole("button", { name: "Library", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Subject", { exact: true }).fill("");
  await page
    .getByLabel("Course thumbnail (optional)", { exact: true })
    .setInputFiles(thumbnailFile);
  await expect(
    page.getByRole("button", { name: "Remove thumbnail" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Garden", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remove thumbnail" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("thumbnail-options-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => data.courses[0].subject).toBe("");
  expect(data.courses[0]).toMatchObject({ color: "sage", thumbnailUrl: null });
});

test("course details and editing have separate routes", async ({ page }) => {
  const data = await fixture(page, "teacher");
  data.courses.push({ ...paidCourse });
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await expect(
    page.getByRole("heading", { name: paidCourse.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Course Price", { exact: true })).toHaveCount(0);
  await expect(
    page.getByLabel("Course thumbnail (optional)", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Delete course", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Edit course", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/courses/${courseId}/edit$`));
  await expect(
    page.getByRole("heading", { name: "Edit course", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Course views" })).toHaveCount(
    0,
  );
  await page.getByLabel("Course Price", { exact: true }).fill("6000");
  await page.getByRole("link", { name: "Back to course", exact: true }).click();
  expect(data.courses[0].coursePrice).toBe(5000);
  await page.getByRole("link", { name: "Edit course", exact: true }).click();
  await expect(page.getByLabel("Course Price", { exact: true })).toHaveValue(
    "5000",
  );
  await page.getByLabel("Course Price", { exact: true }).fill("6000");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => data.courses[0].coursePrice).toBe(6000);
  await page.getByRole("link", { name: "Back to course", exact: true }).click();
  await expect(page.locator(".course-price-values del")).toContainText("6,000");
});

test("students cannot open the course editor", async ({ page }) => {
  const data = await fixture(page, "student");
  data.courses.push({ ...paidCourse });
  await signIn(page);
  await page.goto(`/#/courses/${courseId}`);
  await expect(
    page.getByRole("link", { name: "Edit course", exact: true }),
  ).toHaveCount(0);
  await page.goto(`/#/courses/${courseId}/edit`);
  await expect(
    page.getByRole("heading", { name: "Course editing unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(
    0,
  );
  await page.goto("/#/courses/missing-course/edit");
  await expect(
    page.getByRole("heading", { name: "Course editing unavailable" }),
  ).toBeVisible();
});
