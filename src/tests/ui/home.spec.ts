import { TAGS } from "@utils/configuration";
import { test } from "./fixtures/home-fixture";

test.describe("Home", () => {
	test(
		"has title",
		{
			tag: TAGS.SMOKE,
		},
		async ({ homePage }) => {
			await test.step("Verify the home page title", async () => {
				await homePage.expectToHaveTitle(/Playwright/);
			});
		},
	);

	test(
		"get started link navigates to Installation section",
		{
			tag: TAGS.SMOKE,
		},
		async ({ homePage }) => {
			await test.step("Click on Get Started link and verify navigation", async () => {
				await homePage.clickGetStarted();
				await homePage.expectInstallationHeadingVisible();
			});
		},
	);
});
