---
name: recruiting-interview-prep
description: Create structured interview plans with competency-based questions and scorecards. Triggers on "interview plan for [role]", "interview questions for [role]", "scorecard for [role]"
metadata:
  openclaw:
    tags: [recruiting, interviews, planning]
---

## Interview Prep

When the user asks for interview planning:

### Step 1: Define role competencies

Ask for (or infer from job description):
- Role title and level
- 4-6 key competencies (e.g., technical skills, leadership, collaboration, problem-solving, domain expertise, communication)

Use `capability_execute` with capabilityId "research.web_search" to:
- Research best practices for interviewing this role type
- Find relevant competency frameworks

### Step 2: Build question bank

For each competency, generate:
- 2-3 behavioral questions ("Tell me about a time...")
- 1-2 situational questions ("How would you handle...")
- Follow-up probes for each question

All questions should be:
- Structured (same for every candidate)
- Evidence-based (asking for specific examples)
- Level-appropriate (junior vs. senior expectations differ)

### Step 3: Create scorecard

For each competency, define a 1-4 scoring rubric:
- 1: Does not meet — description of what this looks like
- 2: Partially meets — description
- 3: Meets expectations — description
- 4: Exceeds expectations — description

### Step 4: Design interview panel

Suggest:
- Which competencies each interviewer should cover
- Interview format (duration, structure)
- How to avoid redundant questions across interviewers

### Output Format

**Interview Plan: [Role Title]**

**Competencies**
1. Competency — why it matters for this role
2. Competency — why it matters
...

**Question Bank**

### [Competency 1]

**Behavioral:**
- Q: question
  - Probe: follow-up
  - Probe: follow-up
- Q: question

**Situational:**
- Q: question

### [Competency 2]
...

**Scorecard**

| Competency | 1 (Does Not Meet) | 2 (Partial) | 3 (Meets) | 4 (Exceeds) |
|---|---|---|---|---|
| comp | description | description | description | description |

**Panel Assignment**

| Interviewer | Competencies | Duration | Format |
|---|---|---|---|
| Hiring Manager | leadership, domain | 45 min | behavioral |
| Tech Lead | technical, problem-solving | 60 min | live exercise |
| Peer | collaboration, communication | 30 min | behavioral |

**Debrief Template**
- Each interviewer shares scores and evidence
- Discuss: strong hire / hire / no hire / strong no hire
- Red flags or concerns
- Decision and next steps
