---
name: engineering-sprint-retro
description: Generate a sprint retrospective summary with velocity metrics, highlights, and improvement areas
metadata:
  openclaw:
    tags: [engineering, sprint, retrospective, agile]
---

# Sprint Retrospective Workflow

When the user asks to generate a sprint retro, review the last sprint,
or prepare for a retrospective meeting:

## Step 1: Retrieve sprint tasks and completion data

Use `capability_execute` with the following parameters:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "sprint:current OR sprint:last_completed"
  - maxResults: 100
  - fields: ["title", "status", "assignee", "labels", "storyPoints",
             "created", "started", "completed", "estimate", "actual",
             "type", "priority", "blockedBy", "linkedPRs"]
  - sortBy: "status"

If the result status is "needs_setup", inform the user that project
tracker access is required and suggest running `/connect_apps`.

## Step 2: Retrieve sprint metadata and goals

Use `capability_execute` with the following parameters:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "type:sprint state:active OR state:completed"
  - maxResults: 3
  - fields: ["title", "goal", "startDate", "endDate", "capacity"]

Get the sprint goals that were committed to at planning time so
completion can be measured against them.

## Step 3: Check for incidents and production issues during the sprint

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "engineering"
- args:
  - query: "incident alert outage rollback hotfix"
  - channels: ["incidents", "alerts", "engineering", "on-call"]
  - maxResults: 15
  - dateRange: "<sprint_start_to_sprint_end>"

Identify any incidents or production issues that impacted the sprint.
These are important context for velocity changes and carry-over.

## Step 4: Gather team discussions about blockers and wins

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "engineering"
- args:
  - query: "blocked waiting on great job shipped launched milestone"
  - channels: ["<team_channel>", "engineering", "standup"]
  - maxResults: 20
  - dateRange: "<sprint_start_to_sprint_end>"

Capture team sentiment, blockers encountered, and wins celebrated
during the sprint to inform the retro discussion.

## Step 5: Search for retrospective documents from previous sprints

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<team_name> sprint retrospective retro action items"
  - maxResults: 5
  - tags: ["retro", "retrospective", "sprint"]

Find previous retro documents to check if recurring themes or
action items from past sprints were addressed.

## Step 6: Check if planned meetings or ceremonies happened

Use `capability_execute` with the following parameters:
- capabilityId: "calendar.read_events"
- packId: "engineering"
- args:
  - filter: "<team_name> standup planning review demo retro"
  - timeRange: "<sprint_start_to_sprint_end>"
  - maxResults: 20
  - fields: ["title", "date", "attendees", "duration"]

Assess whether team ceremonies (standups, planning, reviews) happened
as scheduled, which affects team health metrics.

## Step 7: Compile the retrospective summary

Compute metrics from the gathered data and format:

```
## Sprint Retrospective Summary

### Sprint Information
- **Sprint:** <sprint_name_or_number>
- **Team:** <team_name>
- **Duration:** <start_date> to <end_date> (<cadence>)
- **Sprint goal:** <goal_from_sprint_metadata>

### Velocity & Delivery Metrics

| Metric | This Sprint | Previous Sprint | Trend |
|--------|------------|-----------------|-------|
| Story points committed | <committed> | <prev_committed> | <up/down/stable> |
| Story points completed | <completed> | <prev_completed> | <up/down/stable> |
| Completion rate | <percentage> | <prev_percentage> | <up/down/stable> |
| Tasks completed | <count> | <prev_count> | <up/down/stable> |
| Tasks carried over | <count> | <prev_count> | <up/down/stable> |
| Bugs fixed | <count> | <prev_count> | <up/down/stable> |
| PRs merged | <count> | <prev_count> | <up/down/stable> |

### Sprint Goal Assessment
- **Goal achieved:** <yes/partially/no>
- **Explanation:** <why the goal was or was not met>

### What Went Well
1. **<highlight>:** <description with specific task references>
2. **<highlight>:** <description>
3. **<highlight>:** <description>

### What Did Not Go Well
1. **<issue>:** <description with specific impact>
   - Root cause: <analysis>
   - Affected tasks: <task_ids>
2. **<issue>:** <description>
   - Root cause: <analysis>
3. **<issue>:** <description>

### Blockers Encountered
| Blocker | Duration | Impact (points) | Resolution |
|---------|----------|-----------------|------------|
| <blocker> | <days_blocked> | <points_affected> | <how_resolved> |

### Incidents & Unplanned Work
| Incident | Severity | Impact on Sprint | Resolution |
|----------|----------|-----------------|------------|
| <incident> | <sev> | <points_diverted_or_days_lost> | <outcome> |

**Unplanned work percentage:** <percentage_of_completed_work_that_was_unplanned>

### Carry-Over Items
| Task | Points | Reason for Carry-Over |
|------|--------|----------------------|
| <task> | <points> | <why it was not completed> |

### Previous Action Items Follow-Up
| Action Item | Owner | Status |
|-------------|-------|--------|
| <from_last_retro> | <owner> | <done/in-progress/not-started> |

### Team Health Indicators
- **Ceremonies held:** <count_held> / <count_planned>
- **Standup attendance:** <average_percentage>
- **Team sentiment:** <positive/neutral/mixed/negative based on chat analysis>

### Proposed Action Items
1. **<action>** -- Owner: <suggested_owner> -- Due: <next_sprint>
   - Context: <why this action is recommended>
2. **<action>** -- Owner: <suggested_owner> -- Due: <next_sprint>
   - Context: <why>
3. **<action>** -- Owner: <suggested_owner> -- Due: <next_sprint>
   - Context: <why>

### Discussion Prompts for Retro Meeting
1. <open-ended question based on a pattern observed in the data>
2. <open-ended question about a specific challenge>
3. <open-ended question about a potential improvement>
```

If the user asks to save the retro, offer to create a document using
`capability_execute` with capabilityId "docs.create_brief".
