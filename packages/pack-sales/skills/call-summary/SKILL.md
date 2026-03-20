---
name: sales-call-summary
description: Process call notes or transcript — extract action items, draft follow-up email, generate internal summary
argument-hint: "<call notes or transcript>"
user-invocable: true
metadata:
  openclaw:
    tags: [sales, meetings, follow-up]
---

## Call Summary

When the user provides call notes, a transcript, or describes a call they just had:

### Step 1: Process the input

Accept any of:
- Pasted call notes
- Full transcript
- Verbal description of what happened

### Step 2: Extract key information

Parse for:
- **Key discussion points**: main topics covered
- **Decisions made**: anything agreed upon
- **Customer priorities**: what matters most to them
- **Objections or concerns**: anything raised as a blocker
- **Competitive mentions**: other vendors discussed
- **Action items**: with owner and due date for each
- **Next steps**: what happens after this call
- **Deal impact**: how this call changes the deal trajectory

### Step 3: Connected actions (if available)

Use `capability_execute` with capabilityId "crm.create_note" to:
- Log the call summary to the CRM
- Update opportunity stage if deal progressed
- Create tasks for action items

Use `capability_execute` with capabilityId "calendar.read_events" to:
- Find the meeting that just ended for context

### Step 4: Draft follow-up email

Create a customer-facing follow-up email.

**Email style rules (strict):**
- Plain text only — no markdown bold, italic, or headers
- Short paragraphs (2-3 sentences max)
- Simple dashes (-) for lists, not bullets
- No generic openers ("Hope this email finds you well")
- Professional but conversational tone
- Include: thank you, key takeaways, action items, next steps
- Keep under 200 words

### Output Format

**Part 1: Internal Summary**

# Call Summary: [Company] — [Date]

**Attendees**: list
**Call Type**: discovery / demo / negotiation / check-in
**Duration**: if known

**Key Discussion Points**
- Bullet list of main topics

**Customer Priorities**
1. Ranked by emphasis during the call

**Objections & Concerns**
- What was raised and how it was handled

**Competitive Intel**
- Any mentions of other vendors

**Action Items**

| Owner | Action | Due |
|---|---|---|
| name | what they committed to | date |

**Next Steps**
- Concrete next actions with dates

**Deal Impact**
- How this call changes the opportunity (advancing, stalling, at risk)

---

**Part 2: Follow-Up Email**

Subject: [contextual subject line]

[Plain text email body following the style rules above]
