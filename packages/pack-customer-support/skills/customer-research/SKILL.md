---
name: customer-support-customer-research
description: Research a customer's full context including account history, recent interactions, and sentiment
metadata:
  openclaw:
    tags: [customer-support, research, crm]
---

# Customer Research Workflow

When the user asks to research a customer, look up account context, or understand
a customer's history before responding to a ticket:

## Step 1: Look up the customer account in the CRM

Use `capability_execute` with the following parameters:
- capabilityId: "crm.lookup_account"
- packId: "customer-support"
- args:
  - email: "<customer_email_or_identifier>"
  - fields: ["company", "plan", "tier", "accountHealth", "mrr", "contractStart",
             "renewalDate", "csm", "openTickets", "lifetimeTickets",
             "npsScore", "tags", "customFields"]

If the result status is "needs_setup", inform the user that CRM access is
required and suggest running `/connect_apps`.

## Step 2: Retrieve recent support interactions

Use `capability_execute` with the following parameters:
- capabilityId: "mail.read_inbox"
- packId: "customer-support"
- args:
  - filter: "from:<customer_email> OR to:<customer_email> label:support"
  - maxResults: 20
  - fields: ["subject", "from", "to", "date", "body", "labels"]
  - sortBy: "date"
  - sortOrder: "desc"

Collect the last 20 interactions to understand the recent history and
communication pattern.

## Step 3: Search for the customer in internal documentation

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "customer-support"
- args:
  - query: "<company_name> OR <customer_email> account notes"
  - maxResults: 10

Look for account notes, onboarding documents, custom configuration details,
or any special arrangements documented for this customer.

## Step 4: Search internal chat for recent mentions

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "customer-support"
- args:
  - query: "<company_name> OR <customer_name>"
  - channels: ["support-internal", "customer-success", "sales", "product-feedback"]
  - maxResults: 15
  - dateRange: "last_30_days"

Identify any recent internal conversations about this customer -- escalations,
feature requests, bug reports, or renewal discussions.

## Step 5: Search for public context about the company

Use `capability_execute` with the following parameters:
- capabilityId: "research.web_search"
- packId: "customer-support"
- args:
  - query: "<company_name> recent news announcements"
  - maxResults: 5

Gather any recent public information that might provide context -- funding
rounds, leadership changes, product launches, layoffs, or acquisitions that
could affect the support relationship.

## Step 6: Synthesize the customer profile

Compile all gathered information into a structured profile:

```
## Customer Research Profile

### Account Overview
- **Company:** <company_name>
- **Contact:** <contact_name> (<contact_email>)
- **Plan/Tier:** <plan> (<tier>)
- **Account Health:** <health_score_or_status>
- **MRR:** <monthly_recurring_revenue>
- **Customer Since:** <contract_start_date>
- **Renewal Date:** <renewal_date>
- **CSM:** <customer_success_manager>
- **NPS Score:** <score_if_available>

### Support History
- **Lifetime tickets:** <count>
- **Open tickets:** <count>
- **Avg resolution time:** <calculated_from_history>
- **Recent ticket topics:**
  1. <topic> - <date> - <status>
  2. <topic> - <date> - <status>
  3. <topic> - <date> - <status>

### Sentiment Analysis
- **Overall tone in recent interactions:** <positive/neutral/frustrated/escalating>
- **Recurring pain points:** <list of repeated issues>
- **Satisfaction trend:** <improving/stable/declining>

### Internal Context
- **Recent internal discussions:**
  - <summary of relevant chat messages or notes>
- **Known issues affecting this customer:**
  - <any bugs, feature gaps, or pending changes relevant to them>
- **Special arrangements:**
  - <any custom configurations, SLAs, or agreements>

### External Context
- **Recent company news:**
  - <relevant news items that may affect the relationship>

### Recommendations
1. **Engagement approach:** <how to approach based on sentiment and history>
2. **Proactive actions:** <things to address before the customer asks>
3. **Risk factors:** <anything that might affect retention or satisfaction>
4. **Upsell/expansion signals:** <if applicable based on usage patterns>
```

If any data source was unavailable, note it explicitly under the relevant section
rather than omitting the section entirely. This helps the support agent understand
what context is complete versus what gaps exist.
