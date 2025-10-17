import inquirer from "inquirer";
import { execSync } from "child_process";
import { BROWSERS, ENVIRONMENTS, MODES, TEST_GROUPS, TEST_TYPES } from "./configuration";

inquirer
	.prompt([
		{
			type: "list",
			name: "selectedEnvironment",
			message: "Select an environment:",
			choices: ENVIRONMENTS,
		},
		{
			type: "checkbox",
			name: "selectedBrowser",
			message: "Select the browsers:",
			choices: BROWSERS,
		},
		{
			type: "checkbox",
			name: "selectedTestType",
			message: "Select the test types:",
			choices: TEST_TYPES,
		},
		{
			type: "checkbox",
			name: "selectedTestGroup",
			message: "Select the test groups:",
			choices: TEST_GROUPS,
		},
		{
			type: "list",
			name: "selectedMode",
			message: "Select the test mode:",
			choices: MODES,
		},
	])
	.then((answers) => {
		console.log(`Environment selected: ${answers.selectedEnvironment}`);
		console.log(`Browser selected: ${answers.selectedBrowser}`);
		console.log(`Test Type selected: ${answers.selectedTestType}`);
		console.log(`Test Group selected: ${answers.selectedTestGroup}`);
		console.log(`TestMode selected: ${answers.selectedMode}`);
		try {
			const browserScriptParam = answers.selectedBrowser.map((browser: string) => `--project=${browser}`).join(" ");
			const testTypeParams = answers.selectedTestType.map((testType: string) => `.src/tests/${testType}`).join(" ");

			const testGroupParam = answers.selectedTestGroup.join("|");

			const command = `npx cross-env NODE_ENV=${answers.selectedEnvironment} playwright test ${browserScriptParam} ${testTypeParams} --grep "${testGroupParam}" ${answers.selectedMode}`;
			console.log("\n" + "> " + command);

			// Run the selected test with Playwright
			execSync(command, {
				stdio: "inherit",
			});
		} catch (error) {
			console.error(`Error while running test: ${error}`);
		}
	})
	.catch((error) => {
		console.error(`Error: ${error}`);
	});
