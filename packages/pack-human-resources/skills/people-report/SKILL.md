---
name: people-report
description: Generate people analytics reports covering headcount, attrition, diversity, and org health
metadata:
  openclaw:
    tags: [human-resources, analytics, headcount, attrition, diversity]
---

## People Analytics Report Workflow

You help HR teams generate people analytics reports. You support four report types:
headcount, attrition, diversity, and org-health. The user can request one type or a
combined report.

### Step 1: Identify the report scope

Ask for or infer:
- **Report type**: headcount, attrition, diversity, org-health, or combined
- **Time period**: current snapshot, quarter, half-year, or annual
- **Scope**: company-wide, by department, by location, or by manager
- **Comparison**: year-over-year, quarter-over-quarter, or none

### Step 2: Pull the employee roster

Use `capability_execute` with capabilityId `hris.list_employees` and packId `human-resources`
to retrieve the full or filtered employee dataset.

Pass in args:
```
{ "filters": { "department": "<department or all>", "location": "<location or all>", "status": ["active", "terminated", "on_leave"] }, "fields": ["name", "employee_id", "role", "level", "department", "location", "manager", "hire_date", "termination_date", "status", "gender", "ethnicity", "age_band", "tenure_months", "employment_type"] }
```

### Step 3: Pull calendar data for org-health signals (optional)

If the report type is org-health, use `capability_execute` with capabilityId
`calendar.read_events` and packId `human-resources` to assess meeting load patterns.

Pass in args:
```
{ "scope": "department", "department": "<department>", "date_range": "<period start> to <period end>", "metrics": ["meeting_hours_per_week", "one_on_one_frequency", "skip_level_frequency"] }
```

If calendar data is unavailable, skip this step and note the limitation.

### Step 4: Generate the report by type

#### Type: Headcount

1. **Total Headcount** -- Current total, broken down by department and location
2. **Headcount Trend** -- Change over the reporting period (net hires, departures)
3. **Open Positions** -- Number of approved but unfilled roles by department
4. **New Hires** -- Count and list of new hires in the period, by department
5. **Employment Type Mix** -- Full-time, part-time, contractor breakdown
6. **Headcount by Level** -- Distribution across levels (IC1-IC6, M1-M3, etc.)
7. **Span of Control** -- Average direct reports per manager by department

#### Type: Attrition

1. **Attrition Rate** -- Overall and by department, calculated as:
   `(Terminations in period / Average headcount) * 100`
2. **Voluntary vs. Involuntary** -- Breakdown of departure reasons
3. **Regrettable Attrition** -- Percentage of departures flagged as regrettable
4. **Tenure at Departure** -- Average tenure of departing employees
5. **Attrition by Level** -- Which levels are losing the most people
6. **Attrition by Tenure Band** -- 0-6 months, 6-12 months, 1-2 years, 2-5 years, 5+ years
7. **Hotspot Departments** -- Departments with attrition above company average
8. **90-Day Turnover** -- New hires who left within 90 days (early attrition signal)
9. **Trend Comparison** -- vs. prior period and same period last year

#### Type: Diversity

1. **Gender Distribution** -- Overall and by department and level
2. **Ethnicity Distribution** -- Overall and by department and level
3. **Leadership Representation** -- Diversity at manager+ levels vs. IC population
4. **Hiring Pipeline Diversity** -- If available, diversity of recent hires vs. applicant pool
5. **Promotion Rates by Group** -- Promotion rates segmented by demographic group
6. **Pay Equity Summary** -- High-level pay gap indicators by group (reference comp-analysis for detail)
7. **Intersectional View** -- Combined gender and ethnicity breakdown at key levels
8. **Year-over-Year Progress** -- Comparison against prior period targets

#### Type: Org Health

1. **Employee Net Promoter Score (eNPS)** -- If survey data is available
2. **Manager Span of Control** -- Average and outliers
3. **Meeting Load** -- Average meeting hours per week by department (from calendar data)
4. **1:1 Frequency** -- Percentage of managers holding regular 1:1s
5. **Skip-Level Frequency** -- Percentage of skip-levels happening monthly+
6. **Org Depth** -- Number of levels from CEO to IC, by department
7. **Single Points of Failure** -- Roles or teams with only one person
8. **Time to Fill** -- Average days to fill open positions by department
9. **Internal Mobility** -- Percentage of roles filled by internal transfers

### Step 5: Save the report

Use `capability_execute` with capabilityId `docs.create_brief` and packId `human-resources`
to save the generated report.

Pass in args:
```
{ "title": "People Analytics Report - <report type> - <period>", "content": "<generated report>", "folder": "HR/People Analytics/<period>" }
```

### Output Format

Present the report in a structured dashboard-style format:

```
## People Analytics Report: <Report Type>
**Period:** <Reporting Period>
**Scope:** <Company / Department / Location>
**Generated:** <Current Date>

---

### Key Metrics at a Glance
| Metric          | Current | Prior Period | Change |
|-----------------|---------|--------------|--------|
| ...             | ...     | ...          | ...    |

---

[Detailed sections based on the selected report type above]

---

### Data Quality Notes
- Source: <HRIS system>
- Records analyzed: <count>
- Missing data: <any gaps or limitations>

### Recommended Actions
1. <Top priority action based on findings>
2. <Second priority action>
3. <Third priority action>
```
