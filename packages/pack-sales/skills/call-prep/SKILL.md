---
name: sales-call-prep
description: Prepare for any sales call with account context, attendee research, and suggested agenda. Triggers on "prep me for my call with [company]", "get me ready for [meeting]", "prep for tomorrow's meeting"
metadata:
  openclaw:
    tags: [sales, meetings, preparation]
---

## Call Prep

When the user asks to prepare for a call or meeting:

### Step 1: Gather context

**With connectors:**

1. Use `capability_execute` with capabilityId "calendar.read_events" to find the meeting:
   - Search today and tomorrow for external meetings
   - Extract: meeting title, time, attendees (names + emails), meeting link, description

2. Use `capability_execute` with capabilityId "crm.lookup_account" for each attendee's company:
   - Account details and stage
   - Contact records for attendees
   - Open opportunities
   - Last 10 activities and notes
   - Deal value and close date

3. Use `capability_execute` with capabilityId "mail.read_inbox" to check:
   - Recent email threads with attendees (last 30 days)
   - Sent messages awaiting reply

4. Use `capability_execute` with capabilityId "chat.search_messages" for:
   - Internal mentions of the company (last 30 days)
   - Any teammate context about the account

**Without connectors (standalone):**

Ask the user for:
- Company name
- Meeting type (discovery, demo, negotiation, check-in)
- Attendee names and roles
- Any additional context

### Step 2: Research supplement (always)

Use `capability_execute` with capabilityId "research.web_search" for:
- Company news in the last 90 days
- Recent funding or leadership changes
- Industry trends affecting them
- Attendee LinkedIn profiles and recent activity

### Step 3: Determine meeting type

Classify the meeting and adjust the output:

- **Discovery**: Focus on research gaps, discovery questions, qualification criteria
- **Demo/Presentation**: Focus on pain points to address, features to highlight, competitive positioning
- **Negotiation/Proposal**: Focus on deal history, pricing context, objection handling, BATNA
- **Check-in/QBR**: Focus on account health, expansion opportunities, risk signals

### Step 4: Synthesize

Combine all sources. Identify what you know, what is missing, and what to ask about. Create a tailored agenda.

### Output Format

**Account Snapshot**

| Field | Value |
|---|---|
| Company | name |
| Industry | industry |
| Deal Stage | current stage |
| Deal Value | amount |
| Meeting Type | classified type |
| Time | date and time |

**Who You're Meeting**

For each attendee:
- **Name** — Title at Company
- Background: 2-3 relevant facts
- Role in deal: decision maker / influencer / champion / unknown
- Talking point: one personalized thing to reference

**Context & History**
- Summary of prior interactions, open items, and deal trajectory
- Any red flags or positive signals

**Suggested Agenda** (5 items)
1. Opening: personalized connection point
2-4. Core topics tailored to meeting type
5. Next steps and commitments

**Discovery Questions** (3-5)
- Questions that fill knowledge gaps or advance the deal

**Potential Objections**

| Objection | Recommended Response |
|---|---|
| likely objection | how to handle it |

**Internal Notes**
- Anything from CRM, email, or chat that only the seller needs to know
- Do not share this section externally
