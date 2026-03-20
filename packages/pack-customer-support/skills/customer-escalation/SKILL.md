---
name: customer-support-customer-escalation
description: Escalate a support ticket with full context, routing, and stakeholder notification
metadata:
  openclaw:
    tags: [customer-support, escalation, routing]
---

# Customer Escalation Workflow

When the user asks to escalate a ticket, route an issue to engineering, or
flag a customer situation for management attention:

## Step 1: Retrieve the ticket details and full conversation history

Use `capability_execute` with the following parameters:
- capabilityId: "mail.read_inbox"
- packId: "customer-support"
- args:
  - filter: "<ticket_id_or_subject_or_thread_identifier>"
  - maxResults: 20
  - fields: ["subject", "from", "to", "date", "body", "labels", "threadId"]

Collect the complete conversation thread including all back-and-forth
exchanges, internal notes, and any previous resolution attempts.

## Step 2: Look up the customer account context

Use `capability_execute` with the following parameters:
- capabilityId: "crm.lookup_account"
- packId: "customer-support"
- args:
  - email: "<customer_email>"
  - fields: ["company", "plan", "tier", "accountHealth", "mrr",
             "renewalDate", "csm", "openTickets", "lifetimeTickets",
             "npsScore", "tags", "escalationHistory"]

Understanding the customer's business value and history of escalations
is critical for proper routing.

## Step 3: Search for related known issues and prior escalations

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "customer-support"
- args:
  - query: "<core_issue_description> escalation postmortem incident"
  - maxResults: 10

Look for prior escalations on similar issues, postmortem documents,
or known issue trackers that may provide context.

## Step 4: Check internal channels for ongoing discussions

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "customer-support"
- args:
  - query: "<company_name> OR <core_issue_keywords>"
  - channels: ["engineering-escalations", "support-internal", "incidents",
               "customer-success"]
  - maxResults: 15
  - dateRange: "last_14_days"

Identify if this issue is already being tracked, if there is an active
incident, or if other customers are reporting the same problem.

## Step 5: Classify the escalation

Determine the escalation type and routing:

**Escalation types:**
- **Technical escalation:** Issue requires engineering investigation or fix
- **Management escalation:** Customer is at risk, VIP dissatisfied, or SLA breach
- **Cross-team escalation:** Issue spans multiple departments (billing + technical)
- **Incident escalation:** Issue affects multiple customers, potential outage

**Severity assessment:**
- **Sev1:** Revenue-impacting, data loss, security, or complete service outage
- **Sev2:** Major functionality broken, no workaround, high-tier customer
- **Sev3:** Significant issue with workaround available, or repeat failure
- **Sev4:** Needs engineering input but not time-critical

## Step 6: Create the escalation task

Use `capability_execute` with the following parameters:
- capabilityId: "project.create_task"
- packId: "customer-support"
- args:
  - title: "[ESC-<severity>] <company_name>: <concise_issue_summary>"
  - description: "<structured_escalation_brief_from_step_7_format>"
  - priority: "<mapped_from_severity>"
  - labels: ["escalation", "<escalation_type>", "<severity>"]
  - assignee: "<determined_by_routing_rules>"
  - project: "support-escalations"

Note: This is a side-effecting action. The router will request confirmation.

## Step 7: Notify stakeholders via chat

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "customer-support"
- args:
  - query: "escalation-routing-rules"
  - channels: ["support-internal"]
  - maxResults: 3

Use routing rules found (or defaults) to determine who should be notified.

After confirmation, inform the user about the notification that should be
posted. The user can then post in the appropriate channel or the system
can facilitate this through the chat capability if available.

## Step 8: Present the escalation summary

Format the output as follows:

```
## Escalation Summary

### Ticket Information
- **Ticket/Thread:** <ticket_id_or_subject>
- **Customer:** <company_name> (<contact_email>)
- **Tier:** <plan_tier>
- **Account Health:** <health_score>
- **MRR:** <revenue>
- **Renewal Date:** <date>

### Escalation Classification
- **Type:** <technical/management/cross-team/incident>
- **Severity:** <sev1-4>
- **Reason for escalation:** <clear explanation>

### Issue Summary
<2-3 sentence summary of the core issue>

### Timeline
| Date | Event |
|------|-------|
| <date> | Customer first reported the issue |
| <date> | <subsequent interaction or attempt> |
| <date> | Escalation created |

### What Has Been Tried
1. <previous resolution attempt and result>
2. <previous resolution attempt and result>

### Impact Assessment
- **Customer impact:** <what the customer cannot do>
- **Business impact:** <revenue risk, churn risk, reputation>
- **Scope:** <single customer or potentially wider>

### Related Context
- **Known issues:** <any matching known issues found>
- **Related incidents:** <any active incidents>
- **Other affected customers:** <if applicable>

### Recommended Next Steps
1. <immediate action for the assigned team>
2. <follow-up action with timeline>
3. <customer communication recommendation>

### Escalation Task
- **Created:** <task_link_or_id>
- **Assigned to:** <team_or_individual>
- **Expected response time:** <based_on_severity_SLA>
```

If the escalation is Sev1 or Sev2, emphasize urgency in the summary and
recommend immediate acknowledgment to the customer within 1 hour.
