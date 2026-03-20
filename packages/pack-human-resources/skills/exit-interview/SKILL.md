---
name: exit-interview
description: Structure exit interview processes and analyze departure patterns
metadata:
  openclaw:
    tags: [human-resources, exit-interview, attrition, retention]
---

## Exit Interview Workflow

You help HR teams structure exit interviews for departing employees and analyze
departure patterns across the organization. You support two modes: interview-prep
(structuring an individual exit interview) and pattern-analysis (analyzing trends
across multiple departures).

### Step 1: Identify the mode and context

Ask for or infer:
- **Mode**: interview-prep or pattern-analysis
- **For interview-prep**: departing employee name or ID, last day, departure reason
  if known (voluntary resignation, involuntary, retirement, relocation)
- **For pattern-analysis**: time period, department scope, and what patterns to examine

### Step 2: Retrieve the departing employee's profile (interview-prep mode)

Use `capability_execute` with capabilityId `hris.get_employee` and packId `human-resources`
to pull the departing employee's record.

Pass in args:
```
{ "query": "<employee name or id>", "fields": ["name", "role", "level", "department", "manager", "hire_date", "termination_date", "termination_reason", "tenure_months", "location", "last_promotion_date", "last_raise_date", "performance_rating"] }
```

### Step 3: Search for prior exit interview data

Use `capability_execute` with capabilityId `docs.search_files` and packId `human-resources`
to find prior exit interview records, templates, and aggregated feedback.

Pass in args:
```
{ "query": "exit interview <department or employee name>", "file_types": ["doc", "pdf", "md", "sheet", "csv"], "folders": ["HR", "Exit Interviews", "People Ops"] }
```

For pattern analysis, also search for aggregated exit data:

```
{ "query": "exit interview summary report attrition <time period>", "file_types": ["doc", "pdf", "sheet", "csv"], "folders": ["HR", "Exit Interviews", "People Analytics"] }
```

### Step 4: Pull departure data for pattern analysis

For pattern-analysis mode, use `capability_execute` with capabilityId
`hris.list_employees` and packId `human-resources` to retrieve all departures
in the analysis period.

Pass in args:
```
{ "filters": { "status": ["terminated"], "termination_date_range": "<period start> to <period end>", "department": "<department or all>" }, "fields": ["name", "role", "level", "department", "manager", "hire_date", "termination_date", "termination_reason", "termination_type", "tenure_months", "location", "performance_rating", "last_raise_date", "last_promotion_date"] }
```

### Step 5: Generate output by mode

#### Mode: Interview Prep

Produce a structured exit interview guide:

**Pre-Interview Briefing for HR Interviewer**

1. **Employee Context**
   - Name, role, department, manager, tenure
   - Departure type (voluntary/involuntary) and stated reason
   - Last performance rating and promotion/raise history
   - Any known concerns from prior 1:1s or engagement surveys

2. **Interview Setup**
   - Schedule a 30-45 minute meeting in a private setting
   - Emphasize confidentiality and that feedback is used to improve
   - Offer written submission as an alternative if the employee prefers
   - Assign an HR representative who is NOT the employee's direct HR partner

3. **Core Question Set**

   Opening (rapport building):
   - "Thank you for taking the time. Your feedback is valuable. Everything shared
     here is confidential and used to help us improve."
   - "Before we begin, is there anything you would like to ask about the offboarding
     process?"

   Role and experience:
   - "What did you enjoy most about your role here?"
   - "What aspects of your role were most challenging or frustrating?"
   - "Did you feel your skills and strengths were well-utilized?"

   Management and leadership:
   - "How would you describe your relationship with your direct manager?"
   - "Did you receive adequate feedback and support for your growth?"
   - "How effective was the leadership in your department?"

   Culture and environment:
   - "How would you describe the company culture?"
   - "Did you feel included and valued as a member of the team?"
   - "Were there any workplace issues that affected your experience?"

   Compensation and growth:
   - "Did you feel your compensation was fair relative to your contributions?"
   - "Were there sufficient opportunities for career growth and development?"
   - "Did you have access to the training and resources you needed?"

   Decision to leave:
   - "What was the primary factor in your decision to leave?"
   - "Was there anything the company could have done to change your mind?"
   - "When did you first start considering leaving?"

   Forward-looking:
   - "What advice would you give to your replacement?"
   - "What is the one thing you would change about the company if you could?"
   - "Would you consider returning to the company in the future?"

   Closing:
   - "Is there anything else you would like to share?"
   - "Would you be open to a brief follow-up survey in 3 months?"

4. **Customized Follow-Up Questions**
   Based on the employee's specific context (tenure, department, role), add 2-3
   targeted questions. For example:
   - If tenure < 12 months: "Was the onboarding experience adequate?"
   - If tenure > 5 years: "How did the company change over your time here?"
   - If last raise > 18 months ago: "Did compensation factor into your decision?"

5. **Documentation Template**
   Provide a structured form to capture responses:
   - Date of interview
   - Interviewer name
   - Key themes (3-5 bullets)
   - Departure reason (primary and contributing factors)
   - Would return: yes / no / maybe
   - Actionable suggestions from the employee
   - Confidential notes (not shared outside HR)

#### Mode: Pattern Analysis

Produce a departure pattern analysis report:

1. **Overview**
   - Total departures in period and comparison to prior period
   - Voluntary vs. involuntary breakdown
   - Regrettable vs. non-regrettable assessment

2. **Departure Reasons**
   - Primary reasons ranked by frequency
   - Reasons broken down by department and level
   - Emerging themes not captured by standard categories

3. **Tenure Analysis**
   - Average tenure at departure, overall and by type
   - Early attrition (< 1 year) rate and common causes
   - Long-tenure (> 5 years) departures and common causes

4. **Manager Analysis**
   - Managers with above-average attrition on their teams
   - Correlation between manager feedback scores and departures
   - Teams with clusters of departures in a short window

5. **Department Hotspots**
   - Departments with attrition above company average
   - Departments with rising attrition trends
   - Cross-department comparison

6. **Compensation Factor**
   - Percentage of departures citing compensation as a factor
   - Correlation between time since last raise and departure
   - Comparison of departed employees' comp vs. band midpoint

7. **Exit Interview Theme Extraction**
   - Top 5 recurring themes from exit interview responses
   - Sentiment analysis of qualitative feedback
   - Quotes or paraphrased examples (anonymized)

8. **Retention Risk Indicators**
   - Predictive factors identified from the departure data
   - Current employees who match high-risk profiles
   - Recommended interventions for at-risk populations

### Step 6: Save the output

Use `capability_execute` with capabilityId `docs.create_brief` and packId `human-resources`
to save the generated document.

For interview-prep:
```
{ "title": "Exit Interview Guide - <employee name> - <date>", "content": "<generated guide>", "folder": "HR/Exit Interviews/<year>" }
```

For pattern analysis:
```
{ "title": "Departure Pattern Analysis - <period> - <scope>", "content": "<generated report>", "folder": "HR/People Analytics/Exit Analysis" }
```

### Step 7: Send follow-up (optional)

If requested, use `capability_execute` with capabilityId `mail.send_followup` and
packId `human-resources` to send a follow-up thank you note to the departing employee
or share the analysis with HR leadership.

For departing employee:
```
{ "to": ["<employee email>"], "subject": "Thank you for your feedback", "body": "Thank you for taking the time to share your experience. Your feedback will help us improve. We wish you all the best in your next chapter." }
```

For HR leadership (pattern analysis):
```
{ "to": ["<hr leadership emails>"], "subject": "Departure Pattern Analysis - <period>", "body": "<executive summary with link to full report>" }
```

### Output Format

For interview-prep:
```
## Exit Interview Guide: <Employee Name>
**Role:** <Role> | **Department:** <Department>
**Manager:** <Manager>
**Tenure:** <Tenure> | **Last Day:** <Date>
**Departure Type:** <Voluntary / Involuntary>

---

### Pre-Interview Briefing
<Context and preparation notes>

### Interview Questions
<Organized question set with customized follow-ups>

### Documentation Form
| Field              | Response |
|--------------------|----------|
| Date               |          |
| Interviewer        |          |
| Key themes         |          |
| Primary reason     |          |
| Would return?      |          |
| Suggestions        |          |
```

For pattern analysis:
```
## Departure Pattern Analysis
**Period:** <Time Period>
**Scope:** <Department or Company>
**Departures Analyzed:** <Count>

---

### Key Findings
| Metric                    | Value | Prior Period | Trend |
|---------------------------|-------|--------------|-------|
| Total departures          | ...   | ...          | ...   |
| Voluntary rate            | ...   | ...          | ...   |
| Avg tenure at departure   | ...   | ...          | ...   |
| Top reason                | ...   | ...          | ...   |

[Detailed analysis sections as above]

### Priority Recommendations
1. <Highest-impact retention action>
2. <Second priority>
3. <Third priority>
```
