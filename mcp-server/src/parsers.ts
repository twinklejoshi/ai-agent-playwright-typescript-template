// Shared parsing utilities

export function parseFrontmatter(content: string): Record<string, string> {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	return Object.fromEntries(
		match[1]
			.split("\n")
			.filter((line) => line.includes(":"))
			.map((line) => {
				const idx = line.indexOf(":");
				return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")];
			}),
	);
}

export const toLines = (s: string | undefined): string[] =>
	s
		?.split("\n")
		.map((l: string) => l.replace(/^- /, "").trim())
		.filter(Boolean) ?? [];

export function collectFailures(suite: any, out: object[]): void {
	for (const spec of suite.specs ?? []) {
		if (spec.ok) continue;
		for (const test of spec.tests) {
			for (const result of test.results) {
				if (result.status !== "failed" && result.status !== "timedOut") continue;
				const failedStep = result.steps.find((s: any) => s.error)?.title ?? "unknown step";
				const screenshot = result.attachments.find(
					(a: any) => a.name === "screenshot" && a.contentType === "image/png",
				);
				out.push({
					testName: spec.title,
					file: spec.file,
					line: spec.line,
					project: test.projectName,
					retry: result.retry,
					status: result.status,
					errorMessage: result.error?.message ?? "No error message",
					errorStack: result.error?.stack ?? "",
					failedStep,
					screenshotPath: screenshot?.path ?? null,
					durationMs: result.duration,
				});
			}
		}
	}
	for (const child of suite.suites ?? []) collectFailures(child, out);
}
