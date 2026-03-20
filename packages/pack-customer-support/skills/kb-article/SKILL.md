---
name: customer-support-kb-article
description: Create a knowledge base article from resolved support tickets and internal expertise
metadata:
  openclaw:
    tags: [customer-support, knowledge-base, documentation]
---

# KB Article Creation Workflow

When the user asks to create a knowledge base article, document a solution,
or turn a resolved ticket into reusable documentation:

## Step 1: Gather the source ticket or issue context

Use `capability_execute` with the following parameters:
- capabilityId: "mail.read_inbox"
- packId: "customer-support"
- args:
  - filter: "<ticket_id_or_subject_or_thread_identifier>"
  - maxResults: 15
  - fields: ["subject", "from", "to", "date", "body", "labels", "threadId"]

Collect the complete resolution thread. Identify the original problem
description, any troubleshooting steps attempted, and the final solution.

## Step 2: Search for related resolved tickets on the same topic

Use `capability_execute` with the following parameters:
- capabilityId: "mail.read_inbox"
- packId: "customer-support"
- args:
  - filter: "<core_issue_keywords> label:resolved OR label:closed"
  - maxResults: 10
  - fields: ["subject", "body", "date"]

Find other tickets that were resolved with similar solutions. This helps
identify the most complete and accurate resolution steps, and reveals
edge cases or variations that should be covered.

## Step 3: Search existing knowledge base for related content

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "customer-support"
- args:
  - query: "<core_topic_keywords>"
  - maxResults: 10
  - tags: ["kb", "help-center", "documentation", "troubleshooting"]

Check for existing articles that overlap with the proposed topic. This
helps avoid duplicates and identifies articles that should be updated
rather than creating a net-new article.

## Step 4: Search internal documentation for technical details

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "customer-support"
- args:
  - query: "<technical_terms_from_resolution> architecture configuration"
  - maxResults: 5
  - tags: ["engineering", "technical-docs", "runbooks"]

Gather technical details that should inform the article but may not have
been fully explained in the support thread.

## Step 5: Search for engineering context on the root cause

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "customer-support"
- args:
  - query: "<technical_issue_keywords>"
  - channels: ["engineering", "support-internal", "product-bugs"]
  - maxResults: 10
  - dateRange: "last_90_days"

Find engineering discussions about the root cause, known limitations,
planned fixes, or recommended configurations that should be included
in the article.

## Step 6: Research any external references

Use `capability_execute` with the following parameters:
- capabilityId: "research.web_search"
- packId: "customer-support"
- args:
  - query: "<technology_or_integration_name> <error_or_issue> troubleshooting guide"
  - maxResults: 5

Find any relevant vendor documentation, community solutions, or
reference material that should be linked from the article.

## Step 7: Draft the knowledge base article

Compose the article following knowledge base best practices:

```
## KB Article Draft

### Metadata
- **Title:** <clear, searchable title using the customer's language>
- **Category:** <troubleshooting / how-to / reference / getting-started>
- **Tags:** <comma-separated relevant tags>
- **Applies to:** <product area, plan tiers, or feature>
- **Last verified:** <current date>

---

### <Article Title>

#### Overview
<1-2 sentences describing what this article covers and who it is for>

#### Symptoms
<what the user observes when they encounter this issue>

- <symptom 1>
- <symptom 2>
- <error message if applicable>

#### Cause
<brief explanation of why this happens, in customer-friendly language>

#### Solution

##### Option 1: <primary solution name>
<description of when to use this option>

1. <step with specific instructions>
2. <step with specific instructions>
3. <step with specific instructions>

##### Option 2: <alternative solution if applicable>
<description of when to use this alternative>

1. <step>
2. <step>

#### Verification
<how the user can confirm the issue is resolved>

1. <verification step>
2. <expected result>

#### Additional Notes
- <edge cases or caveats>
- <related configuration that may affect this>
- <upcoming changes that may affect this solution>

#### Related Articles
- [<related article title>](<link_or_path>)
- [<related article title>](<link_or_path>)

#### References
- [<external reference>](<url>)

---

### Internal Notes (not published)
- **Source tickets:** <list of ticket IDs that informed this article>
- **Engineering context:** <relevant technical details for support agents>
- **Known gaps:** <anything this article does not cover that it should>
- **Review needed:** <yes/no -- flag if engineering review is recommended>
```

## Step 8: Offer to publish the article

Ask the user to review the draft. Once approved, use `capability_execute` with:
- capabilityId: "docs.create_brief"
- packId: "customer-support"
- args:
  - title: "<article_title>"
  - content: "<article_body_without_internal_notes>"
  - folder: "knowledge-base/<category>"
  - tags: <article_tags>
  - metadata:
    - status: "draft"
    - category: "<category>"
    - lastVerified: "<current_date>"

Note: This is a side-effecting action. The router will request confirmation.

After publication, present a summary:

```
### Publication Summary
- **Article created:** <title>
- **Location:** <folder/path>
- **Status:** Draft (requires review before publishing to customers)
- **Existing articles to update:** <list any overlapping articles found in Step 3>
- **Suggested reviewers:** <based on engineering context found>
```

Remind the user that the article is in draft status and recommend having
it reviewed by a subject matter expert before publishing to customers.
