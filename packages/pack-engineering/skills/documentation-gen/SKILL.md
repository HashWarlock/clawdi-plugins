---
name: engineering-documentation-gen
description: Generate technical documentation by gathering context from code, discussions, and existing docs
metadata:
  openclaw:
    tags: [engineering, documentation, technical-writing]
---

# Documentation Generation Workflow

When the user asks to generate documentation, write a technical doc,
or document a system, API, or process:

## Step 1: Gather existing documentation on the topic

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<topic_or_component_name>"
  - maxResults: 15
  - tags: ["documentation", "design-doc", "api-doc", "runbook", "readme",
           "architecture", "onboarding"]

Find all existing documentation related to the topic. Identify what
exists, what is outdated, and what gaps need to be filled.

## Step 2: Search for related design documents and ADRs

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<component_name> design RFC ADR architecture decision"
  - maxResults: 8
  - tags: ["adr", "rfc", "design-doc"]

Design documents and ADRs contain the rationale behind technical
decisions that should be reflected in the documentation.

## Step 3: Retrieve related tasks and specifications

Use `capability_execute` with the following parameters:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "<component_or_feature_name> label:documentation OR label:spec"
  - maxResults: 20
  - fields: ["title", "description", "labels", "status", "comments",
             "acceptanceCriteria", "linkedPRs"]

Gather requirements, specifications, and implementation details from
project tasks. PR descriptions often contain valuable technical context.

## Step 4: Search engineering discussions for tribal knowledge

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "engineering"
- args:
  - query: "<component_name> how does why did architecture explain"
  - channels: ["engineering", "<team_channel>", "architecture", "questions"]
  - maxResults: 20
  - dateRange: "last_180_days"

Capture tribal knowledge from engineering discussions. These conversations
often contain explanations, gotchas, and context that never make it into
formal documentation.

## Step 5: Research relevant external documentation and standards

Use `capability_execute` with the following parameters:
- capabilityId: "research.web_search"
- packId: "engineering"
- args:
  - query: "<technology_or_pattern_used> documentation best practices examples"
  - maxResults: 5

Find documentation standards, templates, and examples relevant to the
technology stack being documented.

## Step 6: Determine the documentation type and audience

Based on the user's request and gathered context, classify the document:

**Documentation types:**
- **API Reference:** Endpoint/method documentation for consumers
- **Architecture Overview:** System design and component relationships
- **Runbook:** Operational procedures for on-call and DevOps
- **Getting Started Guide:** Onboarding for new developers
- **How-to Guide:** Task-oriented instructions for specific workflows
- **Troubleshooting Guide:** Problem-solution pairs for common issues
- **Migration Guide:** Steps for upgrading or transitioning

**Audience:**
- External developers (API consumers)
- Internal engineers (same team)
- Internal engineers (other teams)
- DevOps / SRE
- New team members

## Step 7: Generate the documentation

Adapt the format to the documentation type. Default to Architecture
Overview if the type is ambiguous.

```
## Generated Documentation

### Document Metadata
- **Title:** <clear descriptive title>
- **Type:** <api-reference/architecture/runbook/getting-started/how-to/troubleshooting/migration>
- **Audience:** <who this is for>
- **Component/System:** <what is being documented>
- **Last updated:** <current_date>
- **Author:** Generated with AI assistance, reviewed by <user>

---

### <Document Title>

#### Overview
<2-3 paragraphs providing context on what this component/system does,
why it exists, and how it fits into the broader architecture>

#### Key Concepts
Define important terms and concepts the reader needs to understand:

- **<concept>:** <definition>
- **<concept>:** <definition>
- **<concept>:** <definition>

#### Architecture / Design
<describe the high-level architecture, including:>

- Component diagram or description of major components
- Data flow between components
- External dependencies
- Key design decisions and their rationale (sourced from ADRs)

**Design decisions:**
| Decision | Choice | Rationale | ADR Reference |
|----------|--------|-----------|---------------|
| <decision> | <what was chosen> | <why> | <adr_link_if_found> |

#### Setup / Prerequisites
<what the reader needs before they can work with this component>

1. <prerequisite>
2. <prerequisite>
3. <prerequisite>

#### Usage

##### <Use Case 1>
<step-by-step instructions>

1. <step>
2. <step>
3. <step>

**Example:**
```
<code or configuration example>
```

##### <Use Case 2>
<step-by-step instructions>

#### Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| <param> | <type> | <default> | <what it does> |

#### API Reference (if applicable)
##### <Endpoint / Method>
- **Path/Signature:** <path_or_signature>
- **Method:** <HTTP_method_or_call_pattern>
- **Description:** <what it does>
- **Parameters:**
  | Name | Type | Required | Description |
  |------|------|----------|-------------|
  | <param> | <type> | <yes/no> | <description> |
- **Response:** <response_format>
- **Example:**
```
<request/response example>
```

#### Error Handling
| Error | Cause | Resolution |
|-------|-------|------------|
| <error> | <why it happens> | <how to fix> |

#### Monitoring & Observability
- **Key metrics:** <what to watch>
- **Alerts:** <what alerts exist and what they mean>
- **Dashboards:** <where to find them>
- **Logs:** <where to find relevant logs and what to search for>

#### Troubleshooting
| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| <symptom> | <cause> | <fix> |

#### Known Limitations
- <limitation with context on why and any planned remediation>
- <limitation>

#### Related Documentation
- [<related doc title>](<link>)
- [<related doc title>](<link>)

#### Changelog
| Date | Change | Author |
|------|--------|--------|
| <date> | Document created | <user> |

---

### Generation Notes (internal, not published)
- **Sources used:**
  - <list of design docs, ADRs, tasks, and chat threads referenced>
- **Gaps identified:**
  - <areas where information was incomplete or contradictory>
- **Recommended reviewers:**
  - <people who should review based on authorship of source materials>
- **Existing docs to update/retire:**
  - <outdated docs found that overlap with this new document>
```

## Step 8: Offer to publish the document

Ask the user to review the generated documentation. Once approved,
use `capability_execute` with:
- capabilityId: "docs.create_brief"
- packId: "engineering"
- args:
  - title: "<document_title>"
  - content: "<document_body_without_generation_notes>"
  - folder: "engineering/<component_or_doc_type>"
  - tags: <relevant_tags>
  - metadata:
    - type: "<doc_type>"
    - component: "<component_name>"
    - audience: "<audience>"
    - lastUpdated: "<current_date>"

Note: This is a side-effecting action. The router will request confirmation.

After publication, remind the user to:
1. Have the document reviewed by a subject matter expert
2. Update any outdated related documents identified in the generation notes
3. Link the new document from relevant README files or wikis
