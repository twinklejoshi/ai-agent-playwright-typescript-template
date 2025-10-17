import { test, expect } from "@playwright/test";
import { TAGS } from "@utils/configuration";
import { UserApi } from "pages/api";
import { NEW_USER } from "shared/mock-data/user-data";

test.describe("User API Tests", () => {
	let userApi: UserApi;

	test.beforeEach(async ({ request }) => {
		userApi = new UserApi(request);
	});

	test(
		"should fetch user by ID",
		{
			tag: TAGS.REGRESSION,
		},
		async () => {
			await test.step("Request users api to get user by id and validate results", async () => {
				const response = await userApi.getUser(1);
				const user = await response.json();
				expect(response.ok()).toBeTruthy();
				expect(user.name).toBeDefined();
			});
		},
	);

	test(
		"should not fetch user by ID - 0 (negative case)",
		{
			tag: TAGS.REGRESSION,
		},
		async () => {
			await test.step("Request users api to get user by id and validate results", async () => {
				const response = await userApi.getUser(0);
				const user = await response.json();
				expect(response.ok()).toBeTruthy();
				expect(user.name).toBeDefined();
			});
		},
	);

	test(
		"should create a new user",
		{
			tag: TAGS.INTERNAL,
		},
		async () => {
			await test.step("Request users api to create a new user and validate results", async () => {
				const response = await userApi.createUser(NEW_USER);
				const user = await response.json();
				expect(response.ok()).toBeTruthy();
				expect(user.name).toBe("John Doe");
			});
		},
	);
});
