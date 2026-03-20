---
name: ops-status-report
description: Generate a project or team status report with progress tracking, blockers, risk flags, and next steps. Triggers on "status report", "weekly update", "project status for [project]", "what's the status of [initiative]", "standup summary"
metadata:
  openclaw:
    tags: [operations, reporting, status, project-management]
---

## Status Report

When the user asks for a status report or project update:

### Step 1: Define report scope

Determine from the user:
- **Report type**: weekly team update, project status, executive summary, standup summary
- **Time period**: this week, this sprint, custom range
- **Projects/teams**: which projects or teams to include
- **Audience**: team members, management, stakeholders, executives
- **Format preference**: detailed, summary, or dashboard-style

### Step 2: Gather task and project data

Use `capability_execute` with capabilityId "project.list_tasks" to pull:
- Tasks completed during the reporting period
- Tasks in progress with current status
- New tasks created during the period
- Blocked or at-risk tasks with reasons
- Overdue tasks and their age
- Upcoming deadlines and milestones
- Sprint or iteration progress (velocity, burndown)

### Step 3: Calendar and meeting context

Use `capability_execute` with capabilityId "calendar.read_events" to check:
- Key meetings and decisions made during the period
- Upcoming important meetings or deadlines
- Milestone review dates
- Stakeholder touchpoints

### Step 4: Communication and collaboration signals

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Important announcements or decisions during the period
- Escalations or urgent issues raised
- Cross-team coordination threads
- Wins and celebrations shared by the team
- Concerns or frustrations expressed

### Step 5: Document context

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Project plans and OKR documents for progress tracking
- Decision logs and meeting notes from the period
- Design docs or specs recently completed or updated

### Step 6: Analyze and synthesize

Calculate:
- Completion rate vs plan
- Velocity trend (increasing, stable, declining)
- Blocker resolution time
- Risk trajectory (new risks, resolved risks, escalated risks)

Identify the top 3 highlights and top 3 concerns.

### Step 7: Distribute

Use `capability_execute` with capabilityId "mail.send_followup" to send:
- Status report to stakeholders and team distribution list

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Status report document for the record

### Output Format

**Status Report: [Team/Project] — [Period]**

**Summary**
3-4 sentence overview: overall health (green/yellow/red), biggest accomplishment, primary risk, and key focus for next period.

**Health Dashboard**

| Indicator | Status | Trend | Notes |
|---|---|---|---|
| Overall Progress | On Track / At Risk / Behind | improving/stable/declining | note |
| Timeline | Green / Yellow / Red | direction | note |
| Scope | Green / Yellow / Red | direction | note |
| Resources | Green / Yellow / Red | direction | note |
| Quality | Green / Yellow / Red | direction | note |

**Key Metrics**

| Metric | This Period | Last Period | Target | Status |
|---|---|---|---|---|
| Tasks Completed | X | X | X | on/off track |
| Tasks In Progress | X | X | - | - |
| Tasks Blocked | X | X | 0 | assessment |
| Velocity | X pts | X pts | X pts | on/off track |
| Sprint Progress | X% | - | 100% | on/off track |

**Accomplishments**
1. What was completed, why it matters, and its impact
2. What was completed, why it matters, and its impact
3. What was completed, why it matters, and its impact

**In Progress**

| Item | Owner | Status | ETA | Notes |
|---|---|---|---|---|
| task/initiative | name | X% complete | date | relevant context |

**Blockers & Risks**

| Issue | Type | Impact | Owner | Status | Action Needed |
|---|---|---|---|---|---|
| description | Blocker/Risk | High/Med/Low | name | Open/In Progress | what needs to happen |

**Decisions Made**
- Decision: what was decided, when, and by whom
- Decision: what was decided, when, and by whom

**Decisions Needed**
- Decision: what needs to be decided, deadline, and who decides
- Decision: what needs to be decided, deadline, and who decides

**Next Period Plan**

| Priority | Item | Owner | Target Date | Dependencies |
|---|---|---|---|---|
| 1 | what will be worked on | name | date | what it depends on |
| 2 | what will be worked on | name | date | what it depends on |
| 3 | what will be worked on | name | date | what it depends on |

**Milestones**

| Milestone | Original Date | Current Date | Status |
|---|---|---|---|
| milestone | date | date | On Track / At Risk / Completed / Missed |

**Team Notes**
- Capacity changes (PTO, new hires, departures)
- Process changes or improvements
- Recognition and wins worth highlighting

**Appendix: Detailed Task List**

Completed:
- [x] task name (owner)
- [x] task name (owner)

In Progress:
- [ ] task name — X% (owner)
- [ ] task name — X% (owner)

Blocked:
- [!] task name — blocked by [reason] (owner)
