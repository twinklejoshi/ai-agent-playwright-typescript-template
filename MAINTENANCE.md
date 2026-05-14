# Maintenance & Evolution Guide

This document provides step-by-step workflows for maintaining the agent architecture and extending it safely.

---

## Quick Reference

- **`AGENTS.md`** — Architecture, roles, rules, and how to add new agents
- **`CUSTOM-MCP.md`** — Custom MCP tools, their purpose, and how to add new tools
- **`.github/agents/*.agent.md`** — Individual agent definitions (do not edit without consulting AGENTS.md)
- **`mcp-server/index.ts`** — Custom MCP server implementation
- **`test-health.json`** — Heal history (versioned; don't delete)
- **`utils/validate-generated-tests.ts`** — Quality gates (runs in CI)

---

## Workflow 1: Add a New Agent

**Use case:** You need a new specialized agent (e.g., API test planner, component test generator).

### Step 1: Define the role

Write down:
- What problem does it solve?
- What does it take as input?
- What does it produce as output?
- Which existing agents does it call or depend on?
- Which agents call it?

Example:
```
Role: API Test Generator
Input: OpenAPI spec + plan scenarios from API planner
Output: Test files in src/tests/api/generated/
Calls: (nothing)
Called by: API Orchestrator
```

### Step 2: Determine its tools

- What Playwright tools does it need? (list from `npx playwright run-test-mcp-server --list-tools`)
- What custom MCP tools does it need? (list from CUSTOM-MCP.md)
- Are there gaps? → You may need to add a custom tool (see Workflow 4)

### Step 3: Document startup sequence

In `.github/agents/`, create `<agent-name>.agent.md`:

```yaml
---
name: my-api-test-generator
description: Generate API tests from OpenAPI specs and test plans
tools:
  - search
  - edit
  - playwright-test/browser_navigate  # if needed
  # + any custom tools
model: Claude Sonnet 4
mcp-servers:
  playwright-test:
    type: stdio
    command: npx
    args:
      - playwright
      - run-test-mcp-server
    tools: ["*"]
  playwright-qa-context:
    type: stdio
    command: node
    args:
      - mcp-server/dist/index.js
    tools: ["*"]
---

# Your system prompt...
```

### Step 4: Write the system prompt

Include:
- **Startup sequence** — what tools to call first (non-negotiable)
- **Workflow** — step-by-step procedure
- **Conventions** — what rules this agent enforces
- **Key principles** — edge cases, guard rails
- **Output format** — exactly where files go, what headers they need

### Step 5: Update AGENTS.md

Add a section under "Agent Roles & Responsibilities":
- Copy the "role, enforced conventions, startup sequence, key rules, output" structure
- Add to the Rules Matrix if your agent enforces new conventions
- Note which other agents it integrates with

### Step 6: Test

Invoke the agent and verify:
- [ ] Startup sequence works (calls correct tools in order)
- [ ] Produces output in the documented location
- [ ] Output follows conventions (headers, structure, formatting)
- [ ] Integration with other agents is smooth

### Step 7: Commit

Message:
```
Add <agent-name> agent for <problem>

- Defines role, startup sequence, and conventions
- Produces <output format> to <output location>
- Integrates with <agent names>
- See AGENTS.md for details
```

---

## Workflow 2: Add a Custom MCP Tool

**Use case:** An agent needs project-specific intelligence that Playwright's built-in tools can't provide.

### Step 1: Identify what's missing

Ask:
- What structured data does the agent need?
- Where does that data live (filesystem, API, database)?
- Why can't a built-in tool provide it?

Example:
```
Agent: Healer
Need: Heal history per test (how many times has this test been healed?)
Where: test-health.json
Why: No built-in tool tracks this; Playwright doesn't know about our heal limits
```

### Step 2: Design the tool

Define:
- **Name** (snake_case): `get_test_health`, `get_test_failures`, etc.
- **Purpose**: One sentence
- **Inputs**: Required and optional parameters
- **Output**: JSON structure
- **Error cases**: What if the data doesn't exist?

### Step 3: Implement in `mcp-server/index.ts`

```typescript
server.tool(
  "your_tool_name",
  "Clear description of what this tool does and when agents should call it",
  {
    requiredParam: z.string().describe("What this param is"),
    optionalParam: z.string().optional().describe("Optional param")
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

### Step 4: Test locally

```bash
npm run mcp:build
node mcp-server/dist/index.js
# In another terminal: test the tool via CLI or agent invocation
```

### Step 5: Register in agent frontmatter

Add to every agent that calls it:

```yaml
tools:
  - playwright-qa-context/your_tool_name
```

And reference it in the agent's system prompt:

```markdown
## Startup sequence

1. Call `your_tool_name` to load ...
2. ...
```

### Step 6: Document in CUSTOM-MCP.md

Add a section under "Custom Tools Reference":
- Number it (e.g., "8. your_tool_name")
- Include: Purpose, Inputs, Output, Which agents call it, Why it exists, Assumptions

### Step 7: Update AGENTS.md (if applicable)

If your tool enforces or depends on a convention:
- Add to the Rules Matrix
- Document which agent relies on it

### Step 8: Commit

Message:
```
Add <tool-name> MCP tool

- Purpose: <one sentence>
- Inputs: <list of params>
- Agents: <which agents call it>
- See CUSTOM-MCP.md for details
```

---

## Workflow 3: Detect and Resolve Rule Conflicts

**Use case:** You've updated one agent and want to make sure it doesn't conflict with others.

### Step 1: Identify the rule

What convention or guard rail are you changing?

Examples:
- "Always use fixtures" (Generator rule)
- "Never use CSS selectors" (Healer rule)
- "Heal limit is 3" (Healer guard rail)

### Step 2: Check which agents enforce it

Search all `.github/agents/*.agent.md` files for mentions of the rule.

Example: Search for "fixture" → appears in Generator, Orchestrator, Planner

### Step 3: Review each mention

For each agent that mentions it, ask:
- Does it say the same thing, or different?
- Does it depend on this rule being true?
- Would changing it break this agent's workflow?

Example:
- Generator says: "Always use the fixture"
- Planner says: "Verify the fixture exists before planning"
- Conflict? No — they complement each other
- Safe to change? Only if both agents adapt

### Step 4: Update AGENTS.md Rules Matrix

Add the rule if it's new, or update if changing:

```markdown
| Convention | Enforcer | Consequences |
|---|---|---|
| My new rule | Agent X, Agent Y | What breaks if violated |
```

### Step 5: Update all affected agents

If you've changed a rule:
1. Update the system prompt in every agent that mentions it
2. Update the Startup Sequence if needed
3. Test each agent to confirm it still works

### Step 6: Audit with the checklist

Use the "Rules Audit Checklist" in AGENTS.md:

- [ ] Startup sequence is documented
- [ ] Conventions are listed explicitly
- [ ] Conflicts are identified and resolved
- [ ] Integration points are clear
- [ ] Error handling is defined

### Step 7: Commit

Message:
```
Update <rule> to <new behavior>

Affected agents: <list>
Reason: <why this change>
Testing: <manual verification or tests>

See AGENTS.md Rules Matrix for details
```

---

## Workflow 4: Upgrade Playwright

**Use case:** Playwright releases a new version with new MCP tools or breaking changes.

### Step 1: Update the dependency

```bash
npm upgrade @playwright/test
npm run mcp:build
npm test
```

### Step 2: Check for new tools

Review Playwright's release notes:
- Any new tools added to the MCP server?
- Any deprecated tools removed?

Example: Playwright 1.50 adds `browser_ai_inspect` — a new tool for AI-assisted element inspection.

### Step 3: Decide: adopt, ignore, or deprecate

For each new tool, ask:
- **Adopt**: Does it solve a problem our agents face? Add it to agent tool lists.
- **Ignore**: Does it seem useful but not essential? Leave it for later.
- **Deprecate**: Are we using a tool that's now deprecated? Plan a migration.

### Step 4: Update agent tool lists

If adopting new tools:
1. Add to `tools:` in every agent that would benefit
2. Update system prompts to explain when to use it
3. Test the agents with the new tool

### Step 5: Version the agents

Add a comment at the top of each agent:

```yaml
# playwright-test-generator.agent.md
# Tested with: Playwright @1.50.0+
# Custom MCP: playwright-qa-context@1.0.0
```

### Step 6: Test end-to-end

Run the full orchestrator pipeline:
- Planner explores the app
- Generator creates tests
- Tests run
- Healer fixes failures (if any)

### Step 7: Commit

Message:
```
Upgrade Playwright to v1.50.0

Changes:
- Added new tool: browser_ai_inspect (adopted in Generator)
- Deprecated tool: browser_snapshot (replaced with browser_ai_inspect)
- Agents tested end-to-end

See AGENTS.md version alignment section
```

---

## Workflow 5: Troubleshoot an Agent

**Use case:** An agent is misbehaving or producing incorrect output.

### Step 1: Identify the symptom

Examples:
- Agent ignores a convention (uses raw `page.*` instead of page object)
- Agent crashes on a specific app
- Agent's output violates project standards

### Step 2: Check the startup sequence

In the agent's `.agent.md`:
- [ ] Does it call `get_framework_conventions` first?
- [ ] Does it call `list_requirements` and `read_requirements` if applicable?
- [ ] Are tools being called in the documented order?

If startup is wrong, that's often the root cause.

### Step 3: Check the system prompt

Search the system prompt for:
- [ ] References to the tool that's misbehaving
- [ ] Examples showing the correct behavior
- [ ] Clear rules and boundaries

If the prompt is vague or contradicts other agents, clarify it.

### Step 4: Check tool output

Manually call the problematic tool to see what data the agent receives:

```bash
# Example: check what get_framework_conventions returns
node mcp-server/dist/index.js
# Then send: { "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "get_framework_conventions" } }
```

If the tool is returning wrong data, fix it in `mcp-server/index.ts`.

### Step 5: Test the agent in isolation

Create a minimal test case:
- Simple app (e.g., a static HTML page)
- Single scenario or requirement
- Run the agent and check output

This isolates whether it's the agent or the input data.

### Step 6: Update documentation

Once fixed:
- If a rule was unclear, clarify it in AGENTS.md
- If a tool was misbehaving, document the fix in CUSTOM-MCP.md
- If the agent has a new edge case, document it in its system prompt

### Step 7: Commit

Message:
```
Fix <agent name> <symptom>

Root cause: <what was wrong>
Fix: <what changed>
Testing: <how verified>
```

---

## CI Integration Checklist

The repo is wired to run quality gates on every PR:

- [ ] `.github/workflows/build.yml` runs `npm run validate:generated`
- [ ] `utils/validate-generated-tests.ts` checks generated test headers (`@generated`, `// req:`)
- [ ] Check for requirements coverage: are all REQs mapped to tests?
- [ ] Check for prohibited patterns: `waitForTimeout`, `networkIdle`, `test.only`
- [ ] Check for structure: `test.describe`, `test.step()` wrapping

**On agent update:** Ensure the CI still passes. If it fails, either:
1. The agent is now violating the rules (fix the agent)
2. The rules have changed (update the validator)

---

## Disaster Recovery

**Scenario: Agent rules are now contradictory and tests are failing.**

1. Revert the last agent change (or tool change)
   ```bash
   git revert <commit>
   npm run mcp:build
   ```

2. Review what changed in AGENTS.md and CUSTOM-MCP.md

3. Identify the conflict (see Workflow 3)

4. Fix carefully:
   - Update one agent at a time
   - Test each change
   - Commit separately with clear messages

**Scenario: Heal history (test-health.json) is corrupted or lost.**

1. Reset it to a clean state:
   ```bash
   git checkout HEAD~1 test-health.json
   ```

2. Or start fresh:
   ```bash
   echo '{ "tests": {} }' > test-health.json
   ```

3. Agents will build new heal history as they work

---

## Sign-Off Checklist for Major Changes

Before merging a PR that touches agents or MCP tools:

**Rules & Conventions:**
- [ ] No new rule conflicts (AGENTS.md reviewed)
- [ ] All affected agents updated in sync
- [ ] AGENTS.md Rules Matrix is current

**Custom MCP:**
- [ ] No new tool duplicates existing Playwright tools
- [ ] All new tools documented in CUSTOM-MCP.md
- [ ] Tool inputs/outputs are clear and validated
- [ ] `npm run mcp:build` succeeds

**Agent Changes:**
- [ ] Startup sequence is clear and non-negotiable
- [ ] System prompt examples match intended behavior
- [ ] Agent tested end-to-end (not just isolated)
- [ ] Integration with other agents verified

**Documentation:**
- [ ] AGENTS.md updated
- [ ] CUSTOM-MCP.md updated (if tools changed)
- [ ] Agent `.agent.md` file is clear and commented
- [ ] Commit message explains the why

**CI & Quality:**
- [ ] `npm run validate:generated` passes
- [ ] All tests pass
- [ ] No warnings or linting errors

---

## References

- Agent definitions: `.github/agents/*.agent.md`
- Agent governance: `AGENTS.md`
- MCP governance: `CUSTOM-MCP.md`
- MCP implementation: `mcp-server/index.ts`
- Validation rules: `utils/validate-generated-tests.ts`
- CI pipeline: `.github/workflows/build.yml`
