---
name: stakeholder_update
description: Prepare a stakeholder update with project status, key decisions, risks, and next steps
metadata:
  openclaw:
    tags: [product-management, stakeholder, communication, status]
---

# Stakeholder Update

Prepare a comprehensive stakeholder update by gathering current project status,
recent activity, key decisions, and upcoming milestones. This skill produces
a polished, audience-appropriate communication ready to send or present.

## When to Use

Activate this skill when the user wants to:

- Prepare a weekly or bi-weekly status update for leadership
- Write an executive summary of project progress
- Communicate key decisions and their rationale to stakeholders
- Prepare talking points for a stakeholder meeting
- Send a project status email to cross-functional partners

## Workflow

### Step 1: Define the update context

Establish the parameters:

- **Project or product:** What is the update about?
- **Audience:** Executive leadership, cross-functional partners, the board, investors?
- **Cadence:** Weekly, bi-weekly, monthly, ad hoc?
- **Format:** Email, presentation talking points, or document?
- **Tone:** The audience determines tone -- leadership wants concise with decisions needed; partners want detailed with dependencies.

### Step 2: Gather project status

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `status`: "all"
  - `maxResults`: 40
  - `project`: the project or product area
  - `sortBy`: "updated"

From the results, build a status picture:

- **Completed this period:** tasks finished since the last update
- **In progress:** active work and its current state
- **Blocked:** items that cannot proceed and why
- **Starting next:** work about to begin

### Step 3: Check upcoming calendar events

Use `capability_execute` with the following parameters:

- **capabilityId:** `calendar.read_events`
- **packId:** `product-management`
- **args:**
  - `dateRange`: next 14 days
  - `maxResults`: 20
  - `query`: the project name or related keywords

Identify:

- Upcoming milestones or deadlines
- Review meetings or demos
- Stakeholder meetings that need preparation
- External commitments (customer demos, launches)

This capability is optional. If unavailable, proceed without calendar data.

### Step 4: Search for recent decisions and context

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `product-management`
- **args:**
  - `query`: the project name plus "decision" or "update" or "status"
  - `maxResults`: 10
  - `modifiedAfter`: date of last update if known

Look for:

- Previous stakeholder updates for consistent framing
- Decision documents created since the last update
- Design reviews or spec approvals

### Step 5: Check team communication

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `product-management`
- **args:**
  - `query`: the project name
  - `maxResults`: 15
  - `dateRange`: since the last update or last 7 days

Look for:

- Key decisions made in team channels
- Risks or concerns raised by team members
- Notable achievements or milestones celebrated
- Cross-team coordination updates

This capability is optional. Proceed without it if unavailable.

### Step 6: Check recent email threads

Use `capability_execute` with the following parameters:

- **capabilityId:** `mail.read_inbox`
- **packId:** `product-management`
- **args:**
  - `query`: the project name
  - `maxResults`: 10
  - `dateRange`: since the last update or last 7 days

Look for:

- Stakeholder feedback or questions from the last update
- Customer or partner communications relevant to the project
- External dependencies or commitments made via email

This capability is optional. Proceed without email data if unavailable.

### Step 7: Pull relevant metrics (if available)

Use `capability_execute` with the following parameters:

- **capabilityId:** `analytics.get_metrics`
- **packId:** `product-management`
- **args:**
  - `metrics`: key metrics relevant to the project
  - `dateRange`: the update period

Include metric highlights if available. This adds credibility and
specificity to the update.

This capability is optional. Proceed without metrics if unavailable.

### Step 8: Compose the stakeholder update

Tailor the format and depth to the audience:

- **Executives:** Lead with status and decisions needed. Keep to 1 page.
- **Partners:** Include dependencies and coordination needs.
- **Team:** Include more detail on blockers and next steps.

## Output Format

```
## Stakeholder Update: {project or product name}

**Period:** {date range covered}
**Date:** {current date}
**Author:** {user name}
**Distribution:** {audience}

---

### TL;DR

{3-4 bullet points covering the most important things the reader needs to know.
This section should be sufficient for someone who reads nothing else.}

- {headline 1: status or achievement}
- {headline 2: key decision or change}
- {headline 3: risk or blocker if any}
- {headline 4: what's coming next}

### Status Summary

**Overall health:** {Green / Yellow / Red}

| Workstream | Status | Health | Owner | Notes |
|-----------|--------|--------|-------|-------|
| {workstream} | {on track / at risk / blocked} | {G/Y/R} | {owner} | {brief note} |
| {workstream} | {status} | {health} | {owner} | {note} |
| {workstream} | {status} | {health} | {owner} | {note} |

### What We Accomplished

- {accomplishment 1}: {1 sentence of context}
- {accomplishment 2}: {context}
- {accomplishment 3}: {context}

### Key Decisions Made

| Decision | Rationale | Impact | Date |
|----------|-----------|--------|------|
| {decision} | {why} | {what changes} | {date} |
| {decision} | {why} | {impact} | {date} |

### Key Metrics (if available)

| Metric | Value | Change | Notes |
|--------|-------|--------|-------|
| {metric} | {value} | {change} | {interpretation} |
| {metric} | {value} | {change} | {notes} |

### Risks and Blockers

| Risk/Blocker | Severity | Mitigation | Owner | ETA |
|-------------|----------|------------|-------|-----|
| {issue} | {high/med/low} | {plan} | {owner} | {resolution date} |
| {issue} | {severity} | {plan} | {owner} | {ETA} |

### Upcoming Milestones

| Milestone | Target Date | Status | Dependencies |
|-----------|------------|--------|-------------|
| {milestone} | {date} | {on track / at risk} | {dependencies} |
| {milestone} | {date} | {status} | {dependencies} |

### Decisions Needed

{List any decisions that need stakeholder input. For each, provide
the question, options, your recommendation, and deadline.}

1. **{question}**
   Options: {A} vs. {B}
   Recommendation: {your recommendation and why}
   Needed by: {date}

### Next Steps

1. {next step with owner and date}
2. {next step with owner and date}
3. {next step with owner and date}

---

*Prepared from: {count} project tasks, {count} documents, {count} discussions.*
*Next update: {expected date of next update}.*
```

For email-format updates, condense to TL;DR + Status Summary + Risks +
Decisions Needed + Next Steps. For presentation talking points, convert
each section into 2-3 bullet points per slide.
