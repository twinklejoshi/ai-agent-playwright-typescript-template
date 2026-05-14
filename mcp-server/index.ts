#!/usr/bin/env node

/**
 * playwright-qa-context-mcp
 *
 * Custom MCP server that exposes framework-specific context to Playwright agents.
 * Sits alongside @playwright/mcp (browser control) and playwright run-test-mcp-server
 * (test execution) to complete the three-server architecture.
 *
 * Tools exposed:
 *   normalize_requirements                           — planner normalizes raw requirements into a canonical JSON contract
 *   get_framework_conventions                        — all agents know POM rules, tagging, locator strategy
 *   get_test_failures                                — healer gets clean structured failure data
 *   get_test_health, list_test_health, record_heal_event — healer tracks and decides fix vs regenerate
 *   validate_generated_test                          — generator self-validates before handing off to human review
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getRequirements } from "./tools/get-requirements.js";
import { getFrameworkConventions } from "./tools/get-framework-conventions.js";
import { getTestHealth } from "./tools/get-test-health.js";
import { validateGeneratedTest } from "./tools/validate-generated-test.js";

const server = new McpServer({
	name: "playwright-qa-context",
	version: "1.0.0",
});

getRequirements(server);
getFrameworkConventions(server);
getTestHealth(server);
validateGeneratedTest(server);

const transport = new StdioServerTransport();
await server.connect(transport);
