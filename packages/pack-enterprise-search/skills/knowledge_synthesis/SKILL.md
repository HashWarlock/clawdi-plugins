---
name: knowledge_synthesis
description: Gather information from multiple sources and synthesize it into a structured knowledge brief
metadata:
  openclaw:
    tags: [enterprise-search, synthesis, knowledge, brief]
---

# Knowledge Synthesis

Gather information from multiple connected sources on a specific topic and
synthesize it into a comprehensive, structured knowledge brief. Unlike a simple
search that returns a list of results, this skill reads, analyzes, and produces
an original synthesis document.

## When to Use

Activate this skill when the user wants to:

- Create a briefing document on a topic pulling from internal and external sources
- Understand the full picture on a subject their organization has discussed across tools
- Prepare background material for a meeting, presentation, or decision
- Consolidate scattered information into one authoritative summary
- Get a "state of knowledge" report on an internal project or external topic

## Workflow

### Step 1: Define the synthesis scope

Clarify what the user wants synthesized:

- **Topic:** What subject or question is the brief about?
- **Audience:** Who will read this brief? (This affects depth and tone.)
- **Scope:** Should it include only internal knowledge, only external, or both?
- **Time range:** Is there a relevant time window (e.g., "last quarter", "since the reorg")?
- **Desired length:** Quick summary (1 page) or comprehensive brief (3-5 pages)?

If the user did not specify these, make reasonable assumptions and state them.

### Step 2: Gather external context

Use `capability_execute` with the following parameters:

- **capabilityId:** `research.web_search`
- **packId:** `enterprise-search`
- **args:**
  - `query`: the topic, phrased for web search
  - `maxResults`: 15

Extract key facts, recent developments, and authoritative sources. Note the
publication date and source credibility for each finding.

Skip this step if the user asked for internal-only synthesis.

### Step 3: Gather internal documents

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `enterprise-search`
- **args:**
  - `query`: the topic
  - `maxResults`: 20
  - `sortBy`: "relevance"

Identify the most relevant internal documents. For each document, extract:

- Title and author
- Key points relevant to the synthesis topic
- Date created or last modified
- How it relates to other findings

### Step 4: Gather email context

Use `capability_execute` with the following parameters:

- **capabilityId:** `mail.read_inbox`
- **packId:** `enterprise-search`
- **args:**
  - `query`: the topic
  - `maxResults`: 15
  - `dateRange`: the time range if specified, otherwise last 90 days

Look for:

- Key decisions communicated via email
- Discussions that provide context not captured in documents
- Action items or commitments related to the topic

### Step 5: Gather chat context (if available)

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `enterprise-search`
- **args:**
  - `query`: the topic
  - `maxResults`: 15
  - `channels`: relevant channels if identifiable

Look for:

- Informal discussions that shaped decisions
- Quick updates or status changes
- Links to resources shared in conversation

This capability is optional. If it returns `needs_setup`, proceed without chat data
and note the gap in the final brief.

### Step 6: Analyze and cross-reference

Before writing the brief:

1. Identify areas of agreement across sources
2. Identify contradictions or tensions between sources
3. Identify gaps where information is missing or outdated
4. Establish a timeline of key events and decisions
5. Determine what is established fact vs. opinion vs. speculation

### Step 7: Create the brief document (if requested)

If the user wants the brief saved as a document, use `capability_execute`:

- **capabilityId:** `docs.create_brief`
- **packId:** `enterprise-search`
- **args:**
  - `title`: "Knowledge Brief: {topic}"
  - `content`: the formatted brief content
  - `folder`: user-specified location or default

This capability is optional. If it returns `needs_setup`, present the brief
inline and let the user know they can save it manually.

## Output Format

```
## Knowledge Brief: {topic}

**Prepared for:** {audience or "General"}
**Date:** {current date}
**Scope:** {internal / external / both}
**Sources consulted:** {count} documents, {count} emails, {count} chat threads, {count} web sources

---

### Executive Summary

{3-5 sentence overview of the most important findings. This should stand alone
as a useful summary for someone who reads nothing else.}

### Background

{2-3 paragraphs establishing context. What is the topic? Why does it matter?
What has happened recently?}

### Key Findings

**1. {Finding title}**
{2-3 paragraphs detailing this finding. Include specific data points, quotes,
or references where available.}
Sources: {list of sources that support this finding}

**2. {Finding title}**
{2-3 paragraphs}
Sources: {list of sources}

**3. {Finding title}**
{2-3 paragraphs}
Sources: {list of sources}

[... additional findings as warranted ...]

### Internal Perspective

{What does the organization's own documentation and communication say about
this topic? Summarize internal discussions, decisions, and stated positions.}

### External Perspective

{What do external sources say? Market context, competitor activity, industry
trends, analyst opinions.}

### Timeline

| Date | Event | Source |
|------|-------|--------|
| {date} | {event} | {source} |
| {date} | {event} | {source} |

### Open Questions

- {question that remains unanswered}
- {question that emerged during research}
- {area where sources conflict}

### Recommendations

1. {actionable recommendation based on findings}
2. {recommendation}
3. {recommendation}

---

**Sources:** {numbered list of all sources cited}
**Gaps:** {note any sources that were unavailable}
```

For quick summaries, condense to Executive Summary + Key Findings + Open Questions.
