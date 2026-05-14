---
app: TodoMVC
url: https://demo.playwright.dev/todomvc/
tags: "@smoke, @regression"
version: "1.0"
author: QA Team
date: 2026-04-28
---

## Scope

### Focus
- Adding and removing todo items
- Completing and uncompleting todos
- Filtering by All / Active / Completed
- Footer item count and Clear completed

### Exclude
- URL hash routing changes
- Keyboard shortcut navigation (tab order, arrow keys)
- Browser-specific localStorage limits

## Assumptions
- Application starts with an empty todo list (no pre-seeded data)
- localStorage is available and not blocked by browser policy
- Tests run against a single browser tab with no shared state between scenarios

---

## Requirements

### REQ-001: Add a Single Todo Item
A user can add a new todo by typing text into the input field and pressing Enter.

**Acceptance Criteria:**
- The input placeholder reads "What needs to be done?"
- Pressing Enter with non-empty text creates a new todo item
- The new item appears at the bottom of the list
- The input field is cleared after submission
- The footer appears and shows "1 item left"

**Priority:** @smoke, @regression

---

### REQ-002: Prevent Empty Todo Submission
The application must not create a todo when the user submits an empty input.

**Acceptance Criteria:**
- Pressing Enter on a blank input adds nothing to the list
- The todo list count remains unchanged
- No error message is shown

**Priority:** @regression

---

### REQ-003: Add Multiple Todo Items
A user can add several todos sequentially; all appear in the list in insertion order.

**Acceptance Criteria:**
- Each todo is added below the previous one
- The footer count increments correctly after each addition
- All item titles are preserved exactly as typed

**Priority:** @regression

---

### REQ-004: Mark a Single Todo as Complete
A user can check the checkbox beside a todo to mark it complete.

**Acceptance Criteria:**
- Clicking the circular toggle to the left of a todo marks it complete
- Completed todos are visually struck through
- The footer active count decrements by 1
- The item receives the `completed` CSS class

**Priority:** @smoke, @regression

---

### REQ-005: Mark All Todos Complete via Toggle-All
A single control marks all todos complete at once.

**Acceptance Criteria:**
- The "Mark all as complete" chevron marks every item complete
- Clicking it again returns all items to active state
- The toggle-all checkbox reflects the aggregate state (checked when all complete)

**Priority:** @smoke, @regression

---

### REQ-006: Filter Active Todos
The "Active" filter shows only incomplete todos.

**Acceptance Criteria:**
- Clicking "Active" hides completed todos from the list
- Incomplete todos remain visible
- The footer count reflects only active items

**Priority:** @regression

---

### REQ-007: Filter Completed Todos
The "Completed" filter shows only finished todos.

**Acceptance Criteria:**
- Clicking "Completed" shows only todos with the `completed` class
- Active todos are hidden
- Switching back to "All" restores full list visibility

**Priority:** @regression

---

### REQ-008: Clear All Completed Todos
A "Clear completed" button removes all finished todos at once.

**Acceptance Criteria:**
- The button appears in the footer when at least one todo is complete
- Clicking it removes all completed todos permanently
- Active todos are unaffected
- The button disappears when no completed todos remain

**Priority:** @smoke, @regression

---

### REQ-009: Edit a Todo Item
Double-clicking a todo label enters edit mode.

**Acceptance Criteria:**
- Double-clicking a todo reveals an inline text input pre-filled with the todo text
- Pressing Enter saves the edited text
- Pressing Escape discards the edit and restores the original text
- Saving an empty edit deletes the todo item

**Priority:** @regression

---

### REQ-010: Delete a Todo Item
A delete button appears on hover for each todo.

**Acceptance Criteria:**
- Hovering over a todo reveals an × (delete) button
- Clicking × removes the todo from the list immediately
- The footer count decrements accordingly
- The footer and toggle-all control disappear when all todos are deleted

**Priority:** @regression
