import { expect, test } from "@playwright/test";
import { fixture, signIn } from "./workspace-fixture";
test.describe("iPad profile menu", () => {
  for (const [orientation, viewport] of [
    ["portrait", { width: 810, height: 1080 }],
    ["landscape", { width: 1080, height: 810 }],
  ] as const) {
    test(`tapping My profile works in ${orientation}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await fixture(page, "student");
      await signIn(page);
      const avatar = page.getByRole("button", { name: "Open profile menu" });
      await avatar.tap();
      await page.getByRole("link", { name: "My profile", exact: true }).tap();
      await expect(page).toHaveURL(/#\/profile$/);
      await expect(
        page.getByRole("heading", { name: "My profile", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Edit profile", exact: true })
        .tap();
      await page
        .getByLabel("Display name", { exact: true })
        .fill("iPad Learner");
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .tap();
      await expect(page.locator(".profile-summary h2")).toHaveText(
        "iPad Learner",
      );
      await avatar.tap();
      await expect(avatar).toHaveAttribute("aria-expanded", "true");
      await page
        .getByRole("heading", { name: "My profile", exact: true })
        .tap();
      await expect(avatar).toHaveAttribute("aria-expanded", "false");
    });
  }
  test("workspace switches and repeated avatar taps work on iPad", async ({
    page,
  }) => {
    await fixture(page, "teacher-admin", true);
    await signIn(page);
    const avatar = page.getByRole("button", { name: "Open profile menu" });
    await avatar.tap();
    await avatar.tap();
    await expect(avatar).toHaveAttribute("aria-expanded", "false");
    await avatar.tap();
    await page
      .getByRole("button", {
        name: /Platform administration Platform administrator/,
      })
      .tap();
    await expect(page.locator(".section-eyebrow")).toHaveText(
      "YOUR PLATFORM SPACE",
    );
    await avatar.tap();
    await page
      .getByRole("button", { name: /Willow Academy Teacher administrator/ })
      .tap();
    await expect(page.locator(".section-eyebrow")).toHaveText(
      "YOUR TEACHING & ADMIN SPACE",
    );
  });
});
