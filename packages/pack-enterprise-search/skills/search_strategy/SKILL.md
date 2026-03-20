---
name: search_strategy
description: Plan a multi-step research strategy for complex questions requiring deep investigation
metadata:
  openclaw:
    tags: [enterprise-search, strategy, research, planning]
---

# Search Strategy

Plan and execute a structured, multi-step research strategy for complex questions
that cannot be answered by a single search. This skill breaks down a research
question into sub-queries, identifies the best sources for each, and builds a
progressive investigation plan.

## When to Use

Activate this skill when the user wants to:

- Investigate a complex topic that spans multiple domains
- Research a competitive landscape or market question
- Understand a decision's full context from multiple angles
- Prepare for a deep-dive analysis that requires structured data gathering
- Answer a question where the right sources are not obvious up front

## Workflow

### Step 1: Analyze the research question

Break the user's question into its component parts:

- Identify the core question and any implicit sub-questions
- Determine what types of information are needed (factual data, opinions, historical context, internal decisions)
- Identify which organizational sources are most likely to have relevant information
- Estimate the scope: narrow (1-2 sub-queries) vs. broad (5+ sub-queries)

### Step 2: Design the search plan

Create a structured plan with ordered phases:

**Phase A -- Context gathering:**
Define 2-3 broad searches to establish baseline understanding.

**Phase B -- Targeted investigation:**
Define 3-5 focused searches that drill into specific aspects identified in Phase A.

**Phase C -- Gap filling:**
Reserve 1-2 searches for questions that emerge from Phases A and B.

For each planned search, specify:
- The sub-query in natural language
- Which capability to use (`research.web_search`, `docs.search_files`, `mail.read_inbox`, `chat.search_messages`)
- Why this source is appropriate for this sub-query
- What a successful result looks like

### Step 3: Execute Phase A -- context gathering

For each Phase A search, use `capability_execute` with the following parameters:

- **capabilityId:** the capability identified in the plan (e.g., `research.web_search`)
- **packId:** `enterprise-search`
- **args:**
  - `query`: the sub-query text
  - `maxResults`: 10

Review Phase A results before proceeding. Refine Phase B searches based on
what was found. If Phase A reveals the question is simpler than expected,
skip directly to synthesis.

### Step 4: Execute Phase B -- targeted investigation

For each Phase B search, use `capability_execute` with the appropriate capabilityId:

- **capabilityId:** as specified in the plan
- **packId:** `enterprise-search`
- **args:**
  - `query`: the refined sub-query
  - `maxResults`: 10

After each search, assess whether the question is sufficiently answered.
Stop early if enough evidence has been gathered.

### Step 5: Execute Phase C -- gap filling

If there are still unanswered aspects after Phase B, execute gap-filling searches.

Use `capability_execute` with:

- **capabilityId:** the most appropriate capability for the gap
- **packId:** `enterprise-search`
- **args:**
  - `query`: the gap-filling query
  - `maxResults`: 5

### Step 6: Compile the strategy report

Assemble findings from all phases into a structured report.

## Output Format

```
## Research Strategy Report: "{original question}"

### Strategy Overview

**Core question:** {the user's question restated clearly}
**Research approach:** {1-2 sentences describing the strategy taken}
**Phases completed:** {A, B, C as applicable}
**Total searches executed:** {count}

### Phase A: Context Gathering

**Sub-query 1:** "{query text}"
- **Source:** {capability used}
- **Key findings:**
  - {finding 1}
  - {finding 2}
- **Implications for next phase:** {what this tells us to look for next}

**Sub-query 2:** "{query text}"
- **Source:** {capability used}
- **Key findings:**
  - {finding 1}
  - {finding 2}

### Phase B: Targeted Investigation

**Sub-query 3:** "{query text}"
- **Source:** {capability used}
- **Key findings:**
  - {finding 1}
  - {finding 2}

[... additional sub-queries ...]

### Phase C: Gap Filling

{If executed, same format. If skipped, note why.}

### Synthesis

**Answer to the core question:**
{3-5 paragraph synthesis of all findings, directly addressing the user's question}

**Confidence level:** {high / medium / low}
**Key evidence:**
- {most important supporting finding with source}
- {second most important finding with source}
- {third most important finding with source}

**Gaps and limitations:**
- {information that could not be found}
- {sources that were not available}

### Recommended Next Steps

1. {next step if the user wants to go deeper}
2. {alternative angle to explore}
3. {action to take based on findings}
```

If the user's question turns out to be simpler than expected, collapse the
output into a shorter format and note that a full strategy was not needed.
