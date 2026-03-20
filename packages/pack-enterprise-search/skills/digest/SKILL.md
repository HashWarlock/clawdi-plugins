---
name: digest
description: Generate a curated information digest from recent activity across all connected sources
metadata:
  openclaw:
    tags: [enterprise-search, digest, briefing, daily]
---

# Information Digest

Generate a curated digest of recent information, activity, and updates from
across all connected sources. This skill produces a concise, prioritized
summary designed to help the user stay informed without reading everything.

## When to Use

Activate this skill when the user wants to:

- Get caught up on what happened while they were away
- Receive a morning briefing of relevant activity
- Review recent activity across documents, email, and chat
- Understand what changed in their information landscape since a specific date
- Get a weekly or periodic summary of activity in their organization

## Workflow

### Step 1: Determine the digest window

Establish the time range for the digest:

- If the user specifies a time range, use it (e.g., "since Monday", "last 48 hours")
- If the user says "catch me up", default to the last 24 hours
- If the user says "weekly digest", use the last 7 days
- Ask if the user has specific topics or projects to focus on, otherwise cover all topics

Also determine digest style:

- **Quick:** bullet points, 1-2 minutes to read
- **Standard:** categorized with brief context, 3-5 minutes to read
- **Comprehensive:** detailed summaries, 10+ minutes to read

Default to Standard if not specified.

### Step 2: Gather recent email activity

Use `capability_execute` with the following parameters:

- **capabilityId:** `mail.read_inbox`
- **packId:** `enterprise-search`
- **args:**
  - `query`: "*" (all mail, or topic filter if the user specified one)
  - `maxResults`: 30
  - `dateRange`: the digest window
  - `sortBy`: "date"
  - `folder`: "inbox"

From the results, identify:

- Emails requiring action or reply
- Important announcements or decisions
- FYI threads the user should be aware of
- Threads with high activity (many replies)

### Step 3: Gather recent document activity

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `enterprise-search`
- **args:**
  - `query`: topic filter if specified, otherwise recent modifications
  - `maxResults`: 20
  - `modifiedAfter`: start of the digest window
  - `sortBy`: "modified"

From the results, identify:

- Documents created in the digest window
- Documents significantly edited
- Documents shared with or assigned to the user
- Documents related to the user's active projects

### Step 4: Gather recent web developments (if relevant)

Use `capability_execute` with the following parameters:

- **capabilityId:** `research.web_search`
- **packId:** `enterprise-search`
- **args:**
  - `query`: topics the user tracks or their industry/company name
  - `maxResults`: 10
  - `recency`: the digest window

Skip this step if the user only wants internal updates. Include it by default
for standard and comprehensive digests.

### Step 5: Gather recent chat activity (if available)

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `enterprise-search`
- **args:**
  - `query`: topic filter if specified, otherwise recent activity
  - `maxResults`: 20
  - `dateRange`: the digest window
  - `channels`: channels the user follows or is a member of

From the results, identify:

- Threads where the user was mentioned or tagged
- Decisions made in channel discussions
- Questions asked that the user might want to answer
- Announcements posted to team channels

This capability is optional. If it returns `needs_setup`, proceed without chat
data and note this in the digest footer.

### Step 6: Prioritize and categorize

Sort all gathered items into priority tiers:

**Priority 1 -- Action required:**
Items that need the user's response or decision. Emails awaiting reply,
documents needing review, direct mentions in chat.

**Priority 2 -- Important updates:**
Significant developments the user should know about. Key decisions,
project milestones, important announcements.

**Priority 3 -- Informational:**
Context that helps the user stay informed. Industry news, team activity,
document updates, FYI threads.

Within each tier, group by topic or project where possible.

### Step 7: Compose the digest

## Output Format

```
## Information Digest

**Period:** {start date/time} to {end date/time}
**Sources:** {list of sources consulted}
**Style:** {quick / standard / comprehensive}

---

### Action Required ({count} items)

- **{item title}** ({source type})
  {1-2 sentence description of what needs attention and why}
  {link or reference}

- **{item title}** ({source type})
  {1-2 sentence description}
  {link or reference}

### Important Updates ({count} items)

- **{item title}** ({source type})
  {2-3 sentence summary of the update and its significance}
  {link or reference}

- **{item title}** ({source type})
  {2-3 sentence summary}
  {link or reference}

### Informational ({count} items)

**{Topic/Project group}**
- {item} - {brief description} ({source})
- {item} - {brief description} ({source})

**{Topic/Project group}**
- {item} - {brief description} ({source})
- {item} - {brief description} ({source})

### Activity Summary

| Source | Items Found | Action Needed |
|--------|------------|---------------|
| Email | {count} | {count} |
| Documents | {count} | {count} |
| Chat | {count} | {count} |
| Web | {count} | {count} |

---

*Generated {current timestamp}. {Note any sources that were unavailable.}*
```

For quick digests, include only Action Required and Important Updates with
single-line descriptions. For comprehensive digests, expand each item with
full context paragraphs and include cross-references between related items.

If nothing significant was found in the digest window, say so clearly rather
than padding with low-value items. Suggest the user try a wider time range
or specify topics they care about.
