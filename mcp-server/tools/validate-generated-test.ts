import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import type { ValidationResult, TestHealthData, TestHealthRecord } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");

function validateTestFile(content: string, filePath: string): ValidationResult[] {
	const results: ValidationResult[] = [];
	const lines = content.split("\n");
	const isInTestsDir = filePath.includes("/tests/") || filePath.includes("\\tests\\");

	if (isInTestsDir) {
		const inlineLocatorPatterns = [
			{ pattern: /\bpage\.locator\s*\(/, label: "page.locator()" },
			{ pattern: /\bpage\.click\s*\(/, label: "page.click()" },
			{ pattern: /\bpage\.fill\s*\(/, label: "page.fill()" },
			{ pattern: /\bpage\.type\s*\(/, label: "page.type()" },
			{ pattern: /\bpage\.check\s*\(/, label: "page.check()" },
			{ pattern: /\bpage\.getByPlaceholder\s*\(/, label: "page.getByPlaceholder()" },
			{ pattern: /\bpage\.getByRole\s*\(/, label: "page.getByRole()" },
			{ pattern: /\bpage\.getByTestId\s*\(/, label: "page.getByTestId()" },
		];
		lines.forEach((line, idx) => {
			if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
			inlineLocatorPatterns.forEach(({ pattern, label }) => {
				if (pattern.test(line)) {
					results.push({
						level: "FAIL",
						rule: "no-inline-locators",
						message: `${label} found in test file. Move this into a page object method under src/pages/ui/.`,
						line: idx + 1,
					});
				}
			});
		});
	}

	const urlPattern = /https?:\/\//;
	lines.forEach((line, idx) => {
		if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
		if (urlPattern.test(line) && !line.includes("process.env")) {
			results.push({
				level: "FAIL",
				rule: "no-hardcoded-urls",
				message: `Hardcoded URL found. Use process.env.DEMO_PLAYWRIGHT_DEV_URL or process.env.API_BASE_URL instead.`,
				line: idx + 1,
			});
		}
	});

	const testCallLines: number[] = [];
	lines.forEach((line, idx) => {
		if (
			/\btest\s*\(/.test(line) &&
			!line.includes("test.describe") &&
			!line.includes("test.beforeEach") &&
			!line.includes("test.afterEach") &&
			!line.includes("test.fixme") &&
			!line.includes("test.skip")
		) {
			testCallLines.push(idx + 1);
		}
	});
	testCallLines.forEach((lineNum) => {
		const window = lines.slice(lineNum - 1, lineNum + 2).join(" ");
		if (!window.includes("tag:") && !window.includes("TAGS.")) {
			results.push({
				level: "FAIL",
				rule: "require-test-tags",
				message: `test() call missing tag. Add { tag: [TAGS.SMOKE] } or { tag: [TAGS.REGRESSION] }. Import TAGS from '@utils/configuration'.`,
				line: lineNum,
			});
		}
	});

	if (
		!content.includes("import { test }") ||
		content.includes('from "@playwright/test"') ||
		content.includes("from '@playwright/test'")
	) {
		if (isInTestsDir && !content.includes("fixtures/")) {
			results.push({
				level: "FAIL",
				rule: "use-fixture-import",
				message:
					"Import 'test' from the fixture file (e.g. '../fixtures/todo-fixture'), not directly from '@playwright/test'.",
			});
		}
	}

	if (isInTestsDir && !content.includes("test.step(")) {
		results.push({
			level: "WARN",
			rule: "use-test-steps",
			message: "No test.step() calls found. Wrap logical actions in test.step() for report readability.",
		});
	}

	// Detect commented-out expect() calls — a common healer cheat to bypass failing assertions
	const commentedExpects = lines.filter((l) => /\/\/\s*await\s+expect\s*\(/.test(l));
	if (commentedExpects.length > 0) {
		results.push({
			level: "FAIL",
			rule: "no-commented-assertions",
			message:
				`Found ${commentedExpects.length} commented-out expect() call(s). ` +
				"Restore or delete them — never silence assertions to make a test pass.",
		});
	}

	const assertionLines = lines.filter((l) => l.includes("expect(") && !l.trim().startsWith("//"));
	const hasOnlyExistenceAssertions =
		assertionLines.length > 0 && assertionLines.every((l) => /\.toBeVisible\(\)|\.toBeTruthy\(\)/.test(l));
	if (hasOnlyExistenceAssertions) {
		results.push({
			level: "WARN",
			rule: "meaningful-assertions",
			message: "All assertions only check visibility. Add value assertions: toHaveText(), toHaveCount(), toHaveValue().",
		});
	}

	lines.forEach((line, idx) => {
		if (line.trim().startsWith("//")) return;
		if (/locator\s*\(\s*['"][.#][a-zA-Z]/.test(line)) {
			results.push({
				level: "WARN",
				rule: "prefer-stable-locators",
				message: `CSS class/ID selector found. Prefer data-test attributes or ARIA roles.`,
				line: idx + 1,
			});
		}
	});

	return results;
}

function readBaselineAssertionCount(testFilePath: string): number | undefined {
	const healthPath = join(ROOT, "test-health.json");
	if (!existsSync(healthPath)) return undefined;
	try {
		const data = JSON.parse(readFileSync(healthPath, "utf-8")) as TestHealthData;
		const normalized = testFilePath.replace(/\\/g, "/");
		return data[normalized]?.baselineAssertionCount;
	} catch {
		return undefined;
	}
}

function seedBaselineAssertionCountIfMissing(testFilePath: string, currentAssertionCount: number): void {
	const healthPath = join(ROOT, "test-health.json");
	let data: TestHealthData = {};

	if (existsSync(healthPath)) {
		try {
			data = JSON.parse(readFileSync(healthPath, "utf-8")) as TestHealthData;
		} catch {
			data = {};
		}
	}

	const normalized = testFilePath.replace(/\\/g, "/");
	const existing = data[normalized];

	if (existing?.baselineAssertionCount !== undefined) return;

	const seeded: TestHealthRecord = {
		healCount: existing?.healCount ?? 0,
		lastHealed: existing?.lastHealed ?? "",
		healHistory: existing?.healHistory ?? [],
		planSource: existing?.planSource,
		recommendation: existing?.recommendation ?? null,
		baselineAssertionCount: currentAssertionCount,
	};

	data[normalized] = seeded;
	writeFileSync(healthPath, JSON.stringify(data, null, 2));
}

export function validateGeneratedTest(server: McpServer): void {
	server.registerTool(
		"validate_generated_test",
		{
			description: "Validate a generated test file against framework conventions. Returns FAIL violations (must fix — blocked by pre-commit) and WARN suggestions. Call this after generator_write_test and fix all FAILs before reporting done.",
			inputSchema: {
				testFilePath: z
					.string()
					.describe("Relative path to the generated test file, e.g. 'src/tests/ui/generated/add-todo.spec.ts'"),
			},
		},
		async ({ testFilePath }) => {
			const absolutePath = join(ROOT, testFilePath);
			if (!existsSync(absolutePath)) {
				return {
					content: [
						{
							type: "text" as const,
							text: `File not found: '${testFilePath}'. Make sure generator_write_test ran before calling this.`,
						},
					],
					isError: true,
				};
			}

			const content = readFileSync(absolutePath, "utf-8");
			const validationResults = validateTestFile(content, testFilePath);
			const currentAssertions = (content.match(/\bexpect\s*\(/g) ?? []).length;

			// Seed baseline before healing starts so first-heal weakening can be detected.
			seedBaselineAssertionCountIfMissing(testFilePath, currentAssertions);

			// Assertion-count guard: fail if a heal silently removed assertions
			const baseline = readBaselineAssertionCount(testFilePath);
			if (baseline !== undefined) {
				if (currentAssertions < baseline) {
					validationResults.push({
						level: "FAIL",
						rule: "assertion-count-regression",
						message:
							`Assertion count dropped from ${baseline} (baseline) to ${currentAssertions}. ` +
							"A heal may have removed or weakened assertions. Restore the missing expect() calls or get explicit approval.",
					});
				}
			}

			const failures = validationResults.filter((r) => r.level === "FAIL");
			const warnings = validationResults.filter((r) => r.level === "WARN");
			const passed = failures.length === 0;

			const fmt = (r: ValidationResult) =>
				`  [${r.level}] ${r.rule}${r.line ? ` (line ${r.line})` : ""}\n  → ${r.message}`;

			return {
				content: [
					{
						type: "text" as const,
						text:
							`# Validation: ${testFilePath}\n\n` +
							(failures.length > 0
								? `## ❌ Failures — Must Fix (${failures.length})\n${failures.map(fmt).join("\n\n")}\n\n`
								: `## ✅ No Failures\n\n`) +
							(warnings.length > 0 ? `## ⚠️  Warnings (${warnings.length})\n${warnings.map(fmt).join("\n\n")}\n\n` : "") +
							(passed
								? `## Verdict: PASS ✅\nMeets minimum standards. Fix warnings for best quality.`
								: `## Verdict: FAIL ❌\nFix all ${failures.length} failure(s) before committing.`),
					},
				],
			};
		},
	);
}
