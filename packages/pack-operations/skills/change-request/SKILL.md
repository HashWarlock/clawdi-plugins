---
name: ops-change-request
description: Create a structured change request document with impact analysis, risk assessment, implementation plan, and rollback procedure. Triggers on "change request", "submit a change", "RFC for [change]", "change management for [update]", "change proposal"
metadata:
  openclaw:
    tags: [operations, change-management, governance]
---

## Change Request

When the user asks to create a change request or RFC:

### Step 1: Gather change details

Determine from the user:
- **Change title**: what is being changed
- **Change type**: standard, normal, emergency, expedited
- **Description**: detailed explanation of the change
- **Reason**: business justification and driver
- **Scope**: what systems, services, or processes are affected
- **Requestor**: who is requesting the change
- **Implementation window**: proposed date and time
- **Urgency**: low, medium, high, critical

### Step 2: Assess current state

Use `capability_execute` with capabilityId "project.list_tasks" to check:
- Related ongoing work or dependent tasks
- Open incidents related to the affected systems
- Previously planned changes in the same window
- Blocked or at-risk items that this change could affect

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Existing architecture documentation for affected systems
- Previous change requests for the same systems
- Standard operating procedures that may need updating
- Configuration baselines or runbooks

### Step 3: Impact analysis

Use `capability_execute` with capabilityId "research.web_search" for:
- Known issues or advisories related to the change (e.g., vendor patch notes)
- Best practices for this type of change
- Common failure modes documented by others

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Team discussions about this change or related systems
- Past incidents involving the affected components
- Stakeholder concerns already raised

### Step 4: Build the change request

Analyze:
- **Technical impact**: which systems, services, and integrations are affected
- **Business impact**: user-facing effects, downtime, data changes
- **Dependency analysis**: upstream and downstream systems
- **Risk level**: probability and severity of negative outcomes
- **Testing requirements**: what must be validated before and after
- **Communication needs**: who must be notified and when

### Step 5: Create supporting tasks

Use `capability_execute` with capabilityId "project.create_task" to create:
- Implementation task with the detailed plan
- Testing/validation task
- Communication task
- Rollback readiness task (if applicable)

### Step 6: Distribute for review

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Complete change request document

Use `capability_execute` with capabilityId "mail.send_followup" to notify:
- Change Advisory Board or approvers
- Affected team leads
- On-call engineers for the implementation window

### Output Format

**Change Request: [CR-XXXX] [Change Title]**

**Change Summary**

| Field | Value |
|---|---|
| CR ID | CR-XXXX (auto-generated) |
| Title | change title |
| Type | Standard / Normal / Emergency |
| Priority | Low / Medium / High / Critical |
| Requestor | name |
| Date Submitted | date |
| Implementation Window | date, time, duration |
| Status | Draft / Pending Approval / Approved |

**Description**
Detailed explanation of what is being changed and why.

**Business Justification**
Why this change is necessary, what happens if it is not made, and alignment with business objectives.

**Scope of Change**

| Component | Type of Change | Current State | Target State |
|---|---|---|---|
| system/service | modify/add/remove/update | current config | new config |

**Impact Analysis**

| Impact Area | Assessment | Details |
|---|---|---|
| User-facing impact | None / Minimal / Moderate / Significant | description |
| Downtime required | Yes / No | duration if yes |
| Data changes | Yes / No | what data is affected |
| Integration effects | Yes / No | which integrations |
| Performance impact | Yes / No | expected effect |

**Dependencies**

| Dependency | Type | Status | Risk if Unavailable |
|---|---|---|---|
| dependency | Pre-req / Co-req / Post-req | Ready / Pending | impact |

**Risk Assessment**

| Risk | Probability | Severity | Risk Score | Mitigation |
|---|---|---|---|---|
| risk description | Low/Med/High | Low/Med/High | score | mitigation action |

**Overall Risk Level**: Low / Medium / High / Critical

**Implementation Plan**

| Step | Action | Owner | Duration | Checkpoint |
|---|---|---|---|---|
| 1 | Pre-implementation backup | name | Xm | Backup verified |
| 2 | Notify stakeholders | name | Xm | Confirmation received |
| 3 | Apply change | name | Xm | Change verified |
| 4 | Run validation tests | name | Xm | Tests pass |
| 5 | Monitor for issues | name | Xm | Metrics stable |
| 6 | Close change record | name | Xm | Documentation updated |

**Testing & Validation**

| Test | Method | Expected Result | Owner |
|---|---|---|---|
| test description | how to test | what success looks like | name |

**Rollback Plan**

| Step | Action | Duration | Trigger Condition |
|---|---|---|---|
| 1 | action to reverse the change | Xm | what triggers rollback |
| 2 | validate rollback | Xm | confirmation criteria |
| 3 | notify stakeholders | Xm | all affected parties informed |

**Rollback decision point**: How long after implementation before rollback is no longer feasible.

**Communication Plan**

| Audience | When | Channel | Message |
|---|---|---|---|
| audience | timing | email/slack/etc | what to communicate |

**Approvals Required**

| Approver | Role | Status | Date |
|---|---|---|---|
| name | role (CAB, tech lead, etc) | Pending / Approved | date |

**Post-Implementation Review**
- Schedule: when to review the change outcome
- Success criteria: how to determine the change was successful
- Lessons learned: to be completed after implementation
