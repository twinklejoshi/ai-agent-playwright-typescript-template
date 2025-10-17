import { Locator, Page, expect } from "@playwright/test";

export class BasePage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async navigate(url: string) {
		await this.page.goto(url);
	}

	async expectToHaveTitle(text: RegExp | string) {
		await expect(this.page).toHaveTitle(text);
	}

	async expectToHaveText(locator: Locator, text: string | string[]) {
		await expect(locator).toHaveText(text);
	}

	async expectToContainText(locator: Locator, text: string) {
		await expect(locator).toContainText(text);
	}

	async expectElementVisible(locator: Locator) {
		await expect(locator).toBeVisible();
	}
}
