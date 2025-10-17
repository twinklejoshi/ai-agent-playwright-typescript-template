import { test as base } from "@playwright/test";
import { HomePage } from "pages/ui";

type HomePageFixture = {
	homePage: HomePage;
};

export const test = base.extend<HomePageFixture>({
	homePage: async ({ page }, use) => {
		const url = process.env.PLAYWRIGHT_DEV_URL;
		const homePage = new HomePage(page);
		await test.step("Navigate to the home page", async () => {
			await homePage.navigate(url || "/");
		});
		await use(homePage);
	},
});

export { expect } from "@playwright/test";
