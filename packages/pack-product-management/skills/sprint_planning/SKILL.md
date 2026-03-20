---
name: sprint_planning
description: Plan the next sprint by reviewing the backlog, assessing capacity, and proposing a sprint scope
metadata:
  openclaw:
    tags: [product-management, sprint, planning, agile]
---

# Sprint Planning

Plan the next sprint by reviewing the current backlog, assessing team capacity
and recent velocity, and proposing a balanced sprint scope. This skill pulls
from project management tools and recent team context to produce an actionable
sprint plan.

## When to Use

Activate this skill when the user wants to:

- Plan the next sprint or iteration
- Review and prioritize the backlog for the upcoming work period
- Balance sprint scope against team capacity
- Identify blockers or dependencies before committing to work
- Generate a sprint plan document to share with the team

## Workflow

### Step 1: Determine sprint parameters

Establish the sprint context:

- **Sprint number or name:** If the user specifies one, use it. Otherwise, infer from the current date.
- **Sprint duration:** Use the configured sprint length, or ask the user.
- **Sprint start and end dates:** Calculate from duration and the expected start date.
- **Team or project scope:** Which team, project, or board is this sprint for?

### Step 2: Review the current backlog

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `status`: "backlog" or "todo" (unstarted tasks ready for sprint)
  - `sortBy`: "priority"
  - `maxResults`: 40
  - `project`: the team or project if specified

From the results, categorize tasks:

- **P0 -- Must do:** Critical items, blockers, committed deadlines
- **P1 -- Should do:** High-value items that advance key goals
- **P2 -- Could do:** Nice-to-have improvements
- **Needs refinement:** Items too vague to estimate or commit to

### Step 3: Review in-progress work

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `status`: "in_progress"
  - `maxResults`: 20
  - `project`: the team or project if specified

Identify:

- Carry-over work from the previous sprint
- Items at risk of not completing
- Blocked items that need resolution

### Step 4: Check for scheduled commitments

Use `capability_execute` with the following parameters:

- **capabilityId:** `calendar.read_events`
- **packId:** `product-management`
- **args:**
  - `dateRange`: the sprint date range
  - `maxResults`: 20

Look for:

- Meetings that reduce available work time
- Planned releases or demos within the sprint
- Holidays or team member absences
- External deadlines that constrain the sprint

This capability is optional. If unavailable, estimate capacity without
calendar data and note the limitation.

### Step 5: Review recent discussions for context

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `product-management`
- **args:**
  - `query`: "sprint planning" or the project name
  - `maxResults`: 10
  - `dateRange`: last 7 days

Look for:

- Priorities discussed by stakeholders
- Concerns raised about upcoming work
- New requests that should be considered

This capability is optional. If unavailable, proceed without chat context.

### Step 6: Propose the sprint scope

Compose a balanced sprint plan:

1. Start with P0 carry-over items (these must be in the sprint)
2. Add P0 new items
3. Fill remaining capacity with P1 items
4. Add P2 items only if capacity remains and they are quick wins
5. Flag items that need refinement before they can be committed

## Output Format

```
## Sprint Plan: {sprint name or number}

**Dates:** {start date} - {end date} ({duration})
**Team/Project:** {team or project name}

---

### Sprint Goals

1. {goal 1: the main thing the team should accomplish this sprint}
2. {goal 2}
3. {goal 3}

### Carry-Over from Previous Sprint ({count} items)

| Task | Status | Assignee | Estimate | Notes |
|------|--------|----------|----------|-------|
| {task title} | {in progress / blocked} | {assignee} | {estimate} | {why it carried over} |
| {task title} | {status} | {assignee} | {estimate} | {notes} |

### Proposed New Work ({count} items)

**P0 -- Must Do**

| Task | Priority | Assignee | Estimate | Rationale |
|------|----------|----------|----------|-----------|
| {task title} | P0 | {assignee or unassigned} | {estimate} | {why this is P0} |
| {task title} | P0 | {assignee} | {estimate} | {rationale} |

**P1 -- Should Do**

| Task | Priority | Assignee | Estimate | Rationale |
|------|----------|----------|----------|-----------|
| {task title} | P1 | {assignee} | {estimate} | {rationale} |
| {task title} | P1 | {assignee} | {estimate} | {rationale} |

**P2 -- Stretch Goals**

| Task | Priority | Estimate | Notes |
|------|----------|----------|-------|
| {task title} | P2 | {estimate} | {notes} |

### Needs Refinement (Not Ready for Sprint)

- {task title}: {what needs to be clarified before committing}
- {task title}: {what needs clarification}

### Capacity Notes

- **Scheduled commitments:** {count} meetings, {any releases or demos}
- **Known absences:** {team members out and when}
- **Estimated available capacity:** {estimate}
- **Proposed workload:** {total estimate of committed items}
- **Buffer:** {remaining capacity as percentage}

### Blockers and Risks

1. **{blocker}:** {description and proposed resolution}
2. **{risk}:** {description and mitigation}

### Dependencies

- {task} depends on {team or system} for {what}
- {task} depends on {external factor}

---

*Backlog items reviewed: {count}. Items proposed: {count}. Items deferred: {count}.*
```

If the user wants to update the project management tool with the sprint plan,
offer to create tasks using `capability_execute` with `project.create_task`
for any new items that need to be added.
