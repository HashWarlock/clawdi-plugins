---
name: write_spec
description: Write a comprehensive product specification document for a feature or project
metadata:
  openclaw:
    tags: [product-management, spec, documentation, planning]
---

# Write Spec

Write a comprehensive product specification document for a new feature, project,
or initiative. This skill gathers context from existing tasks and documents, then
produces a structured spec ready for review.

## When to Use

Activate this skill when the user wants to:

- Write a product requirement document (PRD) for a new feature
- Create a technical specification for an upcoming project
- Document the scope and requirements for a product initiative
- Turn a rough idea into a structured, reviewable spec

## Workflow

### Step 1: Gather the feature context

Ask the user for the core inputs if they have not provided them:

- **Feature name:** What is this feature called?
- **Problem statement:** What user problem does this solve?
- **Target users:** Who benefits from this feature?
- **High-level approach:** Any initial ideas on how it should work?

Accept whatever level of detail the user provides. The skill should produce
value even from a single sentence like "we need a better onboarding flow".

### Step 2: Search for related existing work

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `product-management`
- **args:**
  - `query`: the feature name and key terms from the problem statement
  - `maxResults`: 10

Look for:

- Prior specs or PRDs on similar topics
- Design documents that discuss this area
- Research findings related to the problem space
- Meeting notes that discussed this feature

Incorporate relevant findings as context for the spec.

### Step 3: Check for related tasks

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `query`: the feature name and related keywords
  - `status`: "all" (include completed and open tasks)
  - `maxResults`: 15

Identify:

- Existing tasks or tickets related to this feature
- Past work that was started but not completed
- Related bug reports or feature requests
- Dependencies that might affect the spec

### Step 4: Research external context (if relevant)

Use `capability_execute` with the following parameters:

- **capabilityId:** `research.web_search`
- **packId:** `product-management`
- **args:**
  - `query`: the problem space, how other products solve it
  - `maxResults`: 10

This step is optional. Use it when:

- The feature involves patterns common in other products
- There are industry standards or best practices to reference
- The user asked for competitive context

Skip it for purely internal features with no external analog.

### Step 5: Draft the spec

Compose the specification using all gathered context.

### Step 6: Save the spec (if requested)

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.create_brief`
- **packId:** `product-management`
- **args:**
  - `title`: "Spec: {feature name}"
  - `content`: the formatted spec content
  - `folder`: user-specified location or default specs folder

This capability is optional. If it returns `needs_setup`, present the spec
inline and let the user copy it.

## Output Format

```
## Product Specification: {Feature Name}

**Author:** {user name or "Product Team"}
**Date:** {current date}
**Status:** Draft
**Version:** 1.0

---

### 1. Problem Statement

{2-3 paragraphs describing the problem this feature solves.
Include user pain points, business impact, and any data supporting
the need for this feature.}

### 2. Goals and Non-Goals

**Goals:**
- {goal 1: measurable outcome this feature should achieve}
- {goal 2}
- {goal 3}

**Non-Goals:**
- {non-goal 1: explicitly out of scope to prevent scope creep}
- {non-goal 2}

### 3. Target Users

| User Segment | Description | Primary Need |
|-------------|-------------|--------------|
| {segment 1} | {description} | {what they need from this feature} |
| {segment 2} | {description} | {what they need} |

### 4. Proposed Solution

**Overview:**
{2-3 paragraphs describing the proposed approach at a high level.}

**Key User Flows:**

**Flow 1: {flow name}**
1. User {action}
2. System {response}
3. User {action}
4. System {response}

**Flow 2: {flow name}**
1. User {action}
2. System {response}
3. ...

### 5. Detailed Requirements

| ID | Requirement | Priority | Notes |
|----|------------|----------|-------|
| R1 | {requirement} | P0 | {notes} |
| R2 | {requirement} | P0 | {notes} |
| R3 | {requirement} | P1 | {notes} |
| R4 | {requirement} | P2 | {notes} |

### 6. Technical Considerations

{2-3 paragraphs on technical approach, architecture implications,
API changes, data model changes, or infrastructure needs.}

### 7. Dependencies

- {dependency 1: other teams, features, or systems this depends on}
- {dependency 2}

### 8. Success Metrics

| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| {metric} | {baseline} | {target} | {how to measure} |
| {metric} | {baseline} | {target} | {how to measure} |

### 9. Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| Design | {duration} | {description} |
| Build | {duration} | {description} |
| Test | {duration} | {description} |
| Launch | {duration} | {description} |

### 10. Open Questions

- {question 1: unresolved decision or unknown}
- {question 2}
- {question 3}

### 11. References

- {link to related doc}
- {link to related task}
- {link to related research}

---

**Related tasks found:** {list any existing tasks discovered in Step 3}
**Prior work found:** {list any existing docs discovered in Step 2}
```

Adjust section depth based on the maturity of the idea. For early-stage
concepts, sections 4-6 can be shorter with more open questions. For
well-defined features, provide maximum detail in requirements and
technical considerations.
