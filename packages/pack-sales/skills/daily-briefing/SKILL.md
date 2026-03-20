---
name: sales-daily-briefing
description: Generate a prioritized daily sales briefing. Triggers on "morning briefing", "daily brief", "what's on my plate today", "start my day", "wrap up my day"
metadata:
  openclaw:
    tags: [sales, daily, planning]
---

## Daily Briefing

When the user asks for their daily briefing or wants to start/wrap up their day:

### Detect mode

- **Standard**: "briefing", "start my day", "what's on my plate"
- **Quick**: "tldr my day" — condensed to top 3 priorities only
- **End of Day**: "wrap up my day" — focus on what was done and what carries over

### Step 1: Gather context

**With connectors:**

Use `capability_execute` with capabilityId "calendar.read_events":
- Today's events, filter to external meetings
- For each meeting: time, attendees, company, type

Use `capability_execute` with capabilityId "crm.lookup_account":
- Open pipeline summary (total value, deal count)
- Deals closing this week
- Deals with no activity in 7+ days
- Deals that slipped past close date

Use `capability_execute` with capabilityId "mail.read_inbox":
- Unread emails from opportunity contacts
- Sent emails with no reply after 3+ days

**Without connectors (standalone):**

Ask the user about:
- Today's meetings
- Active deals and their status
- Anything urgent

### Step 2: Prioritize

Rank items by urgency:
1. URGENT: Deal closing today that is not yet won
2. HIGH: Meeting today with a high-value opportunity
3. HIGH: Unread email from a decision-maker
4. MEDIUM: Deal closing this week
5. MEDIUM: Deal stale for 7+ days
6. LOW: Tasks due this week

### Output Format

**#1 Priority**: The single most important thing to do right now and why.

**Today's Numbers**

| Metric | Value |
|---|---|
| Pipeline | total value |
| Closing this month | value |
| Meetings today | count |
| Action items | count |

**Today's Meetings**

For each meeting:
- **Time** — Company — Meeting Type
- Attendees: names
- Context: 1-2 lines of relevant background
- Quick prep: one thing to review before the call

**Pipeline Alerts**
- Deals needing attention (stale, slipped, at risk)
- Deals closing this week with status

**Email Priorities**
- Messages needing a response (from whom, about what)
- Sent messages awaiting reply (days waiting)

**Suggested Actions**
Top 3 things to do today, ranked by impact.

For **Quick mode**: show only #1 Priority and Suggested Actions.
For **End of Day mode**: show what was accomplished, what carries over, and what to prep for tomorrow.
