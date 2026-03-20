---
name: engineering-architecture-review
description: Conduct a structured architecture review for a proposed design, system, or technical approach
metadata:
  openclaw:
    tags: [engineering, architecture, design-review]
---

# Architecture Review Workflow

When the user asks to review an architecture proposal, evaluate a design doc,
or assess a technical approach:

## Step 1: Retrieve the design document or proposal

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<design_doc_title_or_topic_keywords>"
  - maxResults: 5
  - tags: ["design-doc", "rfc", "proposal", "architecture"]

Locate the design document, RFC, or proposal under review. If the user
provides a direct link or document name, search for it specifically.

## Step 2: Find related ADRs and prior design decisions

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<system_or_component_name> ADR architecture decision"
  - maxResults: 10
  - tags: ["adr", "architecture", "design-doc"]

Gather existing architecture decision records and prior designs for the
same system or adjacent systems. Understanding what was decided before
is essential for evaluating whether a new proposal is consistent or
deliberately diverging.

## Step 3: Gather related project tasks and requirements

Use `capability_execute` with the following parameters:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "label:architecture OR label:design OR label:rfc <component_name>"
  - maxResults: 15
  - fields: ["title", "description", "labels", "status", "comments"]

Find related tickets, epics, or tasks that provide requirements context,
known constraints, or stakeholder feedback on the design.

## Step 4: Search for engineering discussions about the proposal

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "engineering"
- args:
  - query: "<design_doc_title> OR <system_name> architecture design review"
  - channels: ["engineering", "architecture", "<team_channel>"]
  - maxResults: 15
  - dateRange: "last_60_days"

Find any discussions, debates, concerns, or alternative approaches that
team members have raised about this proposal.

## Step 5: Research industry patterns and prior art

Use `capability_execute` with the following parameters:
- capabilityId: "research.web_search"
- packId: "engineering"
- args:
  - query: "<proposed_architecture_pattern> <technology_stack> trade-offs production experience"
  - maxResults: 8

Research how similar architectures have performed at scale, what common
pitfalls exist, and what the industry consensus is on the proposed approach.

## Step 6: Check for operational and infrastructure implications

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<affected_services> infrastructure deployment monitoring SLA"
  - maxResults: 5
  - tags: ["infrastructure", "ops", "monitoring", "sla"]

Understand the operational context: current SLAs, monitoring coverage,
deployment procedures, and infrastructure constraints that the proposed
architecture must work within.

## Step 7: Compile the architecture review

Format the output as follows:

```
## Architecture Review

### Proposal Summary
- **Document:** <title and link>
- **Author(s):** <design_doc_authors>
- **System/Component:** <what is being designed or changed>
- **Review date:** <current_date>
- **Reviewer:** <current_user>

### Problem Statement
<restate the problem being solved in 2-3 sentences, as understood from
the design doc>

### Proposed Solution Summary
<concise summary of the proposed architecture, highlighting the key
design decisions>

### Review Dimensions

#### Correctness & Completeness
- Does the proposal solve the stated problem?
- Are there requirements or edge cases not addressed?
- **Assessment:** <meets/partially meets/does not meet>
- **Notes:** <specific observations>

#### Consistency with Existing Architecture
- How does this fit with existing systems and patterns?
- Are there conflicts with prior ADRs?
- **Prior decisions:** <relevant ADRs found and their relationship>
- **Assessment:** <consistent/divergent with justification/conflicting>
- **Notes:** <specific observations>

#### Scalability
- How does the design handle growth in data, traffic, or users?
- What are the scaling limits?
- **Assessment:** <adequate/concerns/insufficient>
- **Notes:** <specific scaling observations>

#### Reliability & Failure Modes
- What happens when components fail?
- Are there single points of failure?
- How does the design handle partial failures?
- **Assessment:** <robust/adequate/fragile>
- **Notes:** <specific failure scenarios to consider>

#### Operability
- Can this be deployed incrementally or does it require a big-bang migration?
- How is it monitored and debugged?
- What is the rollback strategy?
- **Current SLAs:** <relevant SLAs for affected services>
- **Assessment:** <operable/concerns/difficult>
- **Notes:** <specific operational observations>

#### Security
- What is the trust boundary model?
- How is authentication and authorization handled?
- Are there data privacy implications?
- **Assessment:** <adequate/needs review/concerns>
- **Notes:** <specific security observations>

#### Cost & Complexity
- What is the implementation complexity relative to the problem?
- Are there simpler alternatives that were considered?
- What is the ongoing operational cost?
- **Assessment:** <proportional/over-engineered/under-invested>
- **Notes:** <observations>

### Industry Context
- <relevant patterns or anti-patterns from research>
- <lessons from similar architectures at other organizations>
- <emerging best practices that apply>

### Stakeholder Feedback Summary
- <key points raised in chat discussions>
- <unresolved debates or open questions from the team>

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| <risk> | <low/medium/high> | <low/medium/high> | <suggested mitigation> |

### Recommendations
1. **Must address before approval:**
   - <blocking issue with specific suggestion>
2. **Should address:**
   - <important improvement with rationale>
3. **Consider for future iteration:**
   - <non-blocking suggestion for refinement>

### Verdict
<approve / approve with conditions / request revision / reject>

**Rationale:** <2-3 sentences explaining the overall assessment>

### Suggested Next Steps
1. <specific action with owner>
2. <specific action with owner>
3. <timeline recommendation>
```

If certain review dimensions cannot be fully assessed due to missing
information, state what is missing rather than skipping the dimension.
