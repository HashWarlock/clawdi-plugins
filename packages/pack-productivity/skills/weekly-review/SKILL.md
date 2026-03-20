---
name: productivity-weekly-review
description: Run a weekly review — what happened, what's next, what needs attention
argument-hint: "[--comprehensive]"
user-invocable: true
metadata:
  openclaw:
    tags: [productivity, review, planning]
---

## Weekly Review

When the user asks for a weekly review:

### Step 1: Review the past week

Use `capability_execute` with capabilityId "calendar.read_events":
- All meetings from the past 7 days
- Categorize: internal, external, 1:1, group

Use `capability_execute` with capabilityId "project.list_tasks":
- Tasks completed this week
- Tasks still open that were due this week

Use `capability_execute` with capabilityId "mail.read_inbox":
- Emails sent and received this week (volume)
- Important threads that are unresolved

### Step 2: Assess

- What was accomplished (completed tasks, meetings held)
- What slipped (overdue tasks, missed commitments)
- What emerged (new tasks, unexpected work)
- Time distribution (meetings vs. deep work vs. admin)

### Step 3: Plan next week

Use `capability_execute` with capabilityId "calendar.read_events":
- Next week's meetings

Use `capability_execute` with capabilityId "project.list_tasks":
- Tasks due next week
- Overdue tasks carrying over

### Step 4: Identify patterns

- Are meetings consuming too much time?
- Are tasks consistently slipping?
- Is there a project that needs more attention?

### Output Format

**Weekly Review — Week of [Date]**

**Accomplishments**
- Key things completed this week
- Meetings that moved things forward

**Slipped**
- Tasks that didn't get done and why
- Commitments that were missed

**Next Week Preview**

| Day | Key Meetings | Key Deadlines |
|---|---|---|
| Mon | meetings | tasks due |
| ... | ... | ... |

**Carry-Over Tasks**
- [ ] Tasks rolling into next week

**Time Distribution** (approximate)
- Meetings: X hours
- Deep work: X hours
- Admin/email: X hours
- Assessment: healthy/meeting-heavy/fragmented

**Attention Needed**
- Projects or areas that are falling behind
- People to follow up with
- Decisions to make

**Focus for Next Week**
Top 3 priorities for the coming week.
