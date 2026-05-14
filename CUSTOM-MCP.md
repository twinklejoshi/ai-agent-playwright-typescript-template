# Custom MCP Server — `playwright-qa-context`

This document governs the custom MCP server that bridges Playwright's test execution with project-specific intelligence: requirements parsing, test failure analysis, framework conventions, and test health tracking.

---

## Architecture

```
Agents (.github/agents/*.agent.md)
    │
    ├─ Built-in tools: playwright-test/* (npx playwright run-test-mcp-server)
    │   └─ Browser automation, test running, locator generation
    │
    └─ Custom tools: playwright-qa-context/* (mcp-server/dist/index.js)
        └─ Project intelligence: requirements, test results, conventions, health
```

**The coupling story:**
- Built-in server tells you: "Test ran, test failed, element was found"
- Custom server tells you: "Which requirement is broken, here's structured failure data, here's what this project's conventions are, here's the test health status"

---

## Custom Tools Reference

This server provides custom tools focused on project-specific intelligence: test results analysis, requirements normalization, framework conventions, and test health tracking.

(For Jira integration, use Jira's native MCP instead of custom tools.)

### 1. `get_test_failures` — Structure test failure data

**Purpose:**
The built-in `test_run` returns raw terminal output (ANSI codes, timing lines, retry headers). This tool reads `test-results/results.json` (written by Playwright's JSON reporter) and returns clean, agent-consumable failure data.

**Inputs:**
```json
{
  "project": "chromium"  // optional: filter by Playwright project name (e.g., "chromium", "firefox")
}
```

**Output:**
```json
{
  "totalFailures": 2,
  "failures": [
    {
      "testName": "should display added todo using fragile CSS selector",
      "file": "src/tests/ui/self-healing-demo.spec.ts",
      "line": 28,
      "project": "chromium",
      "retry": 0,
      "status": "failed",
      "errorMessage": "locator('.todo-list > li > .view > label') resolved to 0 elements",
      "errorStack": "...",
      "failedStep": "expect(todoLabel).toHaveText",
      "screenshotPath": "test-results/screenshot.png",
      "durationMs": 1250
    }
  ]
}
```

**Which agents call it:**
- **Healer** — after `test_run`, to get structured failure details for targeted debugging
- **Orchestrator** — in Phase 3 (Execute), to show failures before asking whether to heal

**Why this tool exists:**
Without it, the Healer would parse ANSI escape codes, guess file/line numbers, and manually check for screenshots. With it, Healer goes directly to the exact failure location with full context.

**Assumptions:**
- `test-results/results.json` exists (from `playwright.config.ts` JSON reporter)
- Test project is configured in `playwright.config.ts`

---

### 2. `normalize_requirements` — Normalize requirements from any source

**Purpose:**
Convert requirements from Jira ticket text, pasted text, or file text into one canonical JSON format for downstream planning.

**Inputs:**
```json
{
  "source": "jira | file | pasted",
  "rawText": "...requirements text...",
  "sourceRef": "PROJ-123 or requirements/todomvc-requirements.md",
  "app": "optional override",
  "url": "optional override",
  "version": "optional override",
  "tags": "optional override",
  "author": "optional override"
}
```

**Output:**
```json
{
  "source": "jira",
  "sourceRef": "PROJ-123",
  "app": "TodoMVC",
  "url": "https://demo.playwright.dev/todomvc/",
  "version": "1.0",
  "tags": ["@smoke", "@regression"],
  "author": "QA Team",
  "scope": {
    "focus": ["Add and complete todos"],
    "exclude": ["Browser-specific behavior"]
  },
  "assumptions": ["User starts with empty list"],
  "requirementCount": 2,
  "requirements": [
    {
      "id": "REQ-001",
      "title": "Add a todo",
      "acceptanceCriteria": ["User enters non-empty text and presses Enter"],
      "priorityTags": ["@smoke"]
    }
  ]
}
```

**Which agents call it:**
- **Planner** — before planning, to get a source-agnostic requirements contract
- **Orchestrator** — Phase 1 intake normalization

**Why this tool exists:**
Downstream phases should not branch by source. This tool enforces a single canonical requirements shape.

### Expected Requirement Format (Jira, File, or Pasted)

Use the same structure regardless of source. This keeps normalization deterministic and downstream planning simple.

Minimal template:

```text
App: TodoMVC
Url: https://demo.playwright.dev/todomvc/
Version: 1.0
Tags: @smoke, @regression
Author: QA Team

Scope Focus:
- Add and complete todos

Scope Exclude:
- Browser-specific behavior

Assumptions:
- User starts with empty list

REQ-001: Add a todo
Acceptance Criteria:
- User enters non-empty text and presses Enter
- New item appears in the list
Priority: @smoke

REQ-002: Prevent empty submit
Acceptance Criteria:
- Pressing Enter on empty input does not add an item
Priority: @regression
```

Required fields:
- `App`, `Url`, `Version`, `Tags`, `Author`
- At least one `REQ-NNN: <title>` block
- Each requirement includes `Acceptance Criteria` list and `Priority`

Notes:
- `REQ-NNN` is normalized to zero-padded format (for example `REQ-1` becomes `REQ-001`).
- Tags and priority values are normalized to arrays with `@` prefix.
- The same normalized JSON contract is returned for Jira, file, and pasted modes.

---

### 3. Using Jira's Native MCP (Not Custom)

**Use Jira's native MCP instead of a custom tool.**

If requirements live in Jira, agents should use Jira's built-in MCP server, not a custom one. This avoids duplication and keeps you on Jira's maintained tooling.

**How to enable:**
1. Register Jira's MCP in `.vscode/mcp.json`
2. Reference it in agent frontmatter (`.github/agents/*.agent.md`)
3. Agents can then call Jira's native tools to fetch issues/requirements

**Which agents would use it:**
- **Planner** — to load requirements from Jira ticket instead of a local file
- **Orchestrator** — Phase 1 startup, if user provides a Jira ticket ID

**Why use native Jira MCP:**
- Maintained by Atlassian (not on us)
- Handles API auth, pagination, ADF parsing
- Covers more Jira operations (search, create, update, link issues)
- Consistent with Jira's evolving API

---

### 4. `get_framework_conventions` — Load project conventions

**Purpose:**
Return this project's established conventions for POM, tagging strategy, locator preferences, fixture naming, mock data organization, and file structure so agents can apply them consistently.

**Inputs:**
```json
{
  "section": "all"  // optional: "all", "pom", "tagging", "locators", "testSteps", "mockData", "environmentVariables", "fileStructure", or "generatedTestHeaders"
}
```

**Output (all sections):**
```json
{
  "pom": {
    "description": "Page Object Model is mandatory...",
    "uiPagesPath": "src/pages/ui/",
    "apiPagesPath": "src/pages/api/",
    "rules": [
      "Every UI interaction must go through a page object method",
      "Spec files call page methods only — no raw page.locator() in tests",
      ...
    ]
  },
  "tagging": {
    "description": "Every test must have at least one tag...",
    "validTags": ["@regression", "@smoke", "@customer", "@internal"],
    "rules": ["@smoke: critical path tests, fast execution...", ...]
  },
  "locators": {
    "description": "Locator preference order...",
    "priority": [
      "1st: data-test attribute",
      "2nd: ARIA role",
      "3rd: Label",
      ...
    ],
    "rules": [...]
  },
  "testSteps": {...},
  "mockData": {...},
  "environmentVariables": {...},
  "fileStructure": {...},
  "generatedTestHeaders": {...}
}
```

**Which agents call it:**
- **Planner** — startup sequence, to load tag definitions before designing scenarios
- **Generator** — startup sequence, to load POM/fixture/mock-data conventions before writing tests
- **Healer** — startup sequence, to load locator strategy before healing selectors

**Why this tool exists:**
Agents need a single source of truth for project conventions. Without it, agents would either hardcode conventions (breaks if standards change), ask users repeatedly, or make inconsistent choices. The CONVENTIONS object in `mcp-server/index.ts` is the single source; update it once and all agents pick it up.

**Conventions covered:**
- **POM** — Page Object Model rules, paths, import patterns
- **Tagging** — Valid tags, priority mapping, required per test
- **Locators** — Preference order (getByTestId > getByRole > getByLabel > ...)
- **Test Steps** — test.step() requirements
- **Mock Data** — where to store, never hardcode
- **Environment Variables** — BASE_URL, API_BASE_URL, ENVIRONMENT
- **File Structure** — where tests, fixtures, pages, plans, mock data live
- **Generated Test Headers** — required comments for provenance/traceability

---

### 5. `get_test_health` — Check heal history for a test

**Purpose:**
Retrieve how many times a specific test has been healed and from which plan it was generated. This prevents over-healing by enforcing a heal limit (default: 3).

**Inputs:**
```json
{
  "testFile": "src/tests/ui/generated/add-todo-item.spec.ts"
}
```

**Output (if test has been healed):**
```json
{
  "healCount": 1,
  "lastHealed": "2026-05-06T12:30:00.000Z",
  "healHistory": [
    {
      "date": "2026-05-06T12:30:00.000Z",
      "fix": "Fixed stale selector: replaced .todo-list > li > .view > label with getByTestId('todo-title')"
    }
  ],
  "planSource": "specs/todomvc-test-plan.md",
  "recommendation": null  // "regenerate" if healCount >= 3
}
```

**Output (if test has never been healed):**
```
No heal history for '<file>'.
This test has never been healed. Proceed with normal healing.
After healing, call record_heal_event to keep health data current.
```

**Which agents call it:**
- **Healer** — startup sequence, to check if test has been healed >= 3 times; if so, **STOP** and recommend regeneration

**Why this tool exists:**
Without it, Healer could indefinitely patch a broken test:
- Heals once: selector was stale, fixed
- Heals twice: assertion was wrong, fixed
- Heals thrice: test is structurally broken, but healer keeps trying

The heal limit (3) forces a decision: either the test works or regenerate from plan.

**Assumptions:**
- Test file has a `// @generated` header linking to plan source
- Heal history is stored in `test-health.json` (versioned in git, shared across sessions)

---

### 6. `list_test_health` — List all healed tests

**Purpose:**
Retrieve heal history for all tracked tests in the suite, categorized by health status.

**Inputs:**
None.

**Output:**
```json
{
  "summary": "# Test Health Summary\n\n## ⚠️  Needs Regeneration (2)\nHeal count ≥ 3 — regenerate from source plan:\n  src/tests/ui/generated/filter-todos.spec.ts — healed 3x (last: 5/5/2026)\n  ...\n\n## ✅ Healthy (3)\n  src/tests/ui/generated/add-todo.spec.ts — healed 1x (last: 5/6/2026)\n  ..."
}
```

**Which agents call it:**
- **Healer** — startup sequence (if healing whole suite), to get overview of test health
- **Orchestrator** — Phase 4, to show user which tests are over-healed before attempting repair

**Why this tool exists:**
Gives agents (and humans) visibility into:
1. Which tests are healthy (0 heals)
2. Which have been healed once or twice (monitored but OK)
3. Which have been healed 3+ times (should be regenerated, not healed further)

---

### 7. `record_heal_event` — Log a successful test fix

**Purpose:**
Record that a test was successfully healed, incrementing its heal count and storing what was fixed. Makes heal history durable across sessions.

**Inputs:**
```json
{
  "testFile": "src/tests/ui/generated/add-todo-item.spec.ts",
  "fix": "Fixed stale selector: replaced .todo-list > li > .view > label with getByTestId('todo-title')",
  "healType": "selector",
  "evidence": "Screenshot at test-results/screenshot.png shows label element missing the .view wrapper; getByTestId('todo-title') resolved correctly",
  "productBehaviorChanged": false,
  "planSource": "specs/todomvc-test-plan.md",
  "humanApprovedAssertionChange": true,   // required only when healType="assertion"
  "approvalNote": "Approved by QA lead — assertion updated to match new copy"  // required only when healType="assertion"
}
```

**Output:**
```json
{
  "message": "Recorded heal event for 'src/tests/ui/generated/add-todo-item.spec.ts'.\nHeal count: 2/3"
}
```

**Which agents call it:**
- **Healer** — after successfully fixing and re-running a test (before moving to next test)

**Why this tool exists:**
Without it:
- Heal count is lost between sessions
- No record of what was fixed or when
- No way to detect over-healing across invocations

With it:
- Heal history is persistent (stored in `test-health.json`, versioned in git)
- Each session can see prior sessions' fixes
- Heal limit guards are informed by real, durable history

**Side effects:**
- Updates `test-health.json` (written back to disk)
- If healCount reaches 3, recommendation is set to "regenerate"

---

### 8. `validate_generated_test` — Validate test against framework conventions

**Purpose:**
Validate a generated test file against framework conventions immediately after generation. Returns FAIL violations (must fix before commit) and WARN suggestions (nice to have).

**Inputs:**
```json
{
  "testFilePath": "src/tests/ui/generated/add-todo.spec.ts"
}
```

**Output:**
```json
{
  "verdict": "PASS",  // "PASS" or "FAIL"
  "failures": [],     // must-fix violations
  "warnings": [
    {
      "level": "WARN",
      "rule": "use-test-steps",
      "message": "No test.step() calls found. Wrap logical actions in test.step() for report readability.",
      "line": null
    }
  ]
}
```

**Which agents call it:**
- **Generator** — after `generator_write_test`, to catch convention violations before reporting done
- **Orchestrator** — Phase 2, to ensure generated tests meet quality gates before advancing to execution

**Why this tool exists:**
The generator writes tests from browser interactions — it doesn't inherently know POM rules or tagging requirements. This tool gives immediate FAIL/WARN feedback so violations are caught and fixed before human review, not at commit time or in CI.

**Checks (FAIL violations):**
- No inline locators: test uses `page.locator()`, `page.click()`, etc. instead of page object methods
- No hardcoded URLs: test has http:// or https:// URLs instead of `process.env.BASE_URL`
- Test tags required: `test()` call missing `{ tag: [TAGS.*] }`
- Fixture import required: `import { test } from '@playwright/test'` instead of fixture file
- Line numbers included for easier fixing

**Checks (WARN suggestions):**
- Use test.step() for logical step wrapping
- Meaningful assertions: not just existence checks, add value assertions
- Prefer stable locators: avoid CSS class/ID selectors

**Assumptions:**
- Test file exists at the provided path
- File is TypeScript/JavaScript Playwright test syntax

---

## How to Add a New Custom Tool

1. **Define the tool in `mcp-server/index.ts`:**
   ```typescript
   server.tool(
     "your_tool_name",
     "Clear description of what this tool does and when agents should call it",
     {
       requiredParam: z.string().describe("..."),
       optionalParam: z.string().optional().describe("...")
     },
     async ({ requiredParam, optionalParam }) => {
       // Read data, parse, return JSON
       return {
         content: [
           {
             type: "text" as const,
             text: JSON.stringify({ result: "..." }, null, 2)
           }
         ]
       };
     }
   );
   ```

2. **Build and test locally:**
   ```bash
   npm run mcp:build
   # Test via agent invocation or manual call
   ```

3. **Register in agent frontmatter:**
   Add to `tools:` list in every agent that calls it:
   ```yaml
   tools:
     - playwright-qa-context/your_tool_name
   ```

4. **Document in agent system prompt:**
   Reference the tool in the agent's startup sequence or workflow section:
   ```markdown
   ## Startup sequence
   1. Call `your_tool_name` to load...
   ```

5. **Document in this file:**
   Add a section under "Custom Tools Reference" with: purpose, inputs, outputs, which agents call it, why it exists, assumptions.

6. **Update `AGENTS.md` (if applicable):**
   If the tool enforces or depends on a convention, add to Rules Matrix.

7. **Commit:**
   ```
   Add <tool-name> MCP tool
   
   - Purpose: <one sentence>
   - Inputs: <list of params>
   - Agents: <which agents call it>
   - See CUSTOM-MCP.md for details
   ```

---

## When to Create a Custom Tool vs. Using Playwright's Built-in Tools

**Create a custom tool when:**
- The tool reads/writes project-specific data (requirements, test health, conventions)
- The tool needs project context (fixture patterns, mock data locations, file structure)
- Playwright's built-in tools can't provide the structured data you need

**Use Playwright's built-in tools when:**
- The tool is generic browser automation (click, type, navigate)
- The tool is test lifecycle (run, debug, list tests)
- The tool inspects page state (snapshot, generate locator)

---

## Custom MCP Server — Build & Deploy

**Build:**
```bash
npm run mcp:build
```

**Output:** `mcp-server/dist/index.js` (compiled TypeScript)

**Registration in Claude Code (`.vscode/mcp.json`):**
```json
{
  "servers": {
    "playwright-qa-context": {
      "type": "stdio",
      "command": "node",
      "args": ["mcp-server/dist/index.js"]
    }
  }
}
```

**Agent registration (in `.github/agents/*.agent.md`):**
```yaml
mcp-servers:
  playwright-qa-context:
    type: stdio
    command: node
    args:
      - mcp-server/dist/index.js
    tools: ["*"]
```

---

## Data Files & State

### `test-results/results.json`
- **Written by:** Playwright test runner (via JSON reporter in `playwright.config.ts`)
- **Read by:** `get_test_failures` tool
- **Format:** Playwright JSON reporter output (nested suites/specs/tests/results)

### `test-health.json`
- **Written by:** `record_heal_event` tool
- **Read by:** `get_test_health` and `list_test_health` tools
- **Format:** `{ [testFile]: { healCount, lastHealed, healHistory, planSource, recommendation } }`
- **Versioned:** Yes, in git (shared across all sessions and CI)

### `requirements/*.md`
- **Written by:** User or CI
- **Read by:** `normalize_requirements` tool (pass file text as `rawText` with `source: "file"`)
- **Format:** Plain text or markdown following the requirements template in CUSTOM-MCP.md

---

## Maintenance Checklist

- [ ] New tool is defined in `mcp-server/index.ts`
- [ ] Tool name follows snake_case convention
- [ ] Tool has clear docstring (when agents should call it)
- [ ] All inputs documented with `z.describe()`
- [ ] Output is valid JSON
- [ ] Tool is referenced in all agents that need it
- [ ] Documentation added to this file (purpose, inputs, outputs, usage)
- [ ] Agent system prompts mention when to call it
- [ ] Tool integrates with existing conventions (or updates them in AGENTS.md)
- [ ] `npm run mcp:build` succeeds
- [ ] Changes versioned in git

---

## References

- MCP SDK docs: https://modelcontextprotocol.io/
- Agent tool declarations: `.github/agents/*.agent.md`
- Server implementation: `mcp-server/index.ts`
- Server configuration: `.vscode/mcp.json`
- Framework conventions: `CONVENTIONS` object in `mcp-server/index.ts`
- Test health tracking: `test-health.json`
- Requirements format: `requirements/todomvc-requirements.md`
