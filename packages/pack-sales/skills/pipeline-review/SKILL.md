---
name: sales-pipeline-review
description: Analyze pipeline health, prioritize deals, flag risks, and create a weekly action plan
argument-hint: "<segment or rep>"
user-invocable: true
metadata:
  openclaw:
    tags: [sales, pipeline, analytics]
---

## Pipeline Review

When the user asks for a pipeline review:

### Step 1: Gather pipeline data

**With CRM:**
Use `capability_execute` with capabilityId "crm.lookup_account" to pull:
- All open opportunities
- For each: stage, amount, close date, owner, last activity date, contacts, next step

**Without CRM:**
Accept CSV, pasted data, or verbal description.

### Step 2: Calculate pipeline health score (0-100)

Score across four dimensions (25 points each):

**Stage Progression** (/25): Are deals moving forward?
- Full points: all deals progressed in the last 30 days
- Deductions: -5 per deal stuck in same stage 30+ days

**Activity Recency** (/25): Is the pipeline being worked?
- Full points: all deals have activity in the last 7 days
- Deductions: -5 per deal with no activity in 14+ days

**Close Date Accuracy** (/25): Are close dates realistic?
- Full points: no deals past close date
- Deductions: -5 per deal past close date, -3 per deal pushed 2+ times

**Contact Coverage** (/25): Are deals multi-threaded?
- Full points: all deals have 2+ contacts
- Deductions: -5 per single-threaded deal in late stage

### Step 3: Prioritize deals

Weighted framework:
- Close Date proximity: 30%
- Deal Size: 25%
- Stage advancement: 20%
- Recent Activity: 15%
- Risk level: 10%

### Step 4: Identify risks

- **Stale**: no activity in 14+ days
- **Stuck**: same stage for 30+ days
- **Past Due**: close date has passed
- **Single-Threaded**: only one contact, especially in late stage
- **No Next Step**: no defined next action

### Step 5: Hygiene audit

Flag deals missing:
- Close date
- Amount
- Next step
- Primary contact

### Output Format

**Pipeline Health Score: [X]/100**

| Dimension | Score | Key Issue |
|---|---|---|
| Stage Progression | /25 | summary |
| Activity Recency | /25 | summary |
| Close Date Accuracy | /25 | summary |
| Contact Coverage | /25 | summary |

**Priority Actions** (top 3)
For each:
- Deal name and why it's a priority
- Specific action to take
- Expected impact

**Deal Prioritization**

*Closing This Week*
- Deal list with status and risk level

*Closing This Month*
- Deal list with status and risk level

*Nurture*
- Deals not closing soon but worth maintaining

**Risk Flags**

| Deal | Risk Type | Days | Action |
|---|---|---|---|
| name | stale/stuck/past due | number | what to do |

**Hygiene Issues**

| Deal | Missing Field | Impact |
|---|---|---|
| name | what's missing | why it matters |

**Pipeline Shape**
- Distribution by stage (healthy = pyramid, top-heavy = problem)
- Distribution by close month
- Average deal size

**Recommendations**
- This week: top 3 actions
- This month: structural improvements

**Consider Removing**
- Deals that should probably be closed-lost, with reasoning
