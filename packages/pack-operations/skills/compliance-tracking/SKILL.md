---
name: ops-compliance-tracking
description: Track compliance status against regulatory frameworks, internal policies, and audit requirements. Triggers on "compliance status", "audit readiness", "are we compliant with [framework]", "compliance gaps", "regulatory check"
metadata:
  openclaw:
    tags: [operations, compliance, governance, audit]
---

## Compliance Tracking

When the user asks about compliance status or audit readiness:

### Step 1: Define compliance scope

Gather from the user:
- **Framework(s)**: SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, SOX, custom internal policies
- **Scope**: full assessment, specific controls, gap analysis, audit preparation
- **Deadline**: upcoming audit date or regulatory deadline (if any)
- **Previous findings**: known gaps or prior audit results
- **Department/system**: which area to focus on

### Step 2: Gather current control status

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Existing compliance documentation and policies
- Control matrices and evidence logs
- Previous audit reports and findings
- Risk registers and treatment plans
- Vendor security assessments
- Data processing agreements
- Incident response plans and test results

Use `capability_execute` with capabilityId "project.list_tasks" to check:
- Open remediation items from previous audits
- Compliance-related tasks and their status
- Overdue security or compliance actions
- Pending policy reviews or updates

### Step 3: Research framework requirements

Use `capability_execute` with capabilityId "research.web_search" to gather:
- Latest updates to the target compliance framework
- Common audit findings and failures for the framework
- Best practices for evidence collection
- Regulatory enforcement actions or guidance updates
- Industry benchmarks for compliance maturity

### Step 4: Internal signals

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Discussions about compliance concerns or incidents
- Questions from team members about policy compliance
- Vendor compliance requests or questionnaires
- Security incident reports relevant to compliance

Use `capability_execute` with capabilityId "calendar.read_events" to check:
- Upcoming audit dates or compliance reviews
- Scheduled policy review meetings
- Training deadlines

### Step 5: Assess compliance posture

For each control area in the framework, evaluate:
- **Implemented**: control exists and is operating effectively
- **Partially implemented**: control exists but has gaps
- **Not implemented**: control is missing
- **Not applicable**: control does not apply to the scope

Identify:
- Controls with evidence gaps (implemented but not documented)
- Controls approaching review deadlines
- Controls with single points of failure
- Cross-framework control overlap (where one fix addresses multiple requirements)

### Step 6: Create remediation plan

Use `capability_execute` with capabilityId "project.create_task" to create:
- Remediation tasks for each gap identified
- Evidence collection tasks for undocumented controls
- Policy review tasks for outdated documents

### Output Format

**Compliance Status: [Framework] — [Date]**

**Executive Summary**
3-4 sentences covering overall compliance posture, audit readiness level, and the most critical gap to address.

**Compliance Scorecard**

| Category | Controls | Implemented | Partial | Missing | N/A | Score |
|---|---|---|---|---|---|---|
| Access Control | X | X | X | X | X | X% |
| Data Protection | X | X | X | X | X | X% |
| Incident Response | X | X | X | X | X | X% |
| Change Management | X | X | X | X | X | X% |
| Vendor Management | X | X | X | X | X | X% |
| Physical Security | X | X | X | X | X | X% |
| **Overall** | **X** | **X** | **X** | **X** | **X** | **X%** |

**Audit Readiness**: Ready / Conditionally Ready / Not Ready

**Critical Gaps** (must fix before audit)

| Control ID | Requirement | Current Status | Gap | Remediation | Owner | Due Date |
|---|---|---|---|---|---|---|
| ID | what is required | current state | what is missing | fix action | name | date |

**Evidence Gaps** (implemented but not documented)

| Control ID | Requirement | Evidence Needed | Status | Owner |
|---|---|---|---|---|
| ID | what is required | what evidence to collect | status | name |

**Upcoming Deadlines**

| Deadline | Type | Status | Risk Level |
|---|---|---|---|
| date | audit / review / certification | on track / at risk / overdue | level |

**Policy Review Status**

| Policy | Last Reviewed | Review Due | Status | Owner |
|---|---|---|---|---|
| policy name | date | date | Current / Due / Overdue | name |

**Open Remediation Items**

| Item | Source | Priority | Status | Owner | Due | Days Open |
|---|---|---|---|---|---|---|
| description | prior audit / internal | priority | status | name | date | X days |

**Risk Register (Compliance)**

| Risk | Framework | Likelihood | Impact | Current Controls | Residual Risk |
|---|---|---|---|---|---|
| risk | framework | level | level | what mitigates | level |

**Recommendations**

| Priority | Action | Framework | Impact | Effort | Owner |
|---|---|---|---|---|---|
| 1 | specific action | which framework | High | effort level | name |
| 2 | specific action | which framework | High | effort level | name |
| 3 | specific action | which framework | Medium | effort level | name |

**Cross-Framework Synergies**
- Controls that satisfy multiple frameworks simultaneously
- Efficiency opportunities for organizations with overlapping compliance requirements

**Next Steps**
1. Numbered list of immediate actions with owners and due dates
