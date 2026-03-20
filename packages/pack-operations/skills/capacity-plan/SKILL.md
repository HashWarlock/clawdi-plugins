---
name: ops-capacity-plan
description: Analyze team capacity, workload distribution, and resource allocation for upcoming sprints or quarters. Triggers on "capacity plan", "resource allocation", "can we take on [project]", "team bandwidth", "staffing plan for [period]"
metadata:
  openclaw:
    tags: [operations, planning, capacity, resources]
---

## Capacity Plan

When the user asks about team capacity or resource planning:

### Step 1: Define planning parameters

Gather from the user:
- **Time period**: sprint, month, quarter, custom range
- **Teams or individuals**: who to include in the analysis
- **Planned work**: known upcoming projects, features, or initiatives
- **Constraints**: holidays, PTO, oncall rotations, part-time allocations
- **Capacity model**: hours per week, story points, or percentage-based

### Step 2: Gather current workload

Use `capability_execute` with capabilityId "project.list_tasks" to pull:
- All open tasks assigned to team members
- Task status (not started, in progress, blocked)
- Story point or time estimates for each task
- Sprint or milestone assignments
- Task priorities and deadlines
- Overdue items

### Step 3: Calendar and availability

Use `capability_execute` with capabilityId "calendar.read_events" to check:
- Scheduled PTO and holidays for the planning period
- Recurring meetings and their time cost
- Training or conference time blocked
- Oncall rotation schedules

### Step 4: Historical velocity

Use `capability_execute` with capabilityId "project.list_tasks" to analyze:
- Completed tasks from the last 3 sprints or months
- Average velocity per team member
- Planned vs actual completion rates
- Common causes of carryover

### Step 5: Context and commitments

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Commitments made in recent planning discussions
- Known upcoming work not yet in the project tool
- Team concerns about workload
- Cross-team dependencies

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Roadmap documents with planned deliverables
- Quarterly OKR or goal documents
- Resource allocation spreadsheets

### Step 6: Calculate capacity

For each team member:
- Total available hours/points = (work days in period - PTO - holidays) * daily capacity
- Subtract: meeting overhead, oncall time, maintenance/support allocation
- Net capacity = available for project work
- Current allocation = sum of assigned task estimates
- Remaining capacity = net capacity - current allocation

For the team:
- Aggregate capacity and current allocation
- Identify over-allocated and under-allocated individuals
- Calculate team utilization percentage

### Step 7: Plan and recommend

Based on the analysis:
- Can the team absorb the planned work?
- Who has bandwidth? Who is overloaded?
- What should be deferred, delegated, or descoped?
- Where are the bottleneck skills or roles?

### Output Format

**Capacity Plan: [Team/Period]**

**Planning Summary**

| Field | Value |
|---|---|
| Period | start - end date |
| Working Days | X days |
| Team Size | X people |
| Total Gross Capacity | X hours/points |
| Total Net Capacity | X hours/points |
| Currently Allocated | X hours/points |
| Remaining Capacity | X hours/points |
| Utilization | X% |

**Team Capacity Breakdown**

| Team Member | Gross | PTO | Meetings | Oncall | Net Capacity | Allocated | Remaining | Status |
|---|---|---|---|---|---|---|---|---|
| name | X | X | X | X | X | X | X | Under/At/Over |
| name | X | X | X | X | X | X | X | Under/At/Over |

**Workload Distribution**

| Team Member | High Priority | Medium Priority | Low Priority | Blocked | Total Items |
|---|---|---|---|---|---|
| name | X | X | X | X | X |

**Upcoming Commitments**

| Project/Initiative | Estimated Effort | Start Date | Required Skills | Assigned To | Fits? |
|---|---|---|---|---|---|
| project name | X hours/points | date | skills needed | person/TBD | Yes/No/Partial |

**Capacity Assessment**
- Can the team absorb planned work? Yes/No/With adjustments
- Key constraint: what limits capacity most

**Risk Factors**

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Person X at 120% utilization | Burnout, missed deadlines | High | Redistribute Y tasks |
| No backup for skill Z | Single point of failure | Medium | Cross-train team member |

**Recommendations**

1. **Immediate actions** (this sprint/week)
   - Specific rebalancing or reassignment actions

2. **Near-term adjustments** (this month/quarter)
   - Hiring, contracting, or training recommendations

3. **Work prioritization**
   - What to keep, defer, reduce scope, or cut

**Historical Velocity**

| Sprint/Period | Planned | Completed | Carryover | Velocity |
|---|---|---|---|---|
| period | X | X | X | X pts/sprint |
| period | X | X | X | X pts/sprint |
| period | X | X | X | X pts/sprint |
| **Average** | X | X | X | **X pts/sprint** |
