import { test as base } from "@playwright/test";
import { TodoPage } from "pages/ui";

type HomePageFixture = {
	todoPage: TodoPage;
};

export const test = base.extend<HomePageFixture>({
	todoPage: async ({ page }, use) => {
		const url = process.env.DEMO_PLAYWRIGHT_DEV_URL;
		const todoPage = new TodoPage(page);
		await test.step("Navigate to the todo page", async () => {
			await todoPage.navigate(url || "/");
		});
		await use(todoPage);
	},
});

export { expect } from "@playwright/test";
