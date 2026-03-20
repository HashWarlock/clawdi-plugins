---
name: engineering-tech-debt-tracker
description: Track, categorize, and prioritize technical debt across the codebase and project tracker
metadata:
  openclaw:
    tags: [engineering, tech-debt, maintenance, quality]
---

# Tech Debt Tracker Workflow

When the user asks to review tech debt, generate a debt report, or
prioritize maintenance work:

## Step 1: Retrieve tech debt items from the project tracker

Use `capability_execute` with the following parameters:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "label:tech-debt OR label:technical-debt OR label:debt OR label:refactor OR label:maintenance OR type:chore"
  - maxResults: 100
  - fields: ["title", "description", "labels", "status", "created",
             "updated", "assignee", "priority", "storyPoints",
             "comments", "linkedTasks"]
  - sortBy: "created"

If the result status is "needs_setup", inform the user that project
tracker access is required and suggest running `/connect_apps`.

## Step 2: Retrieve bug and quality-related issues

Use `capability_execute` with the following parameters:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "type:bug label:flaky OR label:performance OR label:deprecated OR label:security-debt OR label:test-gap state:open"
  - maxResults: 50
  - fields: ["title", "description", "labels", "status", "created",
             "priority", "storyPoints", "comments"]

Bugs and quality issues often represent or are caused by underlying
tech debt. Include them in the analysis.

## Step 3: Search documentation for known debt and migration plans

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "tech debt technical debt migration deprecated legacy refactor"
  - maxResults: 10
  - tags: ["tech-debt", "migration", "architecture", "adr"]

Find any existing tech debt inventories, migration plans, or ADRs
that document intentional debt and planned remediation.

## Step 4: Search engineering discussions for debt-related concerns

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "engineering"
- args:
  - query: "tech debt refactor hack workaround TODO FIXME deprecated legacy"
  - channels: ["engineering", "<team_channel>", "architecture"]
  - maxResults: 20
  - dateRange: "last_90_days"

Capture informal tech debt discussions that may not have been formally
tracked. Engineers often flag debt in chat before creating tickets.

## Step 5: Analyze sprint data for debt impact on velocity

Use `capability_execute` with the following parameters:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "sprint:last_3 (label:tech-debt OR label:bug OR label:maintenance)"
  - maxResults: 50
  - fields: ["title", "sprint", "storyPoints", "status", "type"]

Measure how much sprint capacity has been consumed by debt-related
work versus new feature work over the last three sprints.

## Step 6: Research industry benchmarks for tech debt management

Use `capability_execute` with the following parameters:
- capabilityId: "research.web_search"
- packId: "engineering"
- args:
  - query: "engineering tech debt ratio benchmark managing technical debt prioritization framework"
  - maxResults: 5

Gather context on industry best practices for tech debt ratios and
prioritization approaches to calibrate recommendations.

## Step 7: Compile the tech debt report

Categorize all debt items and format:

```
## Technical Debt Report

**Date:** <current_date>
**Team:** <team_name>
**Total debt items:** <count>
**Estimated total effort:** <sum_of_story_points_or_estimate>

### Debt Health Score
**Score:** <calculated_1_to_10> / 10
**Trend:** <improving/stable/worsening based on comparison to prior data>

Scoring factors:
- Total open debt items: <count> (<up/down> from last report)
- Debt age (avg days open): <days>
- Debt as % of sprint work (last 3 sprints): <percentage>
- Critical/high priority debt items: <count>

### Debt by Category

#### Infrastructure & Deployment (<count> items, <points> points)
| # | Item | Priority | Age | Est. Effort | Impact |
|---|------|----------|-----|-------------|--------|
| 1 | <title> | <priority> | <days> | <points> | <impact> |

#### Code Quality & Refactoring (<count> items, <points> points)
| # | Item | Priority | Age | Est. Effort | Impact |
|---|------|----------|-----|-------------|--------|
| 1 | <title> | <priority> | <days> | <points> | <impact> |

#### Testing & Quality (<count> items, <points> points)
| # | Item | Priority | Age | Est. Effort | Impact |
|---|------|----------|-----|-------------|--------|
| 1 | <title> | <priority> | <days> | <points> | <impact> |

#### Dependencies & Upgrades (<count> items, <points> points)
| # | Item | Priority | Age | Est. Effort | Impact |
|---|------|----------|-----|-------------|--------|
| 1 | <title> | <priority> | <days> | <points> | <impact> |

#### Documentation & Knowledge Gaps (<count> items, <points> points)
| # | Item | Priority | Age | Est. Effort | Impact |
|---|------|----------|-----|-------------|--------|
| 1 | <title> | <priority> | <days> | <points> | <impact> |

#### Security & Compliance (<count> items, <points> points)
| # | Item | Priority | Age | Est. Effort | Impact |
|---|------|----------|-----|-------------|--------|
| 1 | <title> | <priority> | <days> | <points> | <impact> |

### Velocity Impact Analysis

| Sprint | Total Points | Feature Points | Debt Points | Debt % |
|--------|-------------|----------------|-------------|--------|
| <sprint> | <total> | <feature> | <debt> | <pct> |
| <sprint> | <total> | <feature> | <debt> | <pct> |
| <sprint> | <total> | <feature> | <debt> | <pct> |

**3-sprint average debt allocation:** <percentage>
**Industry benchmark:** 15-20% of capacity for maintenance

### High-Risk Debt Items
Items that pose the greatest risk if not addressed:

1. **<title>** -- Risk: <what_could_go_wrong>
   - Age: <days> | Effort: <points> | Blocked by: <dependencies>
2. **<title>** -- Risk: <what_could_go_wrong>
   - Age: <days> | Effort: <points>
3. **<title>** -- Risk: <what_could_go_wrong>
   - Age: <days> | Effort: <points>

### Quick Wins
Items with high impact relative to effort:

1. **<title>** -- Effort: <low> | Impact: <high>
2. **<title>** -- Effort: <low> | Impact: <medium>
3. **<title>** -- Effort: <low> | Impact: <medium>

### Informal Debt (from chat, not yet tracked)
Issues mentioned in engineering channels but not formally ticketed:

1. <summary_from_chat> -- Mentioned by: <person> -- Date: <date>
2. <summary_from_chat> -- Mentioned by: <person> -- Date: <date>

### Migration & Deprecation Status
| Migration | Status | Target Date | Progress |
|-----------|--------|-------------|----------|
| <migration_name> | <on-track/at-risk/stalled> | <date> | <pct> |

### Recommendations
1. **Prioritize for next sprint:**
   - <specific_items_with_rationale>
2. **Schedule for this quarter:**
   - <larger_items_that_need_dedicated_time>
3. **Process improvements:**
   - <suggested_changes_to_prevent_new_debt_accumulation>
4. **Debt budget recommendation:**
   - Allocate <percentage>% of next sprint to debt reduction (<points> points)
```

If the user asks to create tasks for specific recommendations, use
`capability_execute` with capabilityId "project.create_task" for each.
