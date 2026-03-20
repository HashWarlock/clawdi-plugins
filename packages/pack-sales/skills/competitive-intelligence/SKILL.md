---
name: sales-competitive-intelligence
description: Research competitors and build a battlecard. Triggers on "competitive intel", "how do we compare to [competitor]", "battlecard for [competitor]"
metadata:
  openclaw:
    tags: [sales, competitive, research]
---

## Competitive Intelligence

When the user asks about competitors or requests a battlecard:

### Step 1: Gather seller context

Ask (if not already known):
- What is your company and product?
- Who are the competitors to analyze? (1-5 competitors)

### Step 2: Research your company

Use `capability_execute` with capabilityId "research.web_search":
1. Your product features and recent releases
2. Your pricing and packaging
3. Your recent news and announcements
4. Your positioning and messaging
5. Your company vs. each competitor

### Step 3: Research each competitor

For each competitor, use `capability_execute` with capabilityId "research.web_search":
1. Product features and capabilities
2. Pricing and packaging
3. Recent news and releases
4. Product reviews and analyst coverage
5. Customer case studies
6. Market positioning
7. Notable customers
8. Hiring signals (growth areas)

### Step 4: Pull connected sources (if available)

Use `capability_execute` with capabilityId "crm.lookup_account" for:
- Win/loss data against each competitor
- Deal notes mentioning competitors
- Win rates by competitor

Use `capability_execute` with capabilityId "chat.search_messages" for:
- Field intel from teammates about competitors
- Recent competitive mentions in internal channels

### Step 5: Build the battlecard

Synthesize all research into a structured competitive analysis.

### Output Format

**Comparison Matrix**

| Dimension | Your Company | Competitor 1 | Competitor 2 |
|---|---|---|---|
| Core Product | description | description | description |
| Key Differentiator | what | what | what |
| Pricing | range | range | range |
| Target Market | who | who | who |
| Recent Momentum | signal | signal | signal |
| Win Rate | % if known | — | — |

**For each competitor:**

### [Competitor Name]

**Profile**: 1-2 sentence summary of what they do

**What They Sell**: key product capabilities

**Recent Releases**: last 2-3 product updates

**Where They Win**
- Scenarios or buyer profiles where they have an advantage

**Where You Win**
- Scenarios or buyer profiles where you have an advantage

**Pricing Intel**
- Known pricing, packaging, and discount patterns

**Talk Tracks**
- Early mention: what to say if they come up early in a deal
- Displacement: how to position against an existing deployment
- Late addition: how to handle them entering a deal late

**Objection Handling**

| Their Claim | Your Response |
|---|---|
| claim | evidence-based counter |

**Landmine Questions**
- Questions to plant that expose their weaknesses

**Your Company Card**

- Recent releases and differentiators
- Proof points (customer wins, metrics, awards)
- Key messaging themes
