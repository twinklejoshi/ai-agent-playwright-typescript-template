export type RequirementsSource = "jira" | "file" | "pasted";

export interface NormalizedRequirement {
	id: string;
	title: string;
	acceptanceCriteria: string[];
	priorityTags: string[];
}

export interface NormalizedRequirementsDocument {
	source: RequirementsSource;
	sourceRef?: string;
	app: string;
	url: string;
	version: string;
	tags: string[];
	author: string;
	scope: {
		focus: string[];
		exclude: string[];
	};
	assumptions: string[];
	requirementCount: number;
	requirements: NormalizedRequirement[];
}

export interface RequirementsDraft {
	source: RequirementsSource;
	sourceRef?: string;
	app?: string;
	url?: string;
	version?: string;
	tags?: string | string[];
	author?: string;
	scope?: {
		focus?: string[];
		exclude?: string[];
	};
	assumptions?: string[];
	requirements?: Array<{
		id?: string;
		title?: string;
		acceptanceCriteria?: string[];
		priorityTags?: string[] | string;
	}>;
}

function uniq(values: string[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const normalized = value.trim();
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		out.push(normalized);
	}
	return out;
}

function toTagList(input?: string | string[]): string[] {
	const raw = Array.isArray(input) ? input : (input ?? "").split(",");
	return uniq(
		raw.map((item) => {
			const t = item.trim();
			if (!t) return "";
			return t.startsWith("@") ? t : `@${t}`;
		}),
	);
}

function normalizeReqId(id: string | undefined, index: number): string {
	const fallback = `REQ-${String(index + 1).padStart(3, "0")}`;
	if (!id) return fallback;
	const match = id.trim().toUpperCase().match(/^REQ[-\s]?(\d{1,4})$/);
	if (!match) return fallback;
	return `REQ-${String(Number(match[1])).padStart(3, "0")}`;
}

export function normalizeRequirementsDocument(draft: RequirementsDraft): NormalizedRequirementsDocument {
	const requirements = (draft.requirements ?? []).map((req, index) => ({
		id: normalizeReqId(req.id, index),
		title: req.title?.trim() || `Requirement ${index + 1}`,
		acceptanceCriteria: uniq(req.acceptanceCriteria ?? []),
		priorityTags: toTagList(req.priorityTags),
	}));

	return {
		source: draft.source,
		sourceRef: draft.sourceRef,
		app: draft.app?.trim() || "unknown",
		url: draft.url?.trim() || "unknown",
		version: draft.version?.trim() || "unknown",
		tags: toTagList(draft.tags),
		author: draft.author?.trim() || "unknown",
		scope: {
			focus: uniq(draft.scope?.focus ?? []),
			exclude: uniq(draft.scope?.exclude ?? []),
		},
		assumptions: uniq(draft.assumptions ?? []),
		requirementCount: requirements.length,
		requirements,
	};
}

export function parseRequirementsText(rawText: string): Omit<RequirementsDraft, "source" | "sourceRef"> {
	const lines = rawText.split(/\r?\n/);
	const focus: string[] = [];
	const exclude: string[] = [];
	const assumptions: string[] = [];
	const requirements: Array<{ id?: string; title?: string; acceptanceCriteria?: string[]; priorityTags?: string[] }> = [];

	let app: string | undefined;
	let url: string | undefined;
	let version: string | undefined;
	let tags: string | undefined;
	let author: string | undefined;

	let section: "none" | "focus" | "exclude" | "assumptions" = "none";
	let inCriteria = false;
	let currentReq: (typeof requirements)[number] | null = null;

	for (const raw of lines) {
		const line = raw.trim();
		if (!line) continue;

		const plain = line.replace(/^#{1,6}\s*/, "").trim();

		const metadataMatch = plain.match(/^(App|Url|Version|Tags|Author)\s*:\s*(.+)$/i);
		if (metadataMatch) {
			const key = metadataMatch[1].toLowerCase();
			const value = metadataMatch[2].trim();
			if (key === "app") app = value;
			if (key === "url") url = value;
			if (key === "version") version = value;
			if (key === "tags") tags = value;
			if (key === "author") author = value;
			continue;
		}

		if (/^scope\s+focus:?$/i.test(plain)) {
			section = "focus";
			inCriteria = false;
			continue;
		}
		if (/^scope\s+exclude:?$/i.test(plain)) {
			section = "exclude";
			inCriteria = false;
			continue;
		}
		if (/^assumptions:?$/i.test(plain)) {
			section = "assumptions";
			inCriteria = false;
			continue;
		}

		const reqMatch = plain.match(/^REQ[-\s]?(\d{1,4})\s*:\s*(.+)$/i);
		if (reqMatch) {
			currentReq = {
				id: `REQ-${String(Number(reqMatch[1])).padStart(3, "0")}`,
				title: reqMatch[2].trim(),
				acceptanceCriteria: [],
				priorityTags: [],
			};
			requirements.push(currentReq);
			inCriteria = false;
			continue;
		}

		if (/^acceptance criteria:?$/i.test(plain)) {
			inCriteria = true;
			continue;
		}

		const priorityMatch = plain.match(/^priority\s*:\s*(.+)$/i);
		if (priorityMatch && currentReq) {
			currentReq.priorityTags = priorityMatch[1].split(",").map((p) => p.trim()).filter(Boolean);
			inCriteria = false;
			continue;
		}

		const isListItem = /^[-*]\s+/.test(plain) || /^\d+\.\s+/.test(plain);
		if (!isListItem) continue;

		const value = plain.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
		if (section === "focus") focus.push(value);
		else if (section === "exclude") exclude.push(value);
		else if (section === "assumptions") assumptions.push(value);
		else if (inCriteria && currentReq) (currentReq.acceptanceCriteria ??= []).push(value);
	}

	return {
		app,
		url,
		version,
		tags,
		author,
		scope: { focus, exclude },
		assumptions,
		requirements,
	};
}
