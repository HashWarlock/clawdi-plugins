---
name: performance-review
description: Structure performance reviews with self-assessment, manager review, or calibration templates
metadata:
  openclaw:
    tags: [human-resources, performance, reviews]
---

## Performance Review Workflow

You help HR teams and managers structure performance reviews. You support three
modes: self-assessment, manager review, and calibration. Adapt your output based
on which mode the user requests or infer from context.

### Step 1: Identify the review subject and mode

Ask for or infer:
- **Employee name or ID** to review
- **Review mode**: self-assessment, manager-review, or calibration
- **Review period** (e.g., Q1 2026, H2 2025, annual 2025)

If the user does not specify a mode, default to manager-review.

### Step 2: Retrieve employee profile

Use `capability_execute` with capabilityId `hris.get_employee` and packId `human-resources`
to pull the employee's current role, department, level, tenure, and reporting chain.

Pass the employee name or ID in args:
```
{ "query": "<employee name or id>", "fields": ["name", "role", "department", "level", "start_date", "manager", "direct_reports"] }
```

### Step 3: Gather project and task history

Use `capability_execute` with capabilityId `project.list_tasks` and packId `human-resources`
to retrieve the employee's completed and in-progress work items for the review period.

Pass in args:
```
{ "assignee": "<employee name or id>", "date_range": "<review period start> to <review period end>", "status": ["completed", "in_progress"] }
```

If this capability is unavailable, note that project data was not available and proceed
with the information you have.

### Step 4: Search for prior review documents

Use `capability_execute` with capabilityId `docs.search_files` and packId `human-resources`
to find any prior performance review documents, feedback notes, or 1:1 notes for the employee.

Pass in args:
```
{ "query": "performance review <employee name> <prior period>", "file_types": ["doc", "pdf", "md"] }
```

### Step 5: Generate the review document

Based on the selected mode, produce the appropriate template.

#### Mode: Self-Assessment

Produce a structured self-assessment template with these sections:

1. **Role Summary** -- Current role, level, and team context
2. **Key Accomplishments** -- 3-5 achievements from the review period, each with:
   - What was accomplished
   - Impact or outcome
   - Skills demonstrated
3. **Growth Areas** -- 2-3 areas where the employee grew during the period
4. **Challenges and Learnings** -- Obstacles faced and what was learned
5. **Goals for Next Period** -- 2-4 forward-looking goals
6. **Development Requests** -- Training, mentorship, or resources desired
7. **Overall Self-Rating** -- A scale prompt (Exceeds / Meets / Developing / Below)

#### Mode: Manager Review

Produce a structured manager review template with these sections:

1. **Employee Overview** -- Name, role, level, tenure, reporting chain
2. **Performance Summary** -- 2-3 paragraph narrative of overall performance
3. **Key Contributions** -- 3-5 specific contributions with measurable impact
4. **Competency Ratings** -- Rate each competency on a 1-5 scale:
   - Technical / functional expertise
   - Collaboration and communication
   - Leadership and initiative
   - Problem solving and judgment
   - Reliability and execution
5. **Strengths** -- 2-3 core strengths with examples
6. **Development Areas** -- 2-3 areas for improvement with actionable suggestions
7. **Goals for Next Period** -- 2-4 goals aligned with team and company objectives
8. **Promotion Readiness** -- Assessment of readiness for next level
9. **Overall Rating** -- Final rating with justification

#### Mode: Calibration

Produce a calibration-ready summary for use in cross-team review sessions:

1. **Employee Snapshot** -- Name, role, level, tenure, manager
2. **Rating Proposed** -- The manager's proposed rating
3. **Rating Justification** -- 3-5 bullet points supporting the rating
4. **Comparable Peers** -- Note the employee's level cohort for context
5. **Promotion Case** -- If applicable, a brief case for or against promotion
6. **Compensation Flag** -- Note if the employee is below band midpoint or has equity concerns
7. **Calibration Notes** -- Space for cross-functional feedback during the session

### Step 6: Save the review document

Use `capability_execute` with capabilityId `docs.create_brief` and packId `human-resources`
to save the generated review document.

Pass in args:
```
{ "title": "Performance Review - <employee name> - <review period>", "content": "<generated review>", "folder": "HR/Performance Reviews/<review period>" }
```

### Output Format

Present the review in clean markdown with clear section headers. Begin with a brief
summary of the employee context, then the full review template populated with whatever
data was available. End with a note about any sections that need manual input from
the reviewer or the employee.

```
## Performance Review: <Employee Name>
**Period:** <Review Period>
**Mode:** <Self-Assessment | Manager Review | Calibration>
**Department:** <Department> | **Level:** <Level> | **Tenure:** <Tenure>

---

[Full review content organized by the mode-specific sections above]

---

### Sections Requiring Input
- [ ] <List any sections that need manual completion>
```
