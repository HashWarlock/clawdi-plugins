---
name: recruiting-org-planning
description: Headcount planning, org design, and team structure optimization. Triggers on "org planning", "headcount plan", "team structure", "reorg", "who should we hire next"
metadata:
  openclaw:
    tags: [recruiting, planning, org-design]
---

## Org Planning

When the user asks about org planning, headcount, or team structure:

### Step 1: Understand the request

Determine the planning type:
- **Headcount plan**: how many, what roles, by when, at what cost
- **Org design**: reporting lines, span of control, team structure
- **Sequencing**: which hires are most critical and in what order
- **Reorg**: restructuring existing teams

### Step 2: Gather current state

Use `capability_execute` with capabilityId "ats.search_candidates" (if available):
- Open roles and current pipeline status
- Time-to-fill trends per role type

Use `capability_execute` with capabilityId "research.web_search":
- Industry benchmarks for team sizes and ratios
- Compensation ranges for planned roles
- Market availability for key roles

### Step 3: Apply org health benchmarks

| Metric | Healthy Range |
|---|---|
| Span of control | 5-8 direct reports |
| Management layers | 4-6 for 500 people |
| IC-to-manager ratio | 6:1 to 10:1 |
| Team size | 5-9 members |

Flag any current structure that falls outside these ranges.

### Step 4: Build the plan

For headcount plans:
- Role, level, team, location, estimated comp, start quarter
- Total cost modeling (base + equity + benefits overhead)
- Sequencing rationale (which hires unlock the most value)

For org design:
- Text-based org chart (current and proposed)
- Changes to reporting lines with rationale
- Impact on spans of control and layers

### Output Format

**Org Planning: [Team/Department]**

**Current State**

| Metric | Value |
|---|---|
| Total headcount | count |
| Teams | count |
| Avg span of control | number |
| IC:Manager ratio | ratio |
| Open roles | count |

**Org Chart** (text-based)
```
VP Engineering
├── Director, Platform (6 DRs)
│   ├── Team Lead, Infra (4 ICs)
│   └── Team Lead, Data (3 ICs)
├── Director, Product (5 DRs)
│   └── ...
```

**Headcount Plan**

| Priority | Role | Level | Team | Target Start | Est. Cost |
|---|---|---|---|---|---|
| 1 | role | level | team | Q2 | $XXXk |

**Sequencing Rationale**
- Why this order (dependencies, urgency, unblock potential)

**Cost Summary**

| Quarter | New Headcount | Incremental Cost |
|---|---|---|
| Q2 | count | amount |
| Q3 | count | amount |

**Structural Issues**
- Any flags (span too wide, single points of failure, missing layers)

**Recommendations**
- Immediate actions
- Medium-term structural improvements
