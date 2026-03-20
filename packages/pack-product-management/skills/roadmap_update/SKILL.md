---
name: roadmap_update
description: Generate a roadmap update based on current project progress, completed work, and shifting priorities
metadata:
  openclaw:
    tags: [product-management, roadmap, strategy, planning]
---

# Roadmap Update

Generate a comprehensive roadmap update by reviewing current project status,
recently completed work, upcoming milestones, and any priority shifts. This
skill produces a structured update suitable for sharing with leadership,
stakeholders, or the broader team.

## When to Use

Activate this skill when the user wants to:

- Prepare a roadmap update for a planning meeting or review
- Communicate progress against the current roadmap to leadership
- Document what shipped, what shifted, and what is coming next
- Generate a quarterly or monthly roadmap status report
- Reflect changes in strategy or priority in the roadmap narrative

## Workflow

### Step 1: Determine the update scope

Clarify what period and audience the update covers:

- **Time period:** What window does this update cover? (e.g., "this quarter", "last month", "since last roadmap review")
- **Audience:** Leadership, the whole company, the product team?
- **Product area:** The whole product or a specific area?
- **Roadmap document:** Does the user have an existing roadmap doc to reference?

### Step 2: Review completed work

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `status`: "completed"
  - `completedAfter`: start of the update period
  - `maxResults`: 30
  - `sortBy`: "completed_date"

Group completed work by theme or initiative:

- Which roadmap items were delivered?
- What was the scope of each delivered item?
- Were there notable achievements or milestones?

### Step 3: Review in-progress work

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `status`: "in_progress"
  - `maxResults`: 30
  - `sortBy`: "priority"

Assess current state:

- What is actively being worked on?
- What is the health of each in-progress initiative (on track, at risk, blocked)?
- Are there items that have been in progress too long?

### Step 4: Search for roadmap-related documents

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `product-management`
- **args:**
  - `query`: "roadmap" and the product area if specified
  - `maxResults`: 10

Look for:

- The current roadmap document to reference planned items
- Previous roadmap updates for consistent framing
- Strategy documents that inform priority context

### Step 5: Check for relevant metrics (if available)

Use `capability_execute` with the following parameters:

- **capabilityId:** `analytics.get_metrics`
- **packId:** `product-management`
- **args:**
  - `metrics`: ["feature_adoption", "user_engagement", "key_results"]
  - `dateRange`: the update period

Use metrics to support the narrative:

- Which shipped features are showing traction?
- Are key results on track?
- Any metrics that signal priority should shift?

This capability is optional. If unavailable, construct the update
without quantitative metrics and note the gap.

### Step 6: Check for recent stakeholder input

Use `capability_execute` with the following parameters:

- **capabilityId:** `mail.read_inbox`
- **packId:** `product-management`
- **args:**
  - `query`: "roadmap" or "priorities" or "planning"
  - `maxResults`: 10
  - `dateRange`: last 30 days

Look for:

- Feedback from leadership on direction
- Requests that suggest priority changes
- Commitments made to customers or partners

This capability is optional. If unavailable, proceed without email context.

### Step 7: Compose the roadmap update

## Output Format

```
## Roadmap Update: {product name or area}

**Period:** {time period covered}
**Date:** {current date}
**Author:** {user or "Product Team"}

---

### Executive Summary

{3-5 sentences summarizing the headline: what shipped, what's on track,
what shifted, and what's coming next. This should stand alone for someone
who reads only this paragraph.}

### What Shipped

**{Initiative 1 name}** -- Completed {date}
{2-3 sentence description of what was delivered and its impact.}
Key deliverables:
- {deliverable 1}
- {deliverable 2}

**{Initiative 2 name}** -- Completed {date}
{2-3 sentence description.}
Key deliverables:
- {deliverable 1}
- {deliverable 2}

### In Progress

| Initiative | Status | Health | Target Date | Notes |
|-----------|--------|--------|-------------|-------|
| {name} | {phase} | On Track | {date} | {notes} |
| {name} | {phase} | At Risk | {date} | {why at risk} |
| {name} | {phase} | Blocked | {date} | {blocker} |

**{Initiative at risk or blocked}**
{1-2 paragraphs explaining the situation and proposed mitigation.}

### Coming Next

| Initiative | Priority | Planned Start | Description |
|-----------|----------|---------------|-------------|
| {name} | P0 | {date} | {1 sentence description} |
| {name} | P1 | {date} | {1 sentence description} |
| {name} | P2 | {date} | {1 sentence description} |

### What Changed

{Describe any priority shifts, scope changes, or items that were added,
deferred, or cut since the last update. For each change, explain why.}

- **Added:** {item} -- {reason}
- **Deferred:** {item} -- {reason}
- **Cut:** {item} -- {reason}
- **Reprioritized:** {item} moved from P2 to P0 -- {reason}

### Key Metrics (if available)

| Metric | Previous Period | Current Period | Trend |
|--------|----------------|----------------|-------|
| {metric} | {value} | {value} | {up/down/flat} |
| {metric} | {value} | {value} | {trend} |

### Risks and Dependencies

1. **{risk}:** {description and mitigation plan}
2. **{dependency}:** {what we need and from whom}

### Decisions Needed

- {decision 1: what needs to be decided and by whom}
- {decision 2}

---

*Data sources: {list sources consulted}. Last updated: {timestamp}.*
```

For shorter, informal updates, condense to Executive Summary + What Shipped +
In Progress + What Changed. For quarterly reviews, include all sections with
maximum detail.
