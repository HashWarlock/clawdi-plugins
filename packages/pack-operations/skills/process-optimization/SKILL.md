---
name: ops-process-optimization
description: Analyze an existing process for inefficiencies, bottlenecks, and automation opportunities with a concrete improvement plan. Triggers on "optimize [process]", "improve our [process]", "why is [process] slow", "process improvement", "streamline [workflow]"
metadata:
  openclaw:
    tags: [operations, optimization, efficiency, improvement]
---

## Process Optimization

When the user asks to optimize or improve a process:

### Step 1: Understand the current process

Gather from the user:
- **Process name**: which process to optimize
- **Pain points**: what is currently not working well
- **Goals**: faster, cheaper, more reliable, more scalable, fewer errors
- **Constraints**: budget, team size, technology limitations, compliance requirements
- **Volume**: how often the process runs and at what scale

### Step 2: Map the current state

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Existing process documentation
- Related SOPs and runbooks
- Historical process metrics or reports
- Previous optimization attempts

Use `capability_execute` with capabilityId "project.list_tasks" to analyze:
- Tasks associated with the process
- Average completion times by step
- Frequently blocked or delayed tasks
- Task reassignment patterns (handoff friction)
- Overdue task patterns

### Step 3: Gather stakeholder input

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Complaints or frustrations about the process
- Workarounds team members have developed
- Suggestions for improvement already made
- Confusion or questions about process steps
- Mentions of manual work that could be automated

Use `capability_execute` with capabilityId "calendar.read_events" to check:
- Meetings dedicated to this process (overhead signal)
- Recurring syncs that exist because the process is unreliable
- Wait times between handoffs visible in calendar patterns

### Step 4: Research improvement options

Use `capability_execute` with capabilityId "research.web_search" for:
- Industry best practices for this type of process
- Automation tools and platforms relevant to the process
- Case studies of similar process improvements
- Benchmarks for process efficiency in the industry

### Step 5: Analyze and identify improvements

Evaluate the process against these dimensions:
- **Value stream**: which steps add value vs waste
- **Bottlenecks**: where does work queue up
- **Handoffs**: where does work change ownership (each handoff = delay risk)
- **Rework loops**: where does work get sent back
- **Manual steps**: what could be automated
- **Approval gates**: which approvals are necessary vs bureaucratic
- **Information gaps**: where do people lack context to do their work
- **Tool friction**: where do tools slow people down

Quantify where possible:
- Time per step (current vs potential)
- Error rate per step
- Wait time between steps
- Cost per process execution

### Step 6: Design the optimized process

Create a target-state process that addresses findings. Prioritize changes by impact and feasibility.

### Step 7: Create implementation plan

Use `capability_execute` with capabilityId "project.create_task" to create:
- Task for each improvement action
- Milestone for process optimization completion

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Complete optimization analysis and plan

### Output Format

**Process Optimization: [Process Name]**

**Executive Summary**
3-4 sentences covering the main inefficiencies found and the expected improvement from the recommended changes.

**Current State Assessment**

| Metric | Current | Benchmark | Gap |
|---|---|---|---|
| End-to-end time | X hours/days | Y hours/days | delta |
| Steps involved | X steps | Y steps | delta |
| Handoffs | X | Y | delta |
| Manual steps | X of Y | target | delta |
| Error/rework rate | X% | Y% | delta |
| Cost per execution | $X | $Y | delta |

**Process Map: Current State**

```
[Trigger] -> Step 1 (Xh) -> Handoff -> Step 2 (Xh) -> Wait (Xh) -> Step 3 (Xh) -> [End]
                                                         ^
                                                    Bottleneck
```

**Findings**

### Bottlenecks

| Bottleneck | Location | Cause | Impact | Evidence |
|---|---|---|---|---|
| description | which step | root cause | time/cost impact | data source |

### Waste

| Type | Location | Description | Time Wasted |
|---|---|---|---|
| Waiting | step X to Y | what causes the wait | X hours per cycle |
| Rework | step Z | what causes rework | X hours per cycle |
| Overprocessing | step W | unnecessary work | X hours per cycle |

### Automation Opportunities

| Step | Current (Manual) | Proposed (Automated) | Tool/Method | Time Saved |
|---|---|---|---|---|
| step | what happens now | what could happen | tool | hours saved |

### Unnecessary Handoffs

| Handoff | From | To | Why It Exists | Recommendation |
|---|---|---|---|---|
| handoff | role A | role B | reason | eliminate / simplify |

**Recommended Changes**

| Priority | Change | Type | Expected Impact | Effort | ROI |
|---|---|---|---|---|---|
| 1 | specific change | Automate/Eliminate/Simplify/Reorder | impact description | effort level | high/med/low |
| 2 | specific change | type | impact | effort | ROI |
| 3 | specific change | type | impact | effort | ROI |

**Process Map: Target State**

```
[Trigger] -> Step 1 (Xh) -> Auto -> Step 2 (Xh) -> [End]
```

**Expected Improvements**

| Metric | Current | Target | Improvement |
|---|---|---|---|
| End-to-end time | X hours | Y hours | Z% faster |
| Manual effort | X hours | Y hours | Z% reduction |
| Error rate | X% | Y% | Z% reduction |
| Cost per execution | $X | $Y | $Z saved |

**Implementation Roadmap**

Phase 1: Quick Wins (Week 1-2)
- Changes that require no tooling and deliver immediate improvement

Phase 2: Process Redesign (Week 3-4)
- Structural changes to the process flow

Phase 3: Automation (Week 5-8)
- Technology-enabled improvements

**Success Metrics**
- How to measure whether the optimization worked
- Baseline measurements to take before implementing changes
- Review cadence to track improvement over time

**Risks**

| Risk | Impact | Mitigation |
|---|---|---|
| change resistance | adoption failure | communication and training plan |
| automation breaks | process stops | manual fallback procedure |
