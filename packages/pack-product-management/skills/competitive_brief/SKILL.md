---
name: competitive_brief
description: Research competitors and generate a structured competitive intelligence brief
metadata:
  openclaw:
    tags: [product-management, competitive-intelligence, research, strategy]
---

# Competitive Brief

Research one or more competitors and generate a structured competitive
intelligence brief. This skill combines web research with internal knowledge
to produce a comprehensive view of the competitive landscape.

## When to Use

Activate this skill when the user wants to:

- Research a specific competitor's recent moves, features, or positioning
- Prepare a competitive landscape overview for a strategy meeting
- Understand how the user's product compares to alternatives
- Monitor competitor activity and identify threats or opportunities
- Brief stakeholders on competitive dynamics before a planning session

## Workflow

### Step 1: Define the competitive scope

Clarify the brief's focus:

- **Competitors:** Which specific companies or products to research?
- **Focus areas:** Product features, pricing, positioning, go-to-market, funding, team?
- **Comparison frame:** Against the user's product specifically, or a general landscape?
- **Audience:** Product team, leadership, sales team?
- **Depth:** Quick snapshot or deep analysis?

If the user names one competitor, produce a focused single-competitor brief.
If they ask for a landscape view, cover 3-5 competitors in comparison format.

### Step 2: Research competitors on the web

For each competitor, use `capability_execute` with the following parameters:

- **capabilityId:** `research.web_search`
- **packId:** `product-management`
- **args:**
  - `query`: "{competitor name} product features pricing news {current year}"
  - `maxResults`: 15

Then perform a second search focused on recent developments:

- **capabilityId:** `research.web_search`
- **packId:** `product-management`
- **args:**
  - `query`: "{competitor name} announcement launch update"
  - `maxResults`: 10
  - `recency`: "last 90 days"

From the results, extract:

- Product positioning and value proposition
- Key features and recent feature releases
- Pricing model and tiers (if publicly available)
- Funding or financial news
- Customer sentiment and reviews
- Strategic moves (partnerships, acquisitions, market expansion)

### Step 3: Search internal knowledge

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `product-management`
- **args:**
  - `query`: competitor names and "competitive" or "comparison"
  - `maxResults`: 15

Look for:

- Previous competitive analyses or briefs
- Win/loss reports that mention the competitor
- Sales battle cards
- Feature comparison documents
- Customer feedback mentioning the competitor

### Step 4: Search internal discussions

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `product-management`
- **args:**
  - `query`: competitor names
  - `maxResults`: 15
  - `dateRange`: last 90 days

Look for:

- Sales team mentions of competitive deals
- Product team discussions about competitive features
- Customer-facing team reports on competitor encounters
- Strategic discussions about competitive positioning

This capability is optional. Proceed without chat data if unavailable.

### Step 5: Check email for competitive mentions

Use `capability_execute` with the following parameters:

- **capabilityId:** `mail.read_inbox`
- **packId:** `product-management`
- **args:**
  - `query`: competitor names
  - `maxResults`: 10
  - `dateRange`: last 90 days

Look for:

- Customer emails mentioning competitor comparisons
- Internal emails discussing competitive strategy
- Industry newsletters or alerts about competitors

This capability is optional. Proceed without email data if unavailable.

### Step 6: Compile the competitive brief

## Output Format

For a single-competitor brief:

```
## Competitive Brief: {Competitor Name}

**Date:** {current date}
**Analyst:** {user or "Product Team"}
**Confidence:** {high / medium / low based on data availability}

---

### Company Overview

| Attribute | Details |
|-----------|---------|
| Company | {name} |
| Founded | {year} |
| Headquarters | {location} |
| Funding / Revenue | {known info} |
| Employees | {estimate} |
| Target Market | {description} |

### Product Overview

{2-3 paragraphs describing the competitor's product, positioning,
and value proposition.}

**Core Features:**
- {feature 1}: {brief description}
- {feature 2}: {brief description}
- {feature 3}: {brief description}

**Recent Releases (last 90 days):**
- {date}: {release or announcement}
- {date}: {release or announcement}

### Pricing

| Tier | Price | Key Features |
|------|-------|-------------|
| {tier} | {price} | {features} |
| {tier} | {price} | {features} |

### Feature Comparison

| Capability | Our Product | {Competitor} | Notes |
|-----------|-------------|-------------|-------|
| {capability} | {status} | {status} | {notes} |
| {capability} | {status} | {status} | {notes} |
| {capability} | {status} | {status} | {notes} |

### Strengths

1. {strength 1}: {explanation}
2. {strength 2}: {explanation}
3. {strength 3}: {explanation}

### Weaknesses

1. {weakness 1}: {explanation}
2. {weakness 2}: {explanation}
3. {weakness 3}: {explanation}

### Market Positioning

{2-3 paragraphs on how the competitor positions themselves, who they
target, and how their messaging compares to ours.}

### Internal Intelligence

{Summary of what the organization already knows about this competitor
from internal docs, sales interactions, and team discussions.}

### Threats

- {threat 1}: {description and potential impact}
- {threat 2}: {description}

### Opportunities

- {opportunity 1}: {description and how to capitalize}
- {opportunity 2}: {description}

### Recommended Actions

1. {action}: {rationale}
2. {action}: {rationale}
3. {action}: {rationale}

---

*Sources: {count} web sources, {count} internal docs, {count} internal discussions.*
*Data gaps: {note what could not be determined}.*
```

For a landscape comparison covering multiple competitors, use a matrix format
with competitors as columns, and include a separate section for each
competitor's strengths and weaknesses. Add a "Positioning Map" section that
describes where each competitor sits relative to key dimensions (e.g.,
enterprise vs. SMB, feature-rich vs. simple).
