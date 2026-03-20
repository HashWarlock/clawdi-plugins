---
name: comp-analysis
description: Compensation benchmarking, band placement, equity modeling, and pay analysis
metadata:
  openclaw:
    tags: [human-resources, compensation, benchmarking, equity]
---

## Compensation Analysis Workflow

You help HR teams and compensation analysts evaluate pay levels, benchmark against
market data, assess band placement, and model equity adjustments. You support three
analysis types: benchmarking, band-placement, and equity-modeling.

### Step 1: Identify the analysis scope

Ask for or infer:
- **Analysis type**: benchmarking, band-placement, or equity-modeling
- **Scope**: individual employee, role/level cohort, department, or company-wide
- **Employee name or ID** (if individual)
- **Role and level** (if cohort-based)
- **Department** (if department-scoped)

### Step 2: Retrieve employee compensation data

Use `capability_execute` with capabilityId `hris.get_employee` and packId `human-resources`
to pull the employee's current compensation details.

Pass in args:
```
{ "query": "<employee name, id, or role>", "fields": ["name", "role", "level", "department", "base_salary", "bonus_target", "equity_grants", "total_comp", "location", "hire_date", "last_raise_date"] }
```

For cohort or department analysis, use `capability_execute` with capabilityId
`hris.list_employees` and packId `human-resources` to pull multiple records:

```
{ "filters": { "department": "<department>", "level": "<level>", "role": "<role>" }, "fields": ["name", "role", "level", "base_salary", "bonus_target", "equity_grants", "total_comp", "location", "hire_date", "last_raise_date", "gender", "ethnicity"] }
```

### Step 3: Get market benchmarks

Use `capability_execute` with capabilityId `compensation.get_benchmarks` and packId `human-resources`
to retrieve external compensation data for the relevant role, level, and location.

Pass in args:
```
{ "role": "<role title>", "level": "<level>", "location": "<location or region>", "data_points": ["p25", "p50", "p75", "p90"] }
```

If compensation benchmarks are unavailable, use `capability_execute` with capabilityId
`research.web_search` and packId `human-resources` to search for publicly available
compensation data:

```
{ "query": "<role title> <level> compensation benchmark <location> <current year>", "sources": ["levels.fyi", "glassdoor", "payscale", "builtin"] }
```

### Step 4: Perform the analysis

#### Type: Benchmarking

Compare the employee or cohort compensation against market data:

1. **Position vs. Market** -- Where the employee sits relative to P25, P50, P75, P90
2. **Compa-Ratio** -- Calculate base salary / market P50 and express as a percentage
3. **Total Comp Comparison** -- Compare total compensation (base + bonus + equity)
4. **Geographic Adjustment** -- Note if location-based adjustments apply
5. **Peer Comparison** -- Compare against internal peers at the same level
6. **Recommendation** -- Whether compensation is competitive, below-market, or above-market

#### Type: Band Placement

Assess where the employee falls within the company's compensation bands:

1. **Band Definition** -- Show the min, mid, and max for the employee's level
2. **Current Placement** -- Where the employee sits within the band (percentile)
3. **Time in Band** -- How long since hire or last promotion
4. **Band Penetration Rate** -- Percentage of band range utilized
5. **Raise History** -- Last raise date and percentage
6. **Risk Assessment** -- Retention risk based on band position and tenure
7. **Adjustment Recommendation** -- Suggested adjustment amount and timing if needed

#### Type: Equity Modeling

Model pay equity across a department or company:

1. **Cohort Definition** -- Who is being compared (same role/level, department)
2. **Statistical Summary** -- Mean, median, min, max, standard deviation for the cohort
3. **Demographic Analysis** -- Compensation distribution by gender and ethnicity
4. **Gap Identification** -- Statistically significant pay gaps with magnitude
5. **Regression Factors** -- Legitimate factors (tenure, performance, location) vs. unexplained gaps
6. **Remediation Estimate** -- Estimated cost to close identified gaps
7. **Priority Actions** -- Ranked list of individual adjustments to address the largest gaps

### Step 5: Generate the report

Use `capability_execute` with capabilityId `docs.create_brief` and packId `human-resources`
to save the analysis report.

Pass in args:
```
{ "title": "Compensation Analysis - <analysis type> - <scope> - <date>", "content": "<generated report>", "folder": "HR/Compensation" }
```

### Output Format

Present the analysis in a structured report format:

```
## Compensation Analysis: <Analysis Type>
**Scope:** <Individual / Cohort / Department / Company>
**Date:** <Current Date>
**Prepared for:** <Requesting manager or HR contact>

---

### Executive Summary
<2-3 sentence overview of key findings>

### Data Sources
- Internal: <HRIS system>
- External: <Benchmark sources used>

---

[Analysis sections based on the type selected above]

---

### Recommendations
| Priority | Action | Employee/Group | Amount | Rationale |
|----------|--------|----------------|--------|-----------|
| 1        | ...    | ...            | ...    | ...       |

### Methodology Notes
<Brief note on data sources, confidence level, and any limitations>
```
