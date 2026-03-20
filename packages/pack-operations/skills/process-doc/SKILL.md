---
name: ops-process-doc
description: Create or update structured process documentation with step-by-step procedures, decision trees, and RACI matrices. Triggers on "document the process for", "write a process doc", "SOP for [process]", "how do we do [process]", "process documentation"
argument-hint: "<process name or description>"
user-invocable: true
metadata:
  openclaw:
    tags: [operations, documentation, process, SOP]
---

## Process Documentation

When the user asks to document a process or create an SOP:

### Step 1: Define the process scope

Gather from the user:
- **Process name**: what is being documented
- **Purpose**: why this process exists
- **Trigger**: what initiates the process
- **End state**: what a successful completion looks like
- **Audience**: who will follow this process
- **Frequency**: how often this process runs
- **Current state**: is this a new process or updating existing documentation

### Step 2: Gather existing information

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Existing documentation for this process (even if outdated)
- Related processes and dependencies
- Templates or formatting standards used by the organization
- Previous versions and change history

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Informal descriptions of the process shared in messages
- Questions and confusion points about the process
- Exceptions and edge cases mentioned by team members
- Recent changes to the process

Use `capability_execute` with capabilityId "project.list_tasks" to identify:
- Tasks that are part of this process workflow
- Recurring tasks related to this process
- Bottlenecks or frequently delayed steps

### Step 3: Research best practices

Use `capability_execute` with capabilityId "research.web_search" for:
- Industry best practices for this type of process
- Common pitfalls and how to avoid them
- Tools and automation opportunities
- Compliance requirements relevant to the process

### Step 4: Structure the process

Build the documentation with:
- Clear numbered steps in sequential order
- Decision points with explicit criteria and branches
- Inputs and outputs for each step
- Tools and systems used at each step
- Time estimates for each step
- Exception handling procedures
- Escalation paths
- Quality checkpoints

### Step 5: Define roles and responsibilities

Create a RACI matrix:
- **Responsible**: who does the work
- **Accountable**: who is ultimately answerable
- **Consulted**: who provides input
- **Informed**: who needs to know

### Step 6: Save and distribute

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Complete process document in the team's documentation platform

Use `capability_execute` with capabilityId "mail.send_followup" to notify:
- Process stakeholders about the new or updated documentation

### Output Format

**Process Document: [Process Name]**

**Document Control**

| Field | Value |
|---|---|
| Document ID | PROC-XXXX |
| Version | 1.0 |
| Status | Draft / Active / Under Review |
| Created | date |
| Last Updated | date |
| Owner | name |
| Review Cycle | quarterly / annually |
| Next Review | date |

**Purpose**
Clear statement of why this process exists and what business need it serves.

**Scope**
What this process covers and explicitly what it does not cover.

**Definitions**

| Term | Definition |
|---|---|
| term | clear definition |

**RACI Matrix**

| Step | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| step name | role | role | role | role |

**Prerequisites**
- What must be true before starting this process
- Required access, tools, or information

**Process Flow**

### Step 1: [Step Name]
**Trigger**: what initiates this step
**Owner**: responsible role
**Time estimate**: X minutes/hours
**Tools**: systems or tools used

**Procedure:**
1. Detailed sub-step
2. Detailed sub-step
3. Detailed sub-step

**Output**: what this step produces
**Quality check**: how to verify the step was done correctly

---

### Step 2: [Step Name]
**Trigger**: completion of step 1
**Owner**: responsible role
**Time estimate**: X minutes/hours

**Procedure:**
1. Detailed sub-step
2. Detailed sub-step

**Decision point**: If [condition], proceed to Step 3. If [other condition], proceed to Step 4.

---

(Continue for all steps)

**Decision Tree**

```
Start -> Step 1 -> [Decision] --(Yes)--> Step 2a -> Step 3
                              --(No)---> Step 2b -> Step 3
Step 3 -> [Decision] --(Pass)--> Complete
                     --(Fail)--> Step 4 (remediation) -> Step 3
```

**Exception Handling**

| Exception | Condition | Action | Escalation |
|---|---|---|---|
| exception type | when it occurs | what to do | who to contact |

**Escalation Path**

| Level | Condition | Contact | SLA |
|---|---|---|---|
| L1 | first-line issue | role/name | X hours |
| L2 | unresolved L1 | role/name | X hours |
| L3 | critical impact | role/name | X hours |

**Related Processes**
- List of related processes with links to their documentation

**Metrics & SLAs**

| Metric | Target | Measurement Method |
|---|---|---|
| Process completion time | X hours | tracking system |
| Error rate | <X% | quality checks |
| SLA compliance | X% | monitoring |

**Revision History**

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | date | name | Initial version |

**Appendices**
- Supporting templates, screenshots, or reference materials
