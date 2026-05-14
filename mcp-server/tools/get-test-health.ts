import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { collectFailures } from "../src/parsers.js";
import type { PlaywrightReport, TestHealthData, TestHealthRecord } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const HEALTH_FILE = join(ROOT, "test-health.json");
const HEAL_THRESHOLD = 3;

function formatLastHealed(value: string): string {
	if (!value) return "Never";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "Never" : d.toLocaleString();
}

function readHealthData(): TestHealthData {
	if (!existsSync(HEALTH_FILE)) return {};
	try {
		return JSON.parse(readFileSync(HEALTH_FILE, "utf-8")) as TestHealthData;
	} catch {
		return {};
	}
}

export function getTestHealth(server: McpServer): void {
	server.registerTool(
		"get_test_failures",
		{
			description:
				"Reads test-results/results.json (written by the JSON reporter) and returns structured failure " +
				"details for every failing test: file path, line, error message, the step that failed, and " +
				"screenshot path. Use this after test_run to give the healer agent clean, targeted input " +
				"instead of raw terminal output.",
			inputSchema: { project: z.string().optional().describe("Filter by Playwright project name, e.g. 'chromium'. Omit for all.") },
		},
		async ({ project }) => {
			const p = join(ROOT, "test-results", "results.json");
			if (!existsSync(p)) {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: "No results found. Run tests first so the JSON reporter writes test-results/results.json.",
								hint: 'Add ["json", { "outputFile": "test-results/results.json" }] to playwright.config.ts reporters.',
							}),
						},
					],
				};
			}

			let report: PlaywrightReport;
			try {
				report = JSON.parse(readFileSync(p, "utf-8")) as PlaywrightReport;
			} catch {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: "Failed to parse test-results/results.json",
								hint: "Ensure the JSON reporter is configured in playwright.config.ts",
							}),
						},
					],
				};
			}

			const failures: object[] = [];
			for (const suite of report.suites) collectFailures(suite, failures);

			const filtered = project
				? failures.filter((f) => (f as Record<string, string>).project === project)
				: failures;

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({ totalFailures: filtered.length, failures: filtered }, null, 2),
					},
				],
			};
		},
	);

	server.registerTool(
		"get_test_health",
		{
			description: "Check the heal history of a test file before attempting to fix it. If healCount >= 3, regenerate from the source plan instead of healing again.",
			inputSchema: { testFile: z.string().describe("Relative path to the test file, e.g. 'src/tests/ui/todo.spec.ts'") },
		},
		async ({ testFile }) => {
			const data = readHealthData();
			const record = data[testFile];

			if (!record || record.healCount === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text:
								`No heal history for '${testFile}'.\n\n` +
								`This test has never been healed. Proceed with normal healing.\n` +
								`After healing, call record_heal_event to keep health data current.`,
						},
					],
				};
			}

			const shouldRegenerate = record.healCount >= HEAL_THRESHOLD;
			const recommendation = shouldRegenerate
				? `⚠️  REGENERATE — Healed ${record.healCount}x (threshold: ${HEAL_THRESHOLD}). Healing again compounds fragility.\n  Regenerate from: ${record.planSource ?? "the original specs/ plan"}`
				: `✅ SAFE TO HEAL — Heal count ${record.healCount}/${HEAL_THRESHOLD}. Proceed with normal healing.`;

			const history = record.healHistory
				.map((h: { date: string; fix: string }, i: number) => `  ${i + 1}. [${new Date(h.date).toLocaleDateString()}] ${h.fix}`)
				.join("\n");

			return {
				content: [
					{
						type: "text" as const,
						text:
							`# Test Health: ${testFile}\n\n` +
							`**Heal Count:** ${record.healCount} / ${HEAL_THRESHOLD}\n` +
							`**Last Healed:** ${formatLastHealed(record.lastHealed)}\n` +
							`**Plan Source:** ${record.planSource ?? "unknown"}\n\n` +
							`## Recommendation\n${recommendation}\n\n` +
							`## Heal History\n${history || "  No history recorded."}`,
					},
				],
			};
		},
	);

	server.registerTool(
		"list_test_health",
		{
			description: "List all tracked test files with their heal counts. Use this to identify tests that need regeneration across the whole suite.",
		},
		async () => {
			const data = readHealthData();
			const files = Object.keys(data);

			if (files.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: "No heal history found. test-health.json is empty or does not exist yet.\nIt will be populated after the first successful heal via record_heal_event.",
						},
					],
				};
			}

			const critical = files.filter((f) => data[f].healCount >= HEAL_THRESHOLD);
			const healthy = files.filter((f) => data[f].healCount < HEAL_THRESHOLD);
			const fmt = (f: string) =>
				`  ${f} — healed ${data[f].healCount}x (last: ${formatLastHealed(data[f].lastHealed)})`;

			return {
				content: [
					{
						type: "text" as const,
						text:
							`# Test Health Summary\n\n` +
							(critical.length > 0
								? `## ⚠️  Needs Regeneration (${critical.length})\nHeal count ≥ ${HEAL_THRESHOLD} — regenerate from source plan:\n${critical.map(fmt).join("\n")}\n\n`
								: "") +
							`## ✅ Healthy (${healthy.length})\n${healthy.map(fmt).join("\n") || "  None tracked yet."}`,
					},
				],
			};
		},
	);

	server.registerTool(
		"record_heal_event",
		{
			description:
				"Record a heal event after successfully fixing a test. Call this after every healing session so health data " +
				"stays current and prevents over-healing in future sessions. " +
				"Use healType='assertion' only after explicit human approval and include an approval note. " +
				"'evidence' must describe what you observed (DOM snapshot, screenshot path, or description) that proves the fix " +
				"targets a real selector mismatch and not a product bug.",
			inputSchema: {
				testFile: z.string().describe("Relative path to the test file that was healed"),
				fix: z.string().describe("Short description of what was fixed, e.g. 'Updated selector from getByRole contentinfo to locator .todoapp footer'"),
				healType: z
					.enum(["selector", "timing", "logic", "assertion"])
					.describe(
						"Category of fix: 'selector' (locator changed), 'timing' (wait strategy), 'logic' (test flow), " +
						"'assertion' (expect() predicate changed — requires human approval).",
					),
				evidence: z
					.string()
					.describe(
						"Proof that the fix is a selector/timing issue, not a product bug. Include a screenshot path, " +
						"DOM snippet, or description of what the browser showed vs. what the locator resolved to.",
					),
				productBehaviorChanged: z
					.boolean()
					.describe(
						"Set to true if the app's actual behaviour differs from what the original assertion expected " +
						"(i.e. this may be a real bug). Set to false if the fix only corrects a wrong locator or timing issue.",
					),
				humanApprovedAssertionChange: z
					.boolean()
					.optional()
					.describe("Required when healType='assertion'. Must be true only after explicit human approval."),
				approvalNote: z
					.string()
					.optional()
					.describe("Required when healType='assertion'. Include who approved and why the assertion change is correct."),
				planSource: z.string().optional().describe("Path to the spec plan this test was generated from, e.g. 'specs/todo-plan.md'"),
			},
		},
		async ({ testFile, fix, healType, evidence, productBehaviorChanged, humanApprovedAssertionChange, approvalNote, planSource }) => {
			if (healType === "assertion" && !humanApprovedAssertionChange) {
				return {
					content: [
						{
							type: "text" as const,
							text:
								`⛔ BLOCKED: healType 'assertion' requires explicit human approval.\n\n` +
								`You attempted to record a heal that changes an expect() predicate for '${testFile}'.\n\n` +
								`Assertion changes may mask real product bugs. Required action:\n` +
								`1. Show the human the original assertion, your proposed change, and the evidence.\n` +
								`2. Get explicit written confirmation that the assertion change is correct.\n` +
								`3. Re-run record_heal_event with humanApprovedAssertionChange=true and approvalNote set.\n\n` +
								`If the locator is wrong (not the assertion), use healType='selector' instead.`,
						},
					],
					isError: true,
				};
			}

			if (healType === "assertion" && !approvalNote) {
				return {
					content: [
						{
							type: "text" as const,
							text:
								`⛔ BLOCKED: approvalNote is required for healType='assertion'.\n\n` +
								`Provide who approved the assertion change and why it is correct.`,
						},
					],
					isError: true,
				};
			}

			const data = readHealthData();
			const absolutePath = join(ROOT, testFile);
			const currentAssertionCount = existsSync(absolutePath)
				? (readFileSync(absolutePath, "utf-8").match(/\bexpect\s*\(/g) ?? []).length
				: undefined;

			const existing: TestHealthRecord = data[testFile] ?? {
				healCount: 0,
				lastHealed: new Date().toISOString(),
				healHistory: [],
				planSource: planSource ?? undefined,
				recommendation: null,
				// Capture baseline on first-ever heal so future heals can be diffed against it
				baselineAssertionCount: currentAssertionCount,
			};

			existing.healCount += 1;
			existing.lastHealed = new Date().toISOString();
			existing.healHistory.push({
				date: new Date().toISOString(),
				fix,
				healType,
				evidence,
				productBehaviorChanged,
				humanApprovedAssertionChange,
				approvalNote,
			});
			if (planSource) existing.planSource = planSource;
			existing.recommendation = existing.healCount >= HEAL_THRESHOLD ? "regenerate" : null;
			data[testFile] = existing;

			writeFileSync(HEALTH_FILE, JSON.stringify(data, null, 2));

			const behaviorWarning = productBehaviorChanged
				? `\n\n🚨 PRODUCT BEHAVIOR FLAG: You marked productBehaviorChanged=true. This may indicate a real bug in the application. ` +
				  `File a bug report and do not suppress the original assertion without human review.`
				: "";

			const healWarning =
				existing.healCount >= HEAL_THRESHOLD
					? `\n\n⚠️  This test has now been healed ${existing.healCount} times. Recommend regenerating from ${existing.planSource ?? "the source plan"} instead of healing further.`
					: "";

			return {
				content: [
					{
						type: "text" as const,
						text:
							`Recorded heal event for '${testFile}'.\n` +
							`Heal count: ${existing.healCount}/${HEAL_THRESHOLD}\n` +
							`Type: ${healType}\n` +
							`Evidence: ${evidence}` +
							behaviorWarning +
							healWarning,
					},
				],
			};
		},
	);
}
