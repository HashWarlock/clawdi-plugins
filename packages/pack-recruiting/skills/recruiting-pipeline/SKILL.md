---
name: recruiting-pipeline
description: Track and manage recruiting pipeline from sourcing through offer. Triggers on "recruiting update", "candidate pipeline", "how many candidates", "hiring status for [role]"
metadata:
  openclaw:
    tags: [recruiting, pipeline, candidates]
---

## Recruiting Pipeline

When the user asks about recruiting status or candidate pipeline:

### Step 1: Gather pipeline data

Use `capability_execute` with capabilityId "ats.search_candidates":
- All active candidates, grouped by role
- Include: name, current stage, days in stage, source, last activity

If a specific role is mentioned, filter to that role.

### Step 2: Analyze pipeline health

Track metrics per role:
- **Pipeline velocity**: average days per stage
- **Conversion rates**: stage-to-stage pass-through
- **Source effectiveness**: which sources produce the most hires
- **Time to fill**: days from opening to offer acceptance
- **Offer acceptance rate**: offers extended vs. accepted

### Step 3: Identify issues

Flag:
- Candidates stuck in a stage for 7+ days
- Stages with low conversion (bottlenecks)
- Roles with insufficient pipeline (fewer than 3x candidates per hire needed)
- Candidates with no scheduled next step

### Output Format

**Recruiting Pipeline — [Date]**

**Summary**

| Role | Candidates | Avg Days Open | Stage Distribution |
|---|---|---|---|
| role | count | days | sourced/screen/interview/offer |

**Pipeline by Stage**

For each role:
- Sourced: count (candidates to screen)
- Screen: count (candidates in phone screen)
- Interview: count (in interview loops)
- Debrief: count (pending debrief decision)
- Offer: count (offer extended or in negotiation)

**Velocity Metrics**

| Stage | Avg Days | Conversion Rate |
|---|---|---|
| Sourced -> Screen | days | % |
| Screen -> Interview | days | % |
| Interview -> Offer | days | % |
| Offer -> Accepted | days | % |

**Attention Needed**
- Candidates stuck or stale
- Bottleneck stages
- Roles needing more pipeline

**Recommended Actions**
- Specific next steps for each flagged issue
