---
name: marketing-content-creation
description: Plan and outline content pieces aligned with marketing strategy — blog posts, whitepapers, case studies, social posts, and landing pages. Triggers on "create content for", "content plan", "write a blog post about", "content calendar", "plan content around [topic]"
metadata:
  openclaw:
    tags: [marketing, content, creation, strategy]
---

## Content Creation

When the user asks to create or plan marketing content:

### Step 1: Define the content need

Determine from the user:
- **Content type**: blog post, whitepaper, case study, social post, landing page, newsletter, video script
- **Topic or theme**: what the content is about
- **Target audience**: who will read it
- **Goal**: SEO traffic, thought leadership, lead generation, nurture, social engagement
- **Stage**: awareness, consideration, decision
- **Tone and style**: formal, conversational, technical, inspirational

If the user wants a content calendar, ask for:
- Time period (weekly, monthly, quarterly)
- Content pillars or themes
- Publication cadence goal

### Step 2: Topic and keyword research

Use `capability_execute` with capabilityId "seo.keyword_research" to find:
- Primary and secondary keywords for the topic
- Search volume and keyword difficulty
- Related questions people are searching for
- Long-tail keyword variations
- Content format preferences (listicle, how-to, comparison)

Use `capability_execute` with capabilityId "research.web_search" to analyze:
- Top-ranking content for the target keywords
- Content gaps in existing coverage
- Competitor content on the same topic
- Recent developments that make this topic timely
- Expert opinions and data sources to reference

### Step 3: Audience and market context

Use `capability_execute` with capabilityId "analytics.get_metrics" to check:
- Past content performance on similar topics
- Audience engagement patterns (what content types perform best)
- Traffic sources that drive the most engaged visitors
- Conversion rates by content type

Use `capability_execute` with capabilityId "enrichment.lookup_company" (for B2B content):
- Target audience company profiles and pain points
- Industry-specific language and terminology
- Common objections and questions in the market

### Step 4: Build the content

For each content piece, create:
- Working title optimized for SEO and engagement
- Meta description (155 characters)
- Outline with H2/H3 structure
- Key points to cover in each section
- Data points and sources to reference
- Internal and external linking opportunities
- Call-to-action recommendation
- Distribution plan

### Step 5: Create supporting brief

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Content brief document with all specifications
- Ready for handoff to writer or for direct drafting

### Output Format

**Content Brief: [Working Title]**

**Overview**

| Field | Value |
|---|---|
| Content Type | blog post / whitepaper / etc |
| Target Keyword | primary keyword |
| Search Volume | monthly volume |
| Keyword Difficulty | score |
| Word Count Target | range |
| Target Audience | persona |
| Funnel Stage | awareness / consideration / decision |
| Goal | SEO / leads / engagement |

**SEO Specifications**
- Title tag: [optimized title under 60 chars]
- Meta description: [155 char description]
- URL slug: /suggested-slug
- Primary keyword: [keyword] (use X times)
- Secondary keywords: [list] (use each 1-2 times)

**Content Outline**

## [H2: Section Title]
- Key points to cover
- Data or examples to include
- Target keyword placement

## [H2: Section Title]
- Key points to cover
- Data or examples to include

(Continue for all sections)

**Key Messages**
1. Primary message the reader should take away
2. Supporting message
3. Supporting message

**Sources & Data Points**
- Specific statistics, studies, or quotes to reference with links

**Internal Links**
- Link to [existing page] in section about [topic]
- Link to [existing page] in CTA

**Competing Content Analysis**

| Rank | Title | URL | Word Count | Strengths | Gaps |
|---|---|---|---|---|---|
| 1 | title | url | count | what it does well | what it misses |
| 2 | title | url | count | what it does well | what it misses |

**Distribution Plan**
- Primary channel: where to publish
- Social: platform-specific teaser copy
- Email: newsletter inclusion recommendation
- Paid: promotion worthiness assessment

**Call to Action**
- Recommended CTA and placement within the content
