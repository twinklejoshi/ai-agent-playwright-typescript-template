// Playwright JSON reporter output shapes

export interface PlaywrightStep {
	title: string;
	duration: number;
	error?: { message: string };
}

export interface PlaywrightResult {
	status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
	duration: number;
	retry: number;
	error?: { message: string; stack?: string };
	steps: PlaywrightStep[];
	attachments: Array<{ name: string; path?: string; contentType: string }>;
}

export interface PlaywrightSpec {
	title: string;
	file: string;
	line: number;
	ok: boolean;
	tests: Array<{
		timeout: number;
		projectName: string;
		expectedStatus: string;
		results: PlaywrightResult[];
	}>;
}

export interface PlaywrightSuite {
	title: string;
	file?: string;
	suites?: PlaywrightSuite[];
	specs?: PlaywrightSpec[];
}

export interface PlaywrightReport {
	stats: {
		startTime: string;
		duration: number;
		expected: number;
		unexpected: number;
		skipped: number;
		ok: boolean;
	};
	suites: PlaywrightSuite[];
	errors: unknown[];
}

// Test health tracking

export interface HealEntry {
	date: string;
	fix: string;
	/** Whether the fix changed a selector/locator, a timing strategy, or (forbidden without approval) an assertion */
	healType: "selector" | "timing" | "assertion" | "logic";
	/** Evidence that the fix targets a real selector mismatch and not a product bug — screenshot URL, DOM snippet, or description */
	evidence: string;
	/** Whether the product's actual behavior changed vs. what the test expected */
	productBehaviorChanged: boolean;
	/** Explicit human approval flag required for assertion-predicate changes */
	humanApprovedAssertionChange?: boolean;
	/** Optional operator note capturing who approved and why */
	approvalNote?: string;
}

export interface TestHealthRecord {
	healCount: number;
	lastHealed: string;
	healHistory: HealEntry[];
	planSource?: string;
	recommendation: "regenerate" | null;
	/** expect() call count recorded at the time the test was first generated. Used to detect assertion removal during healing. */
	baselineAssertionCount?: number;
}

export interface TestHealthData {
	[testFile: string]: TestHealthRecord;
}

// Test validation

export interface ValidationResult {
	level: "FAIL" | "WARN";
	rule: string;
	message: string;
	line?: number;
}
