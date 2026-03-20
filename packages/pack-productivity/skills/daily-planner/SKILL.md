---
name: productivity-daily-planner
description: Generate a prioritized daily plan. Triggers on "plan my day", "what's on my plate", "start my day", "morning plan", "daily priorities"
metadata:
  openclaw:
    tags: [productivity, planning, daily]
---

## Daily Planner

When the user asks to plan their day:

### Step 1: Gather inputs

Use `capability_execute` with capabilityId "calendar.read_events":
- Today's meetings with times, attendees, and descriptions
- Meetings for the rest of the week (for context)

Use `capability_execute` with capabilityId "project.list_tasks":
- Tasks assigned to the user
- Tasks due today or overdue
- Tasks due this week

Use `capability_execute` with capabilityId "mail.read_inbox":
- Unread emails (count and from whom)
- Flagged/starred emails needing response

Use `capability_execute` with capabilityId "chat.search_messages" (if available):
- Direct messages needing response
- Mentions in the last 24 hours

### Step 2: Identify time blocks

Map out the day:
- Fixed blocks: meetings (with buffer before/after)
- Available blocks: gaps between meetings
- Total available deep work time

### Step 3: Prioritize

Rank tasks using Eisenhower matrix:
1. **Urgent + Important**: due today, blocking others, external deadlines
2. **Important + Not Urgent**: high-value work, strategic tasks
3. **Urgent + Not Important**: quick replies, small requests
4. **Neither**: defer or delegate

### Step 4: Assign tasks to time blocks

- Deep work in the longest available block
- Quick tasks before/after meetings
- Email/chat triage in a dedicated 30-min block

### Output Format

**Today's Plan — [Date]**

**Top Priority**: The #1 thing to accomplish today and why.

**Schedule**

| Time | Activity | Type |
|---|---|---|
| 9:00-9:30 | Email triage | admin |
| 9:30-10:00 | [specific task] | deep work |
| 10:00-11:00 | Meeting: [name] | meeting |
| ... | ... | ... |

**Task List** (prioritized)

Must Do Today:
- [ ] Task 1 — why it's urgent
- [ ] Task 2 — why it's urgent

Should Do Today:
- [ ] Task 3 — context
- [ ] Task 4 — context

Can Wait:
- [ ] Task 5 — when to do it instead

**Needs Response**
- Emails or messages requiring a reply, with who and topic

**This Week Context**
- Upcoming deadlines
- Meetings to prep for
