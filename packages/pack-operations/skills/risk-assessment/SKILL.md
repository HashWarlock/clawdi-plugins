---
name: ops-risk-assessment
description: Evaluate and document risks for a project, initiative, operational change, or business decision with scoring, mitigation plans, and monitoring strategy. Triggers on "assess risks for", "risk analysis of", "what could go wrong with", "risk register for [project]", "evaluate risk"
metadata:
  openclaw:
    tags: [operations, risk, assessment, governance]
---

## Risk Assessment

When the user asks to assess risks for a project, initiative, or decision:

### Step 1: Define assessment scope

Gather from the user:
- **Subject**: what is being assessed (project, initiative, change, vendor, process)
- **Context**: background and current status
- **Stakeholders**: who is affected and who cares about the outcome
- **Risk appetite**: conservative, moderate, or aggressive
- **Time horizon**: when do the risks materialize
- **Known concerns**: risks already identified by the team

### Step 2: Gather project and context data

Use `capability_execute` with capabilityId "project.list_tasks" to check:
- Project plan and current status
- Overdue tasks and blocked items
- Resource allocation and dependencies
- Milestone timeline and progress

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Project charter or proposal documents
- Architecture and design documents
- Previous risk assessments for this or similar projects
- Lessons learned from past projects
- Vendor contracts or SLAs (if applicable)

### Step 3: External risk factors

Use `capability_execute` with capabilityId "research.web_search" to identify:
- Market or industry risks relevant to the subject
- Technology risks (end-of-life, vulnerabilities, adoption trends)
- Regulatory or compliance risks
- Economic factors that could affect the initiative
- Competitor actions that create risk

### Step 4: Internal risk signals

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Team discussions expressing concerns
- Escalations or blockers related to the subject
- Resource or timeline pressure signals
- Dependency risks mentioned by other teams

Use `capability_execute` with capabilityId "calendar.read_events" to check:
- Deadline compression visible in the calendar
- Key stakeholder availability during critical periods
- Competing priorities in the same timeframe

### Step 5: Identify and categorize risks

Categorize each risk:
- **Strategic**: risks to business objectives or market position
- **Operational**: risks to execution, processes, or resources
- **Technical**: risks to technology, architecture, or infrastructure
- **Financial**: risks to budget, ROI, or cost structure
- **Compliance**: risks to regulatory or policy compliance
- **Reputational**: risks to brand, trust, or stakeholder relationships
- **People**: risks related to staffing, skills, or team dynamics

### Step 6: Score each risk

Use a 5x5 risk matrix:
- **Likelihood**: 1 (Rare) to 5 (Almost Certain)
- **Impact**: 1 (Negligible) to 5 (Critical)
- **Risk Score**: Likelihood x Impact (1-25)
- **Risk Level**: Low (1-5), Medium (6-12), High (13-19), Critical (20-25)

### Step 7: Develop mitigation strategies

For each significant risk, define:
- **Mitigation action**: what to do to reduce the risk
- **Risk response type**: Avoid, Mitigate, Transfer, Accept
- **Owner**: who is responsible for the mitigation
- **Residual risk**: risk level after mitigation is applied
- **Monitoring approach**: how to detect if the risk materializes

### Step 8: Create tracking tasks

Use `capability_execute` with capabilityId "project.create_task" to create:
- Mitigation action items for high and critical risks
- Risk review checkpoints at key milestones

### Output Format

**Risk Assessment: [Subject]**

**Assessment Summary**

| Field | Value |
|---|---|
| Subject | what is being assessed |
| Date | assessment date |
| Assessor | name |
| Risk Appetite | Conservative / Moderate / Aggressive |
| Overall Risk Level | Low / Medium / High / Critical |
| Total Risks Identified | X |
| Critical Risks | X |
| High Risks | X |

**Risk Heat Map**

```
Impact ->    Negligible   Minor   Moderate   Major   Critical
             (1)         (2)     (3)        (4)     (5)
Almost       |  5  |  10  |  15  |  20  |  25  |
Certain (5)  |     |      |      | [R3] |      |
Likely (4)   |  4  |   8  |  12  |  16  |  20  |
             |     |      | [R1] |      |      |
Possible (3) |  3  |   6  |   9  |  12  |  15  |
             |     |      |      | [R2] |      |
Unlikely (2) |  2  |   4  |   6  |   8  |  10  |
             |     |      |      |      |      |
Rare (1)     |  1  |   2  |   3  |   4  |   5  |
```

**Risk Register**

| ID | Risk | Category | Likelihood | Impact | Score | Level | Response | Owner |
|---|---|---|---|---|---|---|---|---|
| R1 | risk description | category | X/5 | X/5 | X | level | Avoid/Mitigate/Transfer/Accept | name |
| R2 | risk description | category | X/5 | X/5 | X | level | response | name |
| R3 | risk description | category | X/5 | X/5 | X | level | response | name |

**Detailed Risk Analysis**

### R1: [Risk Title]

**Description**: detailed explanation of the risk
**Category**: risk category
**Trigger**: what would cause this risk to materialize
**Likelihood rationale**: why this likelihood was assigned
**Impact rationale**: what happens if this risk occurs

**Mitigation Plan**:
1. Specific action to reduce likelihood or impact
2. Specific action
3. Specific action

**Residual Risk**: score after mitigation (X/25)
**Monitoring**: how to watch for early warning signs
**Contingency**: what to do if the risk materializes despite mitigation

---

(Repeat for each significant risk)

**Risk Interdependencies**
- Which risks are connected and could cascade
- Compound scenarios where multiple risks occur together

**Monitoring Plan**

| Risk ID | Indicator | Threshold | Check Frequency | Owner |
|---|---|---|---|---|
| R1 | what to watch | when to escalate | how often | name |

**Recommendations**

1. **Immediate actions**: what to do now to address critical and high risks
2. **Structural changes**: process or resource changes to reduce systemic risk
3. **Monitoring cadence**: how often to review and update this assessment

**Review Schedule**
- Next review date: [date]
- Review triggers: what events should trigger an off-cycle review
