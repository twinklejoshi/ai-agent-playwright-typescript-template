import { Page } from "@playwright/test";

export async function checkNumberOfItemsInLocalStorage(page: Page, count: number, localStorageId: string) {
	return await page.waitForFunction(
		([key, expected]) => {
			return JSON.parse(localStorage[key]).length === expected;
		},
		[localStorageId, count],
	);
}

export async function checkNumberOfCompletedTodosInLocalStorage(page: Page, count: number, localStorageId: string) {
	return await page.waitForFunction(
		([key, expected]) => {
			return JSON.parse(localStorage[key]).filter((todo: any) => todo.completed).length === expected;
		},
		[localStorageId, count],
	);
}
