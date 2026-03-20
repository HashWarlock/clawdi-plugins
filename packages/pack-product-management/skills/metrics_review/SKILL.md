---
name: metrics_review
description: Review product metrics, analyze trends, and generate an actionable analysis report
metadata:
  openclaw:
    tags: [product-management, metrics, analytics, data]
---

# Metrics Review

Pull product metrics from connected analytics platforms, analyze trends and
anomalies, and generate a structured analysis report with actionable insights.
This skill turns raw data into a narrative that helps product teams understand
what is happening and why.

## When to Use

Activate this skill when the user wants to:

- Review product or feature metrics for a specific time period
- Understand why a metric changed (increased, decreased, or plateaued)
- Prepare a metrics section for a product review meeting
- Compare metric performance across time periods or cohorts
- Identify trends, anomalies, or emerging patterns in usage data

## Workflow

### Step 1: Define the metrics scope

Clarify what the user wants to review:

- **Metrics of interest:** Which specific metrics? (e.g., DAU, retention, conversion, feature adoption)
- **Time period:** What window? (e.g., "last 2 weeks", "this month vs. last month")
- **Comparison:** Compare to previous period, year-over-year, or against a target?
- **Granularity:** Daily, weekly, or monthly data points?
- **Segments:** Any specific user segments, platforms, or regions?

If the user says "review my metrics" without specifics, default to key product
health metrics (active users, retention, engagement) for the last 30 days
compared to the prior 30 days.

### Step 2: Pull metrics data

Use `capability_execute` with the following parameters:

- **capabilityId:** `analytics.get_metrics`
- **packId:** `product-management`
- **args:**
  - `metrics`: list of metric names requested
  - `dateRange`: the specified time period
  - `granularity`: "daily" or "weekly" as appropriate
  - `comparison`: comparison period if requested
  - `segments`: segment filters if specified

This capability is optional. If it returns `needs_setup`, inform the user
that no analytics platform is connected and suggest running `/connect_apps`.
If analytics is not available, check if the user can provide data manually
or if there are documents with metric snapshots.

### Step 3: Search for related context

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `product-management`
- **args:**
  - `query`: "metrics" or "analytics" and the specific metrics or features being reviewed
  - `maxResults`: 10

Look for:

- Previous metrics reports for trend comparison
- Feature launch documents that might explain metric changes
- Experiment results that affected metrics
- OKR documents with metric targets

### Step 4: Check for related project activity

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `status`: "completed"
  - `completedAfter`: start of the metrics period
  - `maxResults`: 20

Correlate completed work with metric changes:

- Did a specific release coincide with a metric change?
- Were there bug fixes that could explain improvements?
- Were there incidents that could explain dips?

### Step 5: Search for qualitative context (if available)

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `product-management`
- **args:**
  - `query`: the metric names or related feature names
  - `maxResults`: 10
  - `dateRange`: the metrics period

Look for:

- User feedback shared in chat channels
- Team discussions about metric movements
- Customer reports that correlate with data changes

This capability is optional. Proceed without it if unavailable.

### Step 6: Analyze and interpret

For each metric:

1. Calculate the period-over-period change (absolute and percentage)
2. Identify the trend direction (improving, declining, stable)
3. Flag any anomalies (sudden spikes, drops, or pattern breaks)
4. Propose likely causes based on correlated events
5. Assess whether the metric is on track vs. targets if targets exist

## Output Format

```
## Metrics Review: {product or feature name}

**Period:** {date range}
**Comparison:** {vs. previous period / vs. target / vs. same period last year}
**Date:** {current date}

---

### Summary Dashboard

| Metric | Current | Previous | Change | Trend | Status |
|--------|---------|----------|--------|-------|--------|
| {metric} | {value} | {value} | {+/-}{change} ({%}) | {arrow up/down/flat} | {on track / needs attention / critical} |
| {metric} | {value} | {value} | {change} | {trend} | {status} |
| {metric} | {value} | {value} | {change} | {trend} | {status} |

### Key Takeaways

1. **{takeaway 1}:** {1-2 sentences on the most important metric finding}
2. **{takeaway 2}:** {1-2 sentences}
3. **{takeaway 3}:** {1-2 sentences}

### Detailed Analysis

**{Metric 1 name}**

Current: {value} | Change: {change} | Trend: {direction}

{2-3 paragraphs analyzing this metric:
- What is happening?
- What likely caused the change?
- How does this compare to targets or expectations?
- What events or releases correlate with the trend?}

**Correlated events:**
- {date}: {event that may have influenced this metric}
- {date}: {event}

**{Metric 2 name}**

Current: {value} | Change: {change} | Trend: {direction}

{2-3 paragraphs of analysis}

[... additional metrics ...]

### Anomalies and Flags

- **{anomaly 1}:** {description of unexpected data point and possible explanation}
- **{anomaly 2}:** {description}

### Recommendations

1. **{recommendation}:** {1-2 sentences on what to do about the findings}
2. **{recommendation}:** {description}
3. **{recommendation}:** {description}

### Data Quality Notes

- {note about data completeness or reliability}
- {note about any sources that were unavailable}

---

*Sources: {analytics platform}, {documents reviewed}, {project data}.*
*Next suggested review: {date based on review frequency}.*
```

If analytics data is not available, adapt the output to work with whatever
context was gathered from documents and project data. Clearly label
findings as qualitative rather than data-backed.
