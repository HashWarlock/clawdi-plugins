---
name: productivity-task-digest
description: Summarize and triage your task backlog. Triggers on "show my tasks", "task status", "what am I behind on", "triage my tasks"
metadata:
  openclaw:
    tags: [productivity, tasks, triage]
---

## Task Digest

When the user asks about their tasks:

### Step 1: Gather tasks

Use `capability_execute` with capabilityId "project.list_tasks":
- All tasks assigned to the user
- Include: title, status, due date, priority, project/epic

### Step 2: Categorize

Group tasks by status:
- **Overdue**: past due date
- **Due Today**: due today
- **Due This Week**: due in the next 7 days
- **Upcoming**: due later
- **No Due Date**: needs triage

Flag issues:
- Tasks with no due date
- Tasks not updated in 14+ days
- Tasks blocked by others

### Step 3: Recommend triage actions

For overdue tasks: complete, reschedule, or remove
For stale tasks: check if still relevant
For tasks without dates: suggest due dates based on priority

### Output Format

**Task Digest — [Date]**

**Summary**: X total tasks, Y overdue, Z due this week

**Overdue** (needs immediate attention)
- [ ] Task — due [date], [days] days overdue — action recommendation

**Due Today**
- [ ] Task — priority and context

**Due This Week**
- [ ] Task — due [date]

**Needs Triage**
- Tasks with no date or stale tasks
- Recommended action for each

**Blocked**
- Tasks waiting on someone else — who and what
