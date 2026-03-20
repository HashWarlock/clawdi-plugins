---
name: customer-support-ticket-triage
description: Triage and prioritize open support tickets by severity, customer tier, and topic
metadata:
  openclaw:
    tags: [customer-support, triage, tickets]
---

# Ticket Triage Workflow

When the user asks to triage, prioritize, or review open support tickets:

## Step 1: Retrieve open tickets from the inbox

Use `capability_execute` with the following parameters:
- capabilityId: "mail.read_inbox"
- packId: "customer-support"
- args:
  - filter: "is:unread label:support OR label:tickets"
  - maxResults: 50
  - fields: ["subject", "from", "date", "body", "labels"]

Collect all ticket threads returned. If the result status is "needs_setup", inform the
user that email access is required and suggest running `/connect_apps`.

## Step 2: Search for existing documentation on common issues

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "customer-support"
- args:
  - query: "support triage priority matrix SLA definitions"
  - maxResults: 5

If priority definitions or SLA documents are found, use them to inform the
classification in Step 4. If none are found, use default priority heuristics.

## Step 3: Look up customer account details for each ticket sender

For each unique sender from Step 1, use `capability_execute` with:
- capabilityId: "crm.lookup_account"
- packId: "customer-support"
- args:
  - email: "<sender_email>"
  - fields: ["company", "plan", "tier", "accountHealth", "openTickets", "renewalDate"]

Batch these lookups. If CRM is not connected, note the limitation and proceed
with email-only context.

## Step 4: Classify and prioritize each ticket

For each ticket, determine:

1. **Severity** based on content analysis:
   - P0 (Critical): Service outage, data loss, security incident
   - P1 (High): Major feature broken, blocking workflow, revenue impact
   - P2 (Medium): Feature not working as expected, workaround available
   - P3 (Low): Question, feature request, minor UI issue

2. **Customer tier** from CRM data:
   - Enterprise: prioritize higher
   - Pro/Business: standard priority
   - Free/Trial: lower priority unless severity is P0

3. **Topic category**:
   - Billing / Account
   - Technical / Bug
   - Feature Request
   - How-to / Documentation
   - Security / Compliance
   - Integration / API

4. **Estimated effort**:
   - Quick (< 15 min): known answer, template response available
   - Medium (15-60 min): investigation needed, may require engineering input
   - Complex (> 60 min): multi-step resolution, cross-team coordination

## Step 5: Check for related internal discussions

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "customer-support"
- args:
  - query: "<top 3 ticket topics as search terms>"
  - channels: ["support-internal", "engineering-escalations", "product-bugs"]
  - maxResults: 10

Note any ongoing conversations or known issues that relate to open tickets.

## Step 6: Present the triage summary

Format the output as follows:

```
## Ticket Triage Summary

**Date:** <current date>
**Total open tickets:** <count>
**Source:** <email/ticketing system>

### Priority Queue

#### P0 - Critical (<count>)
| # | Subject | Customer | Tier | Category | Est. Effort | Notes |
|---|---------|----------|------|----------|-------------|-------|
| 1 | <subject> | <company> | <tier> | <category> | <effort> | <notes> |

#### P1 - High (<count>)
| # | Subject | Customer | Tier | Category | Est. Effort | Notes |
|---|---------|----------|------|----------|-------------|-------|
| 1 | <subject> | <company> | <tier> | <category> | <effort> | <notes> |

#### P2 - Medium (<count>)
| # | Subject | Customer | Tier | Category | Est. Effort | Notes |
|---|---------|----------|------|----------|-------------|-------|

#### P3 - Low (<count>)
| # | Subject | Customer | Tier | Category | Est. Effort | Notes |
|---|---------|----------|------|----------|-------------|-------|

### Patterns & Insights
- <any recurring issues spotted across multiple tickets>
- <any known issues from internal chat that match open tickets>
- <any SLA deadlines approaching>

### Recommended Actions
1. <most urgent action with specific ticket reference>
2. <second priority action>
3. <batch actions for similar tickets>
```

Always sort tickets within each priority level by customer tier (Enterprise first),
then by age (oldest first). Flag any tickets approaching SLA breach deadlines.
