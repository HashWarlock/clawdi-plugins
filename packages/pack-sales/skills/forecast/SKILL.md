---
name: sales-forecast
description: Generate a weighted sales forecast with scenarios and gap analysis
argument-hint: "<period>"
user-invocable: true
metadata:
  openclaw:
    tags: [sales, forecast, analytics]
---

## Sales Forecast

When the user asks for a forecast:

### Step 1: Gather pipeline data

**With CRM:**
Use `capability_execute` with capabilityId "crm.lookup_account" to pull:
- All open opportunities with stage, amount, close date, last activity date
- Historical win rates by stage
- Activity signals (meetings, emails, calls per deal)

**Without CRM:**
Ask the user to provide data via:
- CSV upload
- Pasted deal list
- Verbal description of their territory

### Step 2: Get targets

Ask for (if not known):
- Quota for the period
- Amount already closed
- Period end date

### Step 3: Apply stage probabilities

Default probabilities (adjust if historical data is available):

| Stage | Default Probability |
|---|---|
| Negotiation | 80% |
| Proposal Sent | 60% |
| Evaluation | 40% |
| Discovery | 20% |
| Prospecting | 10% |

### Step 4: Calculate scenarios

- **Best Case**: all pipeline deals close at stage probability + 20%
- **Likely Case**: all pipeline deals close at stage probability
- **Worst Case**: only Negotiation-stage deals close, at 70%

### Step 5: Classify deals

- **Commit**: high confidence, Negotiation stage, active engagement
- **Upside**: plausible but not certain, earlier stages or less activity
- Include reasoning for each classification

### Step 6: Flag risks

- Close date already passed
- No activity in 14+ days
- In Discovery but closing this week
- Single-threaded (only one contact)
- Amount changed recently (could signal instability)

### Step 7: Gap analysis

Calculate: Quota - Closed - Weighted Pipeline = Gap

If gap exists, recommend specific actions:
- Deals to accelerate (highest weighted value, most activity)
- Deals to revive (stale but large)
- New pipeline needed (volume and timeline)

### Output Format

**Summary**

| Metric | Value |
|---|---|
| Quota | amount |
| Closed to Date | amount |
| Open Pipeline | total amount |
| Weighted Forecast | amount |
| Gap | amount |
| Coverage Ratio | pipeline / remaining quota |

**Forecast Scenarios**

| Scenario | Amount | vs. Quota |
|---|---|---|
| Best Case | amount | +/- % |
| Likely Case | amount | +/- % |
| Worst Case | amount | +/- % |

**Pipeline by Stage**

| Stage | Deals | Amount | Weighted |
|---|---|---|---|
| stage | count | amount | weighted |

**Commit Deals**
- Each deal with reasoning for commit classification

**Upside Deals**
- Each deal with reasoning for upside classification

**Risk Flags**

| Deal | Risk | Impact |
|---|---|---|
| name | what's wrong | effect on forecast |

**Gap Analysis**
- Size of the gap
- Options to close it with specific deal recommendations

**Recommendations**
- Ranked list of actions to take this week
