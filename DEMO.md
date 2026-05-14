# MLCon 2026 — Live Demo Guide

**Talk:** Generating Playwright Tests with MCP and Playwright Agents for Intelligent QA Automation

This file is the talk's live demo companion. It maps every demo action to the three audience takeaways.

---

## Prerequisites

```bash
npm run setup
```

Ensure `.vscode/mcp.json` is active in your MCP-enabled client (VSCode with Claude extension or Claude Code CLI).

---

## The Architecture in One Diagram

```
 Requirements File          Playwright Agent
 requirements/*.md  ──────► .github/agents/*.agent.md
        │                           │
        │                    ┌──────┴───────┐
        │                    ▼              ▼
        │         playwright-test       playwright-qa
        │          MCP server           MCP server (custom)
        │       (npx playwright         (mcp-server/)
        │        run-test-mcp-server)
        │                    │              │
        │            browser tools    requirements tools
        │            test lifecycle   get_test_failures
        │            planner/gen/heal
        │                    │
        └──────── Test Plan ─┘
                  specs/*.md
                      │
                      ▼
             Generated Tests
          src/tests/ui/generated/
                      │
                      ▼
               Test Results
           test-results/results.json
                      │
                      ▼  (if failures)
              get_test_failures        ◄── custom MCP coupling point
                      │
                      ▼
               Healer Agent
          fixes selectors/assertions
```

The custom MCP server's `get_test_failures` is the **coupling point** — it turns raw JSON reporter output into structured input the healer agent can act on immediately.

---

## Takeaway 1: Playwright Agents + AI-Driven Testing Workflows

### What is a Playwright Agent?

A Playwright Agent is a Claude agent defined in `.github/agents/*.agent.md`. Each file has:

1. **Frontmatter** — declares which MCP tools the agent can use, which model, which servers
2. **System prompt** — defines the agent's role, workflow, and decision logic

```yaml
# .github/agents/playwright-test-generator.agent.md (excerpt)
---
name: playwright-test-generator
tools:
  - playwright-test/browser_click
  - playwright-test/browser_snapshot
  - playwright-test/generator_setup_page
  - playwright-test/generator_write_test
model: Claude Sonnet 4
mcp-servers:
  playwright-test:
    command: npx playwright run-test-mcp-server
---
```

### What does `npx playwright run-test-mcp-server` provide?

This is Playwright's built-in MCP server. It exposes:

| Tool category | Tools | What agents use them for |
|---|---|---|
| Browser automation | `browser_click`, `browser_type`, `browser_navigate`, `browser_snapshot` | Explore the app, execute test steps |
| Locator generation | `browser_generate_locator` | Suggest robust selectors during healing |
| Planning | `planner_setup_page`, `planner_save_plan` | Set up browser context, save test plan |
| Generation | `generator_setup_page`, `generator_read_log`, `generator_write_test` | Record interactions, produce spec files |
| Test lifecycle | `test_run`, `test_debug`, `test_list` | Run tests, pause at failure, list test IDs |

**Demo action:** Open `.github/agents/playwright-test-generator.agent.md` — show the tool list and system prompt side by side.

### The four agents and their roles

| Agent | File | Role |
|---|---|---|
| Orchestrator | `playwright-test-orchestrator.agent.md` | Runs the full pipeline with HITL checkpoints |
| Planner | `playwright-test-planner.agent.md` | Explores the app, produces `specs/*.md` |
| Generator | `playwright-test-generator.agent.md` | Turns plan scenarios into `.spec.ts` files |
| Healer | `playwright-test-healer.agent.md` | Debugs failures, patches selectors/assertions |

---

## Takeaway 2: Blueprint for Coupling MCP Servers with Playwright's Agent Framework

### The coupling pattern

The built-in `playwright-test` server handles **execution** — browser control, test running, locator inspection.

Your **custom MCP server** (`mcp-server/`) handles **project intelligence** — things the built-in server has no concept of: your requirements format, your structured test results.

```
Built-in server  →  WHAT happened (test ran, test failed, element found)
Custom server    →  WHAT IT MEANS (which requirement is broken, which file to fix)
```

### Demo: invoking the full pipeline

In your MCP-enabled client, invoke the orchestrator:

```
@playwright-test-orchestrator

<requirements-file>requirements/todomvc-requirements.md</requirements-file>
```

**What happens step by step:**

**Phase 1 — Plan**
1. Agent reads `requirements/todomvc-requirements.md`
2. Agent calls `playwright-qa-context/normalize_requirements` with `source: "file"` + `rawText` → gets structured REQ-001..REQ-010 with acceptance criteria
3. Agent calls `playwright-test/planner_setup_page` → opens browser on TodoMVC URL from requirements frontmatter
4. Agent explores app with `browser_snapshot`, `browser_click`, `browser_navigate`
5. Agent saves plan: `playwright-test/planner_save_plan` → `specs/todomvc-test-plan.md`
6. **⏸ CHECKPOINT** — agent presents plan, waits for your "Go"

**Phase 2 — Generate**

For each scenario in the plan:
1. `playwright-test/generator_setup_page` — fresh browser context
2. `browser_click`, `browser_type`, `browser_snapshot` — executes each step live
3. `playwright-test/generator_read_log` — reads the interaction log
4. `playwright-test/generator_write_test` — writes `src/tests/ui/generated/<scenario>.spec.ts`
5. **⏸ CHECKPOINT** — agent shows list of generated files, waits for "Go"

**Phase 3 — Execute**
1. `playwright-test/test_run` — runs all generated tests
2. If failures: `playwright-qa/get_test_failures` → structured data (file, line, error, screenshot)
3. **⏸ CHECKPOINT** — shows failure table, asks to heal

**Phase 4 — Heal**
1. `playwright-test/test_debug` — pauses at the failure point
2. `playwright-test/browser_snapshot` — captures current page state
3. `playwright-test/browser_generate_locator` — suggests robust selector
4. `edit` — patches the test file
5. `playwright-test/test_run` — verifies fix, iterates until passing

### Why `get_test_failures` is the coupling tool

`test_run` returns raw terminal output. The healer has to parse ANSI-coded text to find what failed.

`get_test_failures` reads `test-results/results.json` (the JSON reporter we added to `playwright.config.ts`) and returns:

```json
{
  "totalFailures": 2,
  "failures": [
    {
      "testName": "should display added todo using fragile CSS selector",
      "file": "src/tests/ui/self-healing-demo.spec.ts",
      "line": 28,
      "project": "chromium",
      "errorMessage": "locator('.todo-list > li > .view > label') resolved to 0 elements",
      "failedStep": "expect(todoLabel).toHaveText",
      "screenshotPath": "test-results/screenshot.png"
    }
  ]
}
```

The healer goes directly to `test_debug` on the exact file and line. **That** is MCP coupling — custom intelligence augmenting built-in execution.

### How to build your own custom MCP tool

`mcp-server/index.ts` is the reference implementation. The pattern:

```typescript
// 1. Import the McpServer
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "your-qa-server", version: "1.0.0" });

// 2. Register a tool
server.tool(
  "your_tool_name",
  "What this tool does and when agents should call it",
  { param: z.string().describe("What this param is") },
  async ({ param }) => ({
    content: [{ type: "text", text: JSON.stringify({ result: "..." }) }]
  })
);

// 3. Connect to stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

Register it in `.vscode/mcp.json`:

```json
{
  "servers": {
    "your-qa-server": {
      "type": "stdio",
      "command": "node",
      "args": ["mcp-server/dist/index.js"]
    }
  }
}
```

Reference it in your agent frontmatter:

```yaml
mcp-servers:
  your-qa-server:
    type: stdio
    command: node
    args: [mcp-server/dist/index.js]
    tools: ["*"]
```

---

## Takeaway 3: Best Practices for Validating and Maintaining Generated Tests

### The generated test standard

Every file in `src/tests/ui/generated/` must have this header:

```typescript
// @generated by playwright-test-orchestrator   ← provenance
// spec: specs/todomvc-test-plan.md             ← which plan produced this
// scenario: Adding New Todos                   ← which scenario
// req: REQ-001, REQ-002, REQ-003              ← requirement traceability
```

This enables:
- **Provenance** — know which agent generated the test and from which plan
- **REQ traceability** — link tests back to requirements; detect coverage gaps
- **Maintenance** — when a requirement changes, find affected tests instantly

### Quality gates

```bash
npm run validate:generated
```

Checks every file in `src/tests/ui/generated/` for:

| Rule | Why |
|---|---|
| `@generated` header | Provenance — was this actually agent-generated? |
| `// req:` reference | Traceability — which requirement does this test cover? |
| `test.describe` block | Structure — must be grouped by feature |
| No `waitForTimeout` | Reliability — use Playwright auto-waiting |
| No `networkidle` | Reliability — deprecated and flaky |
| Has `expect()` assertions | Correctness — tests must verify something |
| No `test.only` | CI safety — can't block the full suite |

REQ coverage check — reports which requirements have no generated test:

```
Requirements Coverage
─────────────────────────────────────────
Total requirements : 10
Covered by tests   : 10
✓  All requirements have test coverage.
```

This runs in CI via `.github/workflows/build.yml` on every PR.

### The self-healing demo

`src/tests/ui/self-healing-demo.spec.ts` shows the before/after:

```typescript
// BRITTLE (before healing) — marked test.fixme
test.fixme("should display todo using fragile CSS selector", async ({ page }) => {
  // BRITTLE: .todo-list > li > .view > label breaks when CSS changes
  const todoLabel = page.locator(".todo-list > li > .view > label");
  await expect(todoLabel).toHaveText("Buy groceries");
});

// HEALED (after healing) — passes reliably
test("should display todo using semantic locator", async ({ page }) => {
  // HEALED: getByTestId survives CSS renames and restructuring
  await expect(page.getByTestId("todo-title")).toHaveText("Buy groceries");
});
```

**Demo action:** Run the brittle suite → show failure → invoke healer agent → show it call `browser_generate_locator` → show the edit → run again → all green.

### When to generate vs heal vs manually fix

| Situation | Action |
|---|---|
| New feature, requirements exist | Run orchestrator with requirements file |
| New feature, no requirements | Write `requirements/feature.md` first, then orchestrator |
| Test fails due to UI change (selector) | Run healer agent |
| Test fails due to logic change (new requirement) | Update requirement, regenerate that scenario |
| Generated test has wrong assertions | Regenerate the specific scenario with corrected plan |
| Test is fundamentally flawed | Mark `test.fixme`, file requirement update, regenerate |

### The test maintenance lifecycle

```
Requirements change
        │
        ▼
Update requirements/feature.md
        │
        ▼
Re-run orchestrator for affected scenarios
        │
        ▼
validate:generated catches coverage gaps
        │
        ▼
Merge generated tests via PR
        │
        ▼
CI runs tests + validate:generated on every PR
        │
        ├── All pass ──────────────────► Done
        │
        └── Failures ──────────────────► Healer agent
                                               │
                                               ▼
                                        Patches test file
                                               │
                                               ▼
                                         Re-run → green
```

---

## Repo map for the talk

| File / Folder | What to show |
|---|---|
| `requirements/todomvc-requirements.md` | Structured requirements format — REQ IDs, acceptance criteria, scope |
| `specs/todo-test-plan.md` | What the Planner agent produces from requirements + app exploration |
| `src/tests/ui/generated/` | 5 test files, all agent-generated, all with `// req:` traceability |
| `src/tests/ui/self-healing-demo.spec.ts` | Brittle vs healed side-by-side, `test.fixme` on broken ones |
| `.github/agents/` | 4 agent files — show frontmatter + system prompt structure |
| `mcp-server/index.ts` | The blueprint — `get_test_failures`, `normalize_requirements` |
| `utils/validate-generated-tests.ts` | Quality gate — rules + REQ coverage check |
| `.vscode/mcp.json` | How MCP servers are registered for the agent framework |
| `.github/workflows/build.yml` | CI wiring — `validate:generated` runs on every PR |
