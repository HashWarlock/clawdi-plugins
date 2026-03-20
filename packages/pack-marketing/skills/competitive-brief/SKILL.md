---
name: marketing-competitive-brief
description: Create a competitive intelligence brief analyzing competitors' marketing strategies, positioning, and vulnerabilities. Triggers on "competitive analysis", "competitor brief", "what is [competitor] doing", "competitive landscape"
metadata:
  openclaw:
    tags: [marketing, competitive, intelligence, strategy]
---

## Competitive Brief

When the user asks to analyze competitors or the competitive landscape:

### Step 1: Identify competitors

Determine scope from the user:
- **Named competitors**: specific companies to analyze
- **Market scan**: identify top competitors in a category
- **Head-to-head**: deep comparison between two companies

If no competitors are named, ask the user for:
- Their company name and primary product/service
- Market category or industry
- Known competitors (if any)

### Step 2: Research each competitor

Use `capability_execute` with capabilityId "research.web_search" for each competitor:
1. Company overview and positioning statement
2. Product/service offerings and pricing (if public)
3. Recent marketing campaigns and messaging (last 6 months)
4. Content marketing strategy (blog, resources, webinars)
5. Social media presence and engagement levels
6. SEO footprint and top-ranking content
7. Recent press releases, news, and announcements
8. Customer reviews and sentiment (G2, Capterra, Trustpilot)
9. Hiring activity (marketing team growth signals)
10. Partnerships and integrations announced

### Step 3: Enrichment data

Use `capability_execute` with capabilityId "enrichment.lookup_company" for each competitor:
- Employee count and growth trajectory
- Funding and financial status
- Technology stack
- Market segment and ICP

### Step 4: SEO and content comparison

Use `capability_execute` with capabilityId "seo.keyword_research" to compare:
- Keyword overlap and gaps between your brand and competitors
- Content topics where competitors rank and you do not
- Domain authority comparison (if available)

### Step 5: Internal context (if available)

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Internal win/loss analysis mentions
- Sales team competitive intelligence
- Customer feedback comparing you to competitors

### Step 6: Analyze and synthesize

For each competitor, evaluate:
- Positioning and messaging strategy
- Channel mix and investment signals
- Content quality and differentiation
- Strengths to respect and weaknesses to exploit
- Likely next moves based on hiring and announcements

### Output Format

**Competitive Brief: [Your Company] vs. Market**

**Executive Summary**
3-4 sentence overview of the competitive landscape and your relative positioning.

**Competitor Profiles**

For each competitor:

### [Competitor Name]

| Field | Value |
|---|---|
| Website | url |
| Founded | year |
| Size | employees |
| Funding | total raised |
| Positioning | one-line positioning statement |

**Marketing Strategy Assessment**
- Messaging and value proposition
- Primary channels and apparent budget allocation
- Content strategy and cadence
- Notable campaigns (last 6 months)

**Strengths**: 3-5 bullets
**Weaknesses**: 3-5 bullets

---

**Comparative Matrix**

| Dimension | Your Company | Competitor A | Competitor B | Competitor C |
|---|---|---|---|---|
| Positioning | description | description | description | description |
| Primary Channel | channel | channel | channel | channel |
| Content Cadence | frequency | frequency | frequency | frequency |
| SEO Strength | assessment | assessment | assessment | assessment |
| Social Engagement | level | level | level | level |
| Pricing Model | model | model | model | model |

**Keyword Battleground**

| Keyword/Topic | Your Rank | Competitor A | Competitor B | Opportunity |
|---|---|---|---|---|
| keyword | rank | rank | rank | assessment |

**Opportunities**
- Gaps in competitor coverage you can exploit
- Messaging angles competitors are missing
- Channels where competitors are underinvesting
- Audience segments competitors are ignoring

**Threats**
- Areas where competitors are outperforming you
- Emerging competitor moves to watch
- Market shifts that favor competitors

**Recommended Actions**

| Priority | Action | Target Competitor | Expected Impact |
|---|---|---|---|
| 1 | specific action | who it targets | what it achieves |
| 2 | specific action | who it targets | what it achieves |
| 3 | specific action | who it targets | what it achieves |

**Sources**
- List all sources with links
