---
name: marketing-brand-review
description: Audit brand consistency across digital channels, messaging, and visual identity. Triggers on "review our brand", "brand audit", "check brand consistency", "how consistent is our branding"
metadata:
  openclaw:
    tags: [marketing, brand, audit]
---

## Brand Review

When the user asks to review or audit their brand presence:

### Step 1: Identify scope

Determine what to review:
- **Full audit**: all digital channels and touchpoints
- **Channel-specific**: single channel (website, social, email, ads)
- **Competitive**: brand positioning relative to competitors
- **Messaging**: tone, voice, and value proposition consistency

Ask the user for:
- Brand name and primary website URL
- Any brand guidelines document or key brand attributes
- Specific channels or competitors to include
- Known pain points (if any)

### Step 2: Gather brand presence data

Use `capability_execute` with capabilityId "research.web_search" to collect:
1. Company website homepage, about page, and key landing pages
2. Social media profiles (LinkedIn, Twitter/X, Instagram, Facebook, YouTube)
3. Recent blog posts and content marketing (last 90 days)
4. Press mentions and media coverage (last 90 days)
5. Job postings (messaging reflects employer brand)
6. App store listings or product pages (if applicable)
7. Customer review sites (G2, Capterra, Trustpilot)

### Step 3: Competitive context

Use `capability_execute` with capabilityId "enrichment.lookup_company" to pull:
- Industry classification and market positioning
- Company size and growth signals
- Known competitors

Use `capability_execute` with capabilityId "research.web_search" to compare:
- Top 2-3 competitor brand presentations
- Differentiation clarity relative to competitors
- Visual and messaging distinctiveness

### Step 4: Internal signal check (if available)

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Internal discussions about brand (last 60 days)
- Customer feedback mentioning brand perception
- Marketing team notes on brand updates or refreshes

### Step 5: Evaluate brand dimensions

Score each dimension on a 1-5 scale:

1. **Visual consistency**: logo usage, color palette, typography, imagery style
2. **Voice and tone**: writing style consistency across channels
3. **Value proposition clarity**: is the core message clear and consistent?
4. **Differentiation**: does the brand stand apart from competitors?
5. **Audience alignment**: does the brand speak to the target audience?
6. **Channel coherence**: do all channels tell the same story?
7. **Recency**: is content fresh and current?

### Step 6: Synthesize findings

Identify the strongest and weakest brand dimensions. Prioritize recommendations by impact and effort.

### Output Format

**Brand Review: [Brand Name]**

**Overall Brand Health Score**: X/5

**Executive Summary**
2-3 sentence assessment of current brand state and the single most important action to take.

**Channel Inventory**

| Channel | URL | Active | On-Brand | Notes |
|---|---|---|---|---|
| Website | url | Yes/No | Strong/Moderate/Weak | key observation |
| LinkedIn | url | Yes/No | Strong/Moderate/Weak | key observation |
| Twitter/X | url | Yes/No | Strong/Moderate/Weak | key observation |

**Brand Dimension Scores**

| Dimension | Score | Assessment |
|---|---|---|
| Visual Consistency | X/5 | one-line finding |
| Voice & Tone | X/5 | one-line finding |
| Value Proposition | X/5 | one-line finding |
| Differentiation | X/5 | one-line finding |
| Audience Alignment | X/5 | one-line finding |
| Channel Coherence | X/5 | one-line finding |
| Recency | X/5 | one-line finding |

**Strengths**
- 3-5 things the brand does well with specific examples

**Gaps & Inconsistencies**
- Specific inconsistencies found across channels
- Messaging misalignment examples
- Visual identity drift examples

**Competitive Positioning**
- How the brand compares to 2-3 key competitors
- Differentiation opportunities identified

**Prioritized Recommendations**

| Priority | Recommendation | Impact | Effort |
|---|---|---|---|
| 1 | specific action | High/Medium/Low | High/Medium/Low |
| 2 | specific action | High/Medium/Low | High/Medium/Low |
| 3 | specific action | High/Medium/Low | High/Medium/Low |

**Sources**
- List all sources reviewed with links
