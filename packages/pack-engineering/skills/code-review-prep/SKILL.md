---
name: engineering-code-review-prep
description: Prepare comprehensive code review briefs by gathering PR context, related issues, and design decisions
metadata:
  openclaw:
    tags: [engineering, code-review, pull-requests]
---

# Code Review Prep Workflow

When the user asks to prepare for a code review, summarize open PRs,
or create a review brief:

## Step 1: Retrieve open pull requests and tasks

Use `capability_execute` with the following parameters:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "type:pull_request state:open"
  - assignee: "<user_or_team_if_specified>"
  - maxResults: 20
  - fields: ["title", "author", "created", "updated", "labels", "reviewers",
             "branch", "description", "filesChanged", "additions", "deletions",
             "linkedIssues", "comments", "status"]
  - sortBy: "updated"
  - sortOrder: "desc"

If the result status is "needs_setup", inform the user that project tracker
access is required and suggest running `/connect_apps`.

## Step 2: Gather linked issues and design context for each PR

For each PR (or the specific PR requested), use `capability_execute` with:
- capabilityId: "project.list_tasks"
- packId: "engineering"
- args:
  - filter: "id:<linked_issue_ids>"
  - fields: ["title", "description", "labels", "comments", "status",
             "acceptanceCriteria"]

Collect the original issue context, acceptance criteria, and any design
decisions documented in the issue comments.

## Step 3: Search for related design documents and ADRs

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<PR_title_keywords> OR <linked_issue_keywords> design RFC ADR"
  - maxResults: 8
  - tags: ["design-doc", "rfc", "adr", "architecture"]

Find any architecture decision records, design documents, or RFCs that
informed the changes in the PR. This provides essential review context.

## Step 4: Search engineering discussions for context

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "engineering"
- args:
  - query: "<PR_title_or_feature_keywords>"
  - channels: ["engineering", "code-review", "<team_channel>"]
  - maxResults: 10
  - dateRange: "last_30_days"

Find any design discussions, tradeoff debates, or context that was shared
in chat but may not be captured in the PR description.

## Step 5: Research relevant patterns and best practices

Use `capability_execute` with the following parameters:
- capabilityId: "research.web_search"
- packId: "engineering"
- args:
  - query: "<primary_technology_or_pattern_in_PR> best practices pitfalls"
  - maxResults: 5

If the PR introduces a new pattern, library, or architectural approach,
find relevant best practices to inform the review checklist.

## Step 6: Compile the code review brief

Format the output as follows:

```
## Code Review Brief

**Date:** <current_date>
**Reviewer:** <current_user>
**PRs reviewed:** <count>

---

### PR: <PR_title>
**Author:** <author> | **Branch:** <branch>
**Created:** <date> | **Last updated:** <date>
**Size:** +<additions> / -<deletions> across <files_changed> files
**Status:** <draft/ready/changes_requested/approved>
**Reviewers:** <assigned_reviewers>

#### Context
<2-3 sentence summary of what this PR does and why, drawn from the linked
issue, PR description, and design documents>

#### Linked Issues
- <issue_id>: <issue_title> (<status>)
  - Acceptance criteria: <brief summary>

#### Design Context
- <design_doc_or_ADR_reference>: <key decisions relevant to this PR>
- <chat_discussion_summary>: <relevant context from engineering channels>

#### Review Checklist
Based on the changes and context gathered:

- [ ] **Correctness:** Does the implementation match the acceptance criteria?
- [ ] **Architecture:** Does it follow the patterns described in <design_doc>?
- [ ] **Error handling:** Are failure modes handled appropriately?
- [ ] **Testing:** Are new code paths covered by tests?
- [ ] **Performance:** Any concerns with <specific_area_if_applicable>?
- [ ] **Security:** <specific_security_considerations_if_applicable>
- [ ] **Documentation:** Are public APIs or config changes documented?
- [ ] **Rollback:** Can this change be safely rolled back?

#### Key Areas to Focus On
1. <specific_file_or_function_that_deserves_close_attention>
   - Reason: <why this area needs focus>
2. <specific_file_or_function>
   - Reason: <why>

#### Open Questions
- <question_from_PR_comments_or_chat_that_is_unresolved>
- <question_based_on_design_doc_review>

#### External References
- <relevant_best_practice_article_or_documentation>

---

### Summary Across All PRs

| PR | Author | Size | Age | Priority | Focus Areas |
|----|--------|------|-----|----------|-------------|
| <title> | <author> | <size> | <days_open> | <priority> | <key_areas> |

### Recommended Review Order
1. <PR_to_review_first> -- <reason: blocking, oldest, smallest, etc.>
2. <PR_to_review_second> -- <reason>
3. <remaining_PRs>
```

Recommend reviewing smaller, blocking PRs first to unblock teammates,
followed by larger PRs that benefit from deeper focus.
