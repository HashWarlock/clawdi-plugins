---
name: productivity-meeting-prep
description: Quick meeting prep for any meeting — context, agenda, and talking points. Triggers on "prep for my meeting", "what's my next meeting about", "meeting context for [topic]"
metadata:
  openclaw:
    tags: [productivity, meetings, preparation]
---

## Meeting Prep

When the user asks to prepare for a meeting:

### Step 1: Find the meeting

Use `capability_execute` with capabilityId "calendar.read_events":
- If specific meeting mentioned, find it
- If "next meeting", find the soonest upcoming external meeting
- Extract: title, time, attendees, description, links

### Step 2: Gather context

Use `capability_execute` with capabilityId "mail.read_inbox":
- Recent email threads with attendees (last 14 days)
- Any attachments or documents shared

Use `capability_execute` with capabilityId "chat.search_messages" (if available):
- Internal mentions of the meeting topic or attendees
- Any pre-meeting context from teammates

Use `capability_execute` with capabilityId "docs.search_files" (if available):
- Related documents (meeting notes, shared docs)
- Prior meeting notes with same attendees

Use `capability_execute` with capabilityId "research.web_search" (if external meeting):
- Attendee backgrounds
- Company context if meeting is with external parties

### Step 3: Synthesize

Identify:
- What this meeting is about
- What happened last time (if recurring)
- What you need to contribute or decide
- Open questions or unresolved items

### Output Format

**Meeting: [Title]**
**Time**: date and time
**Attendees**: list with roles

**Context**
- Why this meeting exists
- What happened last time (if recurring)
- Recent relevant communication

**Suggested Agenda**
1. Item with context
2. Item with context
3. Item with context

**Your Talking Points**
- What you should bring up
- Decisions you need from others

**Open Questions**
- Unresolved items to address

**Documents**
- Links to relevant docs or prior notes
