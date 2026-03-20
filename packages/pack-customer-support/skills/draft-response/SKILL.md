---
name: customer-support-draft-response
description: Draft a professional support response to a customer ticket with relevant context and solutions
metadata:
  openclaw:
    tags: [customer-support, response, drafting]
---

# Draft Response Workflow

When the user asks to draft a response to a support ticket, compose a reply,
or help write a customer-facing message:

## Step 1: Retrieve the ticket or conversation thread

Use `capability_execute` with the following parameters:
- capabilityId: "mail.read_inbox"
- packId: "customer-support"
- args:
  - filter: "<ticket_id_or_subject_or_thread_identifier>"
  - maxResults: 10
  - fields: ["subject", "from", "to", "date", "body", "labels", "threadId"]

Collect the full conversation thread to understand the customer's question,
any previous responses, and the current state of the conversation.

## Step 2: Look up the customer's account for context

Use `capability_execute` with the following parameters:
- capabilityId: "crm.lookup_account"
- packId: "customer-support"
- args:
  - email: "<customer_email_from_thread>"
  - fields: ["company", "plan", "tier", "accountHealth", "openTickets",
             "npsScore", "tags"]

Use the tier and health information to calibrate the tone and urgency of
the response.

## Step 3: Search the knowledge base for relevant articles

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "customer-support"
- args:
  - query: "<key_terms_extracted_from_ticket_subject_and_body>"
  - maxResults: 8
  - tags: ["kb", "help-center", "documentation", "troubleshooting"]

Identify existing documentation, troubleshooting guides, or help center
articles that address the customer's issue.

## Step 4: Search for similar resolved tickets

Use `capability_execute` with the following parameters:
- capabilityId: "mail.read_inbox"
- packId: "customer-support"
- args:
  - filter: "<key_terms_from_ticket> label:resolved OR label:closed"
  - maxResults: 5
  - fields: ["subject", "body", "labels", "date"]

Look for previously resolved tickets with similar issues to reuse proven
solutions and maintain consistency.

## Step 5: Check for known issues or workarounds in internal chat

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "customer-support"
- args:
  - query: "<core_technical_terms_from_ticket>"
  - channels: ["support-internal", "engineering-escalations", "product-bugs"]
  - maxResults: 10

Identify any known issues, active incidents, planned fixes, or recommended
workarounds that engineering or other support agents have discussed.

## Step 6: Draft the response

Compose a response following these guidelines:

**Tone calibration based on customer context:**
- Enterprise / declining health: extra empathy, senior tone, reference specific impact
- Standard tier / neutral: professional, helpful, efficient
- Free/trial: friendly, educational, guide toward self-service resources

**Response structure:**

```
## Draft Response

**To:** <customer_email>
**Subject:** Re: <original_subject>
**Ticket:** <ticket_id_if_available>
**Customer tier:** <tier> | **Account health:** <health>

---

<greeting_personalized_to_customer>

<acknowledge_the_specific_issue_they_reported>

<provide_the_solution_or_answer>

<if_applicable_include_step_by_step_instructions>
1. <step>
2. <step>
3. <step>

<if_applicable_link_to_relevant_documentation>
- [<article_title>](<article_url_or_path>)

<if_known_issue_acknowledge_and_share_timeline>

<closing_with_clear_next_steps>

<sign_off>

---

### Response Notes (internal, not sent to customer)
- **Sources used:** <list KB articles, resolved tickets, or chat threads referenced>
- **Confidence level:** <high/medium/low based on source quality>
- **Suggested follow-up:** <any proactive steps after sending>
- **Escalation needed:** <yes/no -- if the issue requires engineering input>
- **Template candidate:** <yes/no -- if this response pattern should become a template>
```

## Step 7: Offer to send the response

Ask the user if they would like to:
1. **Send as-is** -- proceed to send via email
2. **Edit first** -- let the user modify the draft before sending
3. **Save as draft** -- save without sending
4. **Discard** -- start over or abandon

If the user chooses to send, use `capability_execute` with:
- capabilityId: "mail.send_followup"
- packId: "customer-support"
- args:
  - to: "<customer_email>"
  - subject: "Re: <original_subject>"
  - body: "<final_response_body>"
  - threadId: "<original_thread_id>"
  - replyTo: "<original_message_id>"

Note: This is a side-effecting action. The router will request confirmation
before actually sending. Wait for user approval through the confirmation flow.
