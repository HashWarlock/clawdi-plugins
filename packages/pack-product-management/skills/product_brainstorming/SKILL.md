---
name: product_brainstorming
description: Facilitate a structured product brainstorming session with research-backed ideation
metadata:
  openclaw:
    tags: [product-management, brainstorming, ideation, strategy]
---

# Product Brainstorming

Facilitate a structured brainstorming session for product ideas, features, or
solutions. This skill gathers relevant context first, then guides the user
through an organized ideation process that produces actionable, prioritized
ideas rather than an unstructured list.

## When to Use

Activate this skill when the user wants to:

- Brainstorm new feature ideas for a product area
- Explore solutions to a specific user problem
- Generate ideas for a product strategy or direction
- Think through product opportunities in a structured way
- Prepare for a team brainstorming session with pre-research

## Workflow

### Step 1: Frame the brainstorming session

Establish the creative constraints:

- **Topic:** What area, problem, or opportunity are we brainstorming about?
- **Constraints:** Any technical, business, or timeline constraints to keep in mind?
- **Lens:** Are we brainstorming for a specific persona, market, or use case?
- **Output goal:** Ideas for a roadmap? Solutions to a problem? Product directions?

Good brainstorming needs a clear frame. If the user says "let's brainstorm",
ask what area they want to explore before proceeding.

### Step 2: Gather user feedback and research context

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `product-management`
- **args:**
  - `query`: the brainstorming topic plus "feedback" or "research" or "user" or "request"
  - `maxResults`: 15

Look for:

- User research documents
- Feature request lists or voting boards
- Customer feedback summaries
- Previous brainstorming outputs on related topics
- UX research findings

### Step 3: Research external inspiration

Use `capability_execute` with the following parameters:

- **capabilityId:** `research.web_search`
- **packId:** `product-management`
- **args:**
  - `query`: the brainstorming topic framed for discovering approaches and patterns
  - `maxResults`: 15

Look for:

- How other products approach similar problems
- Emerging trends or technologies relevant to the topic
- User community discussions about unmet needs
- Academic or industry research on the problem space

This capability is optional. If unavailable, proceed with internal context only.

### Step 4: Review existing backlog for related ideas

Use `capability_execute` with the following parameters:

- **capabilityId:** `project.list_tasks`
- **packId:** `product-management`
- **args:**
  - `query`: the brainstorming topic
  - `status`: "all"
  - `maxResults`: 20
  - `labels`: "feature-request" or "idea" if the project tool supports labels

Identify:

- Ideas that were proposed but never built
- Feature requests that relate to the brainstorming topic
- Partial implementations that could be extended

### Step 5: Check recent team discussions

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `product-management`
- **args:**
  - `query`: the brainstorming topic
  - `maxResults`: 10
  - `dateRange`: last 30 days

Look for:

- Ideas mentioned informally in team channels
- Customer-facing team insights about user needs
- Reactions to competitor features

This capability is optional. Proceed without it if unavailable.

### Step 6: Generate and structure ideas

Using all gathered context, generate ideas across three categories:

**Incremental improvements:** Small, low-risk enhancements to existing features
that address known pain points. These are typically quick wins.

**Substantial features:** Medium-sized features that address significant user
needs or open new capabilities. These require design and engineering investment.

**Bold bets:** Ambitious ideas that could meaningfully change the product's
trajectory. These carry more risk but higher potential reward.

For each idea, assess:

- User impact (how many users benefit, how much value)
- Effort estimate (rough t-shirt size: S, M, L, XL)
- Confidence (how sure are we this will work)
- Evidence basis (what data or research supports this idea)

### Step 7: Prioritize using an impact/effort framework

Score each idea on a 2x2 matrix:

- **High impact, low effort:** Do these first
- **High impact, high effort:** Plan these carefully
- **Low impact, low effort:** Quick wins if capacity allows
- **Low impact, high effort:** Deprioritize or cut

## Output Format

```
## Brainstorming Session: {topic}

**Date:** {current date}
**Frame:** {the brainstorming constraint or question}
**Context gathered from:** {count} documents, {count} backlog items, {count} web sources

---

### Context Summary

{2-3 paragraphs summarizing the most relevant context gathered:
what users have asked for, what competitors do, what the team has
discussed, and what research suggests.}

### Ideas

#### Incremental Improvements

| # | Idea | User Impact | Effort | Confidence | Evidence |
|---|------|-----------|--------|------------|----------|
| 1 | {idea title} | {high/med/low} | {S/M/L/XL} | {high/med/low} | {source} |
| 2 | {idea title} | {impact} | {effort} | {confidence} | {source} |
| 3 | {idea title} | {impact} | {effort} | {confidence} | {source} |

**1. {Idea title}**
{2-3 sentences describing the idea, why it matters, and how it works.}

**2. {Idea title}**
{2-3 sentences.}

**3. {Idea title}**
{2-3 sentences.}

#### Substantial Features

| # | Idea | User Impact | Effort | Confidence | Evidence |
|---|------|-----------|--------|------------|----------|
| 4 | {idea title} | {impact} | {effort} | {confidence} | {source} |
| 5 | {idea title} | {impact} | {effort} | {confidence} | {source} |
| 6 | {idea title} | {impact} | {effort} | {confidence} | {source} |

**4. {Idea title}**
{3-4 sentences with more detail.}

**5. {Idea title}**
{3-4 sentences.}

**6. {Idea title}**
{3-4 sentences.}

#### Bold Bets

| # | Idea | User Impact | Effort | Confidence | Evidence |
|---|------|-----------|--------|------------|----------|
| 7 | {idea title} | {impact} | {effort} | {confidence} | {source} |
| 8 | {idea title} | {impact} | {effort} | {confidence} | {source} |

**7. {Idea title}**
{3-5 sentences exploring the idea and its potential.}

**8. {Idea title}**
{3-5 sentences.}

### Prioritization Matrix

**Do First (high impact, low effort):**
- Idea #{number}: {title}
- Idea #{number}: {title}

**Plan Carefully (high impact, high effort):**
- Idea #{number}: {title}
- Idea #{number}: {title}

**Quick Wins (low impact, low effort):**
- Idea #{number}: {title}

**Deprioritize (low impact, high effort):**
- Idea #{number}: {title}

### Recommended Next Steps

1. {next step: e.g., "write a spec for Idea #4"}
2. {next step: e.g., "prototype Idea #1 as a quick win"}
3. {next step: e.g., "validate Idea #7 with user research"}

### Ideas That Need More Research

- {idea}: {what question needs to be answered before proceeding}
- {idea}: {what data is needed}

---

*This session generated {count} ideas from {count} sources of context.*
```

Encourage the user to react to ideas, combine them, or spin off into
deeper exploration of specific ideas. The brainstorming skill is
collaborative, not just a one-shot generator.
