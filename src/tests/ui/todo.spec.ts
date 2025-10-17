import { LOCAL_STORAGE_ID, TODO_ITEMS } from "shared/mock-data";
import { test } from "./fixtures/todo-fixture";

import { checkNumberOfCompletedTodosInLocalStorage, checkNumberOfItemsInLocalStorage } from "shared/utils";
import { TAGS } from "@utils/configuration";

test.describe("New Todo", () => {
	test(
		"should allow me to add todo items",
		{
			tag: [TAGS.CUSTOMER, TAGS.REGRESSION],
		},
		async ({ page, todoPage }) => {
			await test.step("Add first todo item", async () => {
				await todoPage.addTodo(TODO_ITEMS[0]);
				await todoPage.expectTodoTitles([TODO_ITEMS[0]]);
			});

			await test.step("Add second todo item", async () => {
				await todoPage.addTodo(TODO_ITEMS[1]);
				await todoPage.expectTodoTitles([TODO_ITEMS[0], TODO_ITEMS[1]]);
			});

			await test.step("Check number of items in local storage should be 2", async () => {
				await checkNumberOfItemsInLocalStorage(page, 2, LOCAL_STORAGE_ID);
			});
		},
	);

	test(
		"should clear text input field when an item is added",
		{
			tag: [TAGS.CUSTOMER, TAGS.SMOKE],
		},
		async ({ page, todoPage }) => {
			await test.step("Add first todo item and validate input field is cleared", async () => {
				await todoPage.addTodo(TODO_ITEMS[0]);
				await todoPage.expectInputCleared();
			});

			await test.step("Check number of items in local storage should be 1", async () => {
				await checkNumberOfItemsInLocalStorage(page, 1, LOCAL_STORAGE_ID);
			});
		},
	);

	test(
		"should append new items to the bottom of the list",
		{
			tag: [TAGS.CUSTOMER, TAGS.REGRESSION],
		},
		async ({ page, todoPage }) => {
			await test.step("Create default todos", async () => {
				await todoPage.createDefaultTodos(TODO_ITEMS);
			});

			await test.step("Validate the todo count and titles", async () => {
				await todoPage.expectTodoCountText("3 items left");
				await todoPage.expectTodoCount(3);
				await todoPage.expectTodoTitles(TODO_ITEMS);
			});

			await test.step("Check number of items in local storage should be 3", async () => {
				await checkNumberOfItemsInLocalStorage(page, 3, LOCAL_STORAGE_ID);
			});
		},
	);
});

test.describe("Mark all as completed", () => {
	test.beforeEach(async ({ page, todoPage }) => {
		await test.step("Create default todos", async () => {
			await todoPage.createDefaultTodos(TODO_ITEMS);
		});
		await test.step("Check number of items in local storage should be 3", async () => {
			await checkNumberOfItemsInLocalStorage(page, 3, LOCAL_STORAGE_ID);
		});
	});

	test.afterEach(async ({ page }) => {
		await test.step("Check number of items in local storage should be 3", async () => {
			await checkNumberOfItemsInLocalStorage(page, 3, LOCAL_STORAGE_ID);
		});
	});

	test(
		"should allow me to mark all items as completed",
		{
			tag: [TAGS.INTERNAL, TAGS.SMOKE],
		},
		async ({ page, todoPage }) => {
			await test.step("Complete all todos", async () => {
				await todoPage.completeAllTodos();
			});

			await test.step("Check all todos are completed", async () => {
				await todoPage.expectTodosCompletedState(["completed", "completed", "completed"]);
				await checkNumberOfCompletedTodosInLocalStorage(page, 3, LOCAL_STORAGE_ID);
			});
		},
	);

	test(
		"should allow me to clear the complete state of all items",
		{
			tag: [TAGS.INTERNAL, TAGS.REGRESSION],
		},
		async ({ todoPage }) => {
			await test.step("Complete all todos and then clear all completed", async () => {
				await todoPage.completeAllTodos();
				await todoPage.clearAllCompleted();
				await todoPage.expectTodosCompletedState(["", "", ""]);
			});
		},
	);

	test(
		"complete all checkbox should update state when items are completed / cleared",
		{
			tag: [TAGS.INTERNAL, TAGS.SMOKE],
		},
		async ({ page, todoPage }) => {
			await test.step("Complete all todos", async () => {
				await todoPage.completeAllTodos();
			});
			await test.step("Validate all todos are completed and toggle all is checked", async () => {
				await todoPage.expectToggleAllChecked(true);
				await checkNumberOfCompletedTodosInLocalStorage(page, 3, LOCAL_STORAGE_ID);
			});

			await test.step("Uncheck first todo and validate toggle all is unchecked", async () => {
				const firstCheckbox = todoPage.getTodoCheckbox(0);
				await firstCheckbox.uncheck();
				await todoPage.expectToggleAllChecked(false);
			});
			await test.step("Check first todo and validate toggle all is checked", async () => {
				const firstCheckbox = todoPage.getTodoCheckbox(0);
				await firstCheckbox.check();
				await checkNumberOfCompletedTodosInLocalStorage(page, 3, LOCAL_STORAGE_ID);
				await todoPage.expectToggleAllChecked(true);
			});
		},
	);

	test(
		"complete all checkbox should update state when items are completed / cleared (fail on purpose)",
		{
			tag: [TAGS.INTERNAL, TAGS.SMOKE],
		},
		async ({ page, todoPage }) => {
			await test.step("Complete all todos", async () => {
				await todoPage.completeAllTodos();
			});
			await test.step("Validate all todos are completed and toggle all is checked", async () => {
				await todoPage.expectToggleAllChecked(true);
				await checkNumberOfCompletedTodosInLocalStorage(page, 3, LOCAL_STORAGE_ID);
			});

			await test.step("Uncheck first todo and validate toggle all is unchecked", async () => {
				const firstCheckbox = todoPage.getTodoCheckbox(0);
				await firstCheckbox.uncheck();
				await todoPage.expectToggleAllChecked(false);
			});
			await test.step("Check first todo and validate toggle all is checked", async () => {
				const firstCheckbox = todoPage.getTodoCheckbox(0);
				await firstCheckbox.check();
				await checkNumberOfCompletedTodosInLocalStorage(page, 3, LOCAL_STORAGE_ID);
				await todoPage.expectToggleAllChecked(false); // This will fail on purpose
			});
		},
	);
});
