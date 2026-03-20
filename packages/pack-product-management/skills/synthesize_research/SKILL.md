---
name: synthesize_research
description: Synthesize user research, customer feedback, and data into structured, actionable product insights
metadata:
  openclaw:
    tags: [product-management, research, synthesis, user-research, insights]
---

# Synthesize Research

Gather user research, customer feedback, survey data, and support interactions
from across connected sources and synthesize them into structured, actionable
product insights. This skill bridges the gap between scattered feedback and
product decisions.

## When to Use

Activate this skill when the user wants to:

- Synthesize findings from recent user interviews or usability studies
- Aggregate customer feedback from multiple channels into themes
- Prepare a research summary to inform a product decision
- Identify patterns in user requests, complaints, or praise
- Turn qualitative data into prioritized product insights

## Workflow

### Step 1: Define the research scope

Clarify the synthesis objectives:

- **Topic:** What product area, feature, or question is the research about?
- **Source types:** User interviews, survey results, support tickets, NPS feedback, app reviews?
- **Time window:** How far back should the synthesis look?
- **Audience:** Product team, design team, leadership?
- **Decision context:** Is this informing a specific decision? (e.g., "should we rebuild onboarding?")

### Step 2: Search for research documents

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `product-management`
- **args:**
  - `query`: the topic plus "research" or "interview" or "feedback" or "survey" or "usability"
  - `maxResults`: 20
  - `sortBy`: "relevance"

Look for:

- User interview transcripts or notes
- Survey results and reports
- Usability testing reports
- Research synthesis documents from prior rounds
- Product analytics reports that include user behavior data

### Step 3: Search email for customer feedback

Use `capability_execute` with the following parameters:

- **capabilityId:** `mail.read_inbox`
- **packId:** `product-management`
- **args:**
  - `query`: the topic plus "feedback" or "request" or "issue"
  - `maxResults`: 20
  - `dateRange`: the research time window

Look for:

- Direct customer emails with feedback or requests
- Forwarded customer feedback from sales or support teams
- Product feedback email threads
- NPS or survey notification emails

This capability is optional. Proceed without email data if unavailable.

### Step 4: Search chat channels for user signals

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `product-management`
- **args:**
  - `query`: the topic plus "user" or "customer" or "feedback" or "request"
  - `maxResults`: 20
  - `channels`: feedback channels, support channels, product channels
  - `dateRange`: the research time window

Look for:

- Customer feedback shared by customer-facing teams
- Feature requests relayed from sales
- Support patterns mentioned by the support team
- Team reactions to user behavior data

This capability is optional. Proceed without chat data if unavailable.

### Step 5: Search for related feature requests and bug reports

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `query`: the topic
  - `labels`: "feature-request" or "bug" or "user-feedback" if supported
  - `maxResults`: 25
  - `status`: "all"

Identify:

- Feature requests from users related to the topic
- Bug reports that indicate usability problems
- Enhancement requests from the team
- Patterns in request frequency or severity

### Step 6: Research external user signals (if relevant)

Use `capability_execute` with the following parameters:

- **capabilityId:** `research.web_search`
- **packId:** `product-management`
- **args:**
  - `query`: "{product name} reviews feedback {topic}"
  - `maxResults`: 10

Look for:

- App store or product review site feedback
- Community forum discussions
- Social media sentiment
- Industry analyst commentary

This capability is optional. Use only when external signals are relevant.

### Step 7: Analyze and theme the data

Apply a structured analysis:

1. **Open coding:** Tag each piece of feedback with descriptive labels
2. **Affinity grouping:** Cluster similar feedback into themes
3. **Frequency analysis:** Count how often each theme appears across sources
4. **Sentiment analysis:** Assess the emotional intensity of each theme
5. **Impact assessment:** Estimate how each theme affects user satisfaction, retention, or revenue

### Step 8: Save the synthesis (if requested)

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.create_brief`
- **packId:** `product-management`
- **args:**
  - `title`: "Research Synthesis: {topic}"
  - `content`: the formatted synthesis
  - `folder`: user-specified location or default

This capability is optional. Present inline if saving is not available.

## Output Format

```
## Research Synthesis: {topic}

**Date:** {current date}
**Scope:** {what was researched}
**Time window:** {date range of data analyzed}
**Sources analyzed:** {count} documents, {count} emails, {count} chat threads, {count} tickets, {count} web sources

---

### Executive Summary

{3-5 sentences summarizing the top findings. What are users telling us?
What should we do about it? This should stand alone as a useful brief.}

### Key Themes

#### Theme 1: {theme name} ({frequency} mentions across {count} sources)

**Sentiment:** {positive / negative / mixed}
**Impact:** {high / medium / low}

{2-3 paragraphs describing this theme. What are users saying? What is the
underlying need? How does this affect their experience?}

**Representative quotes / feedback:**
- "{quote or paraphrased feedback}" -- {source type}
- "{quote}" -- {source type}
- "{quote}" -- {source type}

**Related tasks/requests:** {list any matching tasks from Step 5}

#### Theme 2: {theme name} ({frequency} mentions)

**Sentiment:** {sentiment}
**Impact:** {impact}

{2-3 paragraphs.}

**Representative quotes:**
- "{quote}" -- {source}
- "{quote}" -- {source}

**Related tasks/requests:** {list}

#### Theme 3: {theme name} ({frequency} mentions)

{Same structure.}

[... additional themes as needed, typically 4-7 themes ...]

### Theme Frequency Matrix

| Theme | Docs | Email | Chat | Tickets | Web | Total |
|-------|------|-------|------|---------|-----|-------|
| {theme 1} | {count} | {count} | {count} | {count} | {count} | {total} |
| {theme 2} | {count} | {count} | {count} | {count} | {count} | {total} |
| {theme 3} | {count} | {count} | {count} | {count} | {count} | {total} |

### Insights and Recommendations

| # | Insight | Confidence | Recommended Action | Priority |
|---|---------|-----------|-------------------|----------|
| 1 | {insight derived from themes} | {high/med/low} | {what to do} | {P0/P1/P2} |
| 2 | {insight} | {confidence} | {action} | {priority} |
| 3 | {insight} | {confidence} | {action} | {priority} |

### Detailed Recommendations

**1. {Recommendation title}**
{2-3 paragraphs explaining the recommendation, the evidence supporting it,
and suggested approach.}

**2. {Recommendation title}**
{2-3 paragraphs.}

### Gaps in the Research

- {gap 1: what we still do not know}
- {gap 2: where more data is needed}
- {gap 3: user segments not represented}

### Suggested Follow-Up Research

1. {research activity}: {what question it would answer}
2. {research activity}: {question}
3. {research activity}: {question}

---

*Methodology: Themes identified through affinity grouping across {total sources}
data points. Confidence levels reflect data volume and consistency.*
```

If the data is sparse, reduce the number of themes and clearly note the
limited sample size. Qualify all insights with confidence levels so
stakeholders understand the strength of the evidence.
