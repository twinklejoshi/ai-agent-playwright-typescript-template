// pages/TodoPage.ts
import { Locator, Page, expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class TodoPage extends BasePage {
	private readonly todoTitles;
	private readonly todoCount;
	private readonly todoItems;
	private readonly newTodoInput;
	private readonly toggleAll;

	constructor(page: Page) {
		super(page);
		this.todoTitles = this.page.getByTestId("todo-title");
		this.todoCount = this.page.getByTestId("todo-count");
		this.todoItems = this.page.getByTestId("todo-item");
		this.newTodoInput = this.page.getByPlaceholder("What needs to be done?");
		this.toggleAll = this.page.getByLabel("Mark all as complete");
	}

	async addTodo(todo: string) {
		await this.newTodoInput.fill(todo);
		await this.newTodoInput.press("Enter");
	}

	async expectTodoTitles(titles: string[]) {
		await this.expectToHaveText(this.todoTitles, titles);
	}

	async expectInputCleared() {
		await expect(this.newTodoInput).toBeEmpty();
	}

	async expectTodoCount(count: number) {
		await this.expectToContainText(this.todoCount, count.toString());
	}

	async expectTodoCountText(text: string) {
		await this.expectToHaveText(this.todoCount, text);
	}

	getTodoCheckbox(index: number): Locator {
		return this.todoItems.nth(index).getByRole("checkbox");
	}

	getEditBox(index: number): Locator {
		return this.todoItems.nth(index).getByRole("textbox", { name: "Edit" });
	}

	async completeAllTodos() {
		await this.toggleAll.check();
	}

	async clearAllCompleted() {
		await this.toggleAll.uncheck();
	}

	async expectTodosCompletedState(expected: string[]) {
		await expect(this.todoItems).toHaveClass(expected);
	}

	async expectToggleAllChecked(expected: boolean) {
		if (expected) {
			await expect(this.toggleAll).toBeChecked();
		} else {
			await expect(this.toggleAll).not.toBeChecked();
		}
	}

	async expectTodoEditedText(expectedTexts: string[]) {
		await expect(this.todoItems).toHaveText(expectedTexts);
	}

	async createDefaultTodos(todoItems: string[]) {
		for (const item of todoItems) {
			await this.addTodo(item);
		}
	}
}
