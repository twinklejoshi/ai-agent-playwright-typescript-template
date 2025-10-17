export enum TAGS {
	REGRESSION = "@regression",
	SMOKE = "@smoke",
	CUSTOMER = "@customer",
	INTERNAL = "@internal",
}

export const ENVIRONMENTS = [
	{ name: "Local", value: "local" },
	{ name: "Dev", value: "dev" },
	{ name: "QA", value: "qa" },
];

export const BROWSERS = [
	{ name: "Chromium", value: "chromium" },
	{ name: "Firefox", value: "firefox" },
	{ name: "Webkit", value: "webkit" },
];

export const TEST_TYPES = [
	{ name: "API", value: "api" },
	{ name: "UI", value: "ui" },
	{ name: "E2E", value: "e2e" },
];

export const TEST_GROUPS = [
	{ name: "Regression", value: TAGS.REGRESSION },
	{ name: "Smoke", value: TAGS.SMOKE },
	{ name: "Customer", value: TAGS.CUSTOMER },
	{ name: "Internal", value: TAGS.INTERNAL },
];

export const MODES = [
	{ name: "Default => Headless", value: "" },
	{ name: "Headed", value: "--headed" },
	{ name: "UI", value: "--ui" },
	{ name: "Debug", value: "--debug" },
];

export const JIRA_PROJECT_ID = 1000; // Replace with your actual JIRA project ID
export const JIRA_PROJECT_ISSUE_TYPE_ID = 1000; // Replace with your actual JIRA issue type ID (e.g., Bug, Task)
export const JIRA_API_BASE_URL = "https://your-domain.atlassian.net"; // Replace with your JIRA instance
