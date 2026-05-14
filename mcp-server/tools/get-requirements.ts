import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { normalizeRequirementsDocument, parseRequirementsText } from "../src/requirements-normalizer.js";

export function getRequirements(server: McpServer): void {
	server.registerTool(
		"normalize_requirements",
		{
			description:
				"Normalizes requirements from Jira/file/pasted text into one canonical JSON contract for downstream planning.",
			inputSchema: {
				source: z.enum(["jira", "file", "pasted"]).describe("Source of requirements"),
				rawText: z.string().describe("Raw requirements text (ticket body, pasted text, or file text)"),
				sourceRef: z.string().optional().describe("Optional source reference like PROJ-123 or requirements/file.md"),
				app: z.string().optional(),
				url: z.string().optional(),
				version: z.string().optional(),
				tags: z.union([z.string(), z.array(z.string())]).optional(),
				author: z.string().optional(),
			},
		},
		async ({ source, rawText, sourceRef, app, url, version, tags, author }) => {
			const parsed = parseRequirementsText(rawText);
			const normalized = normalizeRequirementsDocument({
				source,
				sourceRef,
				app: app ?? parsed.app,
				url: url ?? parsed.url,
				version: version ?? parsed.version,
				tags: tags ?? parsed.tags,
				author: author ?? parsed.author,
				scope: parsed.scope,
				assumptions: parsed.assumptions,
				requirements: parsed.requirements,
			});

			return {
				content: [{ type: "text" as const, text: JSON.stringify(normalized, null, 2) }],
			};
		},
	);
}
