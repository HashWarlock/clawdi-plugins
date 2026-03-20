---
name: marketing-campaign-plan
description: Build a comprehensive marketing campaign plan with strategy, channels, timeline, budget allocation, and KPIs. Triggers on "plan a campaign", "campaign for [product]", "launch plan for [initiative]", "marketing plan for [goal]"
metadata:
  openclaw:
    tags: [marketing, campaigns, planning, strategy]
---

## Campaign Plan

When the user asks to plan a marketing campaign or launch:

### Step 1: Define the campaign brief

Gather from the user or infer from context:
- **Objective**: awareness, lead generation, product launch, event promotion, retention
- **Target audience**: persona, segment, or market
- **Product/service**: what is being promoted
- **Timeline**: start date, end date, key milestones
- **Budget range**: if known
- **Constraints**: brand guidelines, channels to avoid, compliance requirements
- **Success metrics**: what defines success

### Step 2: Market and competitive research

Use `capability_execute` with capabilityId "research.web_search" to research:
1. Current market trends relevant to the campaign topic
2. Competitor campaigns in the same space (last 6 months)
3. Industry benchmarks for the campaign type (CTR, conversion rates, CPL)
4. Seasonal or timing factors that affect performance
5. Audience behavior trends on target channels

Use `capability_execute` with capabilityId "enrichment.lookup_company" to understand:
- Target company firmographics (for B2B campaigns)
- Market size and segmentation data

### Step 3: Keyword and SEO context

Use `capability_execute` with capabilityId "seo.keyword_research" to identify:
- Primary keywords aligned with the campaign theme
- Search volume and competition data
- Content gaps to exploit
- Long-tail opportunities for organic reach

### Step 4: Historical performance (if available)

Use `capability_execute` with capabilityId "analytics.get_metrics" to pull:
- Performance of similar past campaigns
- Channel-level conversion rates
- Audience engagement patterns
- Cost-per-acquisition benchmarks from historical data

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Internal learnings from past campaigns
- Stakeholder feedback on prior launches

### Step 5: Build the campaign plan

Design a complete plan covering:
- Strategy and positioning
- Channel mix with rationale
- Content requirements per channel
- Timeline with phases (pre-launch, launch, sustain, wrap-up)
- Budget allocation by channel
- KPIs and measurement plan
- Risk mitigation

### Output Format

**Campaign Plan: [Campaign Name]**

**Campaign Brief**

| Field | Value |
|---|---|
| Objective | primary goal |
| Target Audience | persona/segment |
| Product/Service | what is promoted |
| Timeline | start - end |
| Budget | total budget |

**Strategic Approach**
2-3 paragraph description of the campaign strategy, key message, and positioning.

**Channel Mix**

| Channel | Role | Budget % | Primary KPI | Rationale |
|---|---|---|---|---|
| Paid Search | Demand capture | X% | CPA | reason for inclusion |
| Social Organic | Awareness | X% | Engagement rate | reason |
| Email | Nurture | X% | CTR | reason |
| Content/SEO | Long-term | X% | Organic traffic | reason |

**Content Requirements**

| Asset | Channel | Owner | Due Date | Notes |
|---|---|---|---|---|
| Landing page | Web | team | date | specifications |
| Ad creative (3 variants) | Paid | team | date | specifications |
| Email sequence (4 emails) | Email | team | date | specifications |
| Blog post | SEO | team | date | specifications |

**Campaign Timeline**

Phase 1: Pre-Launch (dates)
- Bullet list of activities and milestones

Phase 2: Launch (dates)
- Bullet list of activities and milestones

Phase 3: Sustain (dates)
- Bullet list of activities and milestones

Phase 4: Wrap-Up (dates)
- Bullet list of activities and milestones

**KPIs & Measurement**

| KPI | Target | Measurement Method | Reporting Cadence |
|---|---|---|---|
| Leads generated | number | CRM + analytics | Weekly |
| Cost per lead | $X | ad platform + CRM | Weekly |
| Conversion rate | X% | analytics | Weekly |
| Revenue influenced | $X | CRM attribution | Monthly |

**Budget Breakdown**

| Category | Amount | % of Total |
|---|---|---|
| Paid media | $X | X% |
| Content production | $X | X% |
| Tools & tech | $X | X% |
| Contingency | $X | X% |
| **Total** | **$X** | **100%** |

**Risks & Mitigation**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| risk description | High/Med/Low | High/Med/Low | mitigation plan |

**Next Steps**
1. Numbered list of immediate actions with owners and dates

**Sources**
- List research sources with links
