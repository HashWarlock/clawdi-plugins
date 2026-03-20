---
name: marketing-performance-report
description: Generate a marketing performance report with channel metrics, trend analysis, and actionable recommendations. Triggers on "marketing report", "how are our campaigns doing", "channel performance", "marketing metrics for [period]", "weekly marketing report"
metadata:
  openclaw:
    tags: [marketing, analytics, reporting, performance]
---

## Performance Report

When the user asks for a marketing performance report:

### Step 1: Define report parameters

Determine from the user:
- **Time period**: this week, this month, this quarter, custom range
- **Comparison period**: previous period, same period last year, custom
- **Channels**: all channels, specific channels (paid, organic, email, social)
- **Campaigns**: all active campaigns, specific campaign
- **Focus area**: high-level overview, deep dive into one channel, campaign-specific

### Step 2: Pull performance metrics

Use `capability_execute` with capabilityId "analytics.get_metrics" to gather:

**Traffic metrics:**
- Total sessions and unique visitors
- Traffic by channel (organic, paid, social, email, direct, referral)
- New vs returning visitors
- Bounce rate and time on site by channel
- Top landing pages by traffic

**Conversion metrics:**
- Total conversions and conversion rate
- Conversions by channel
- Funnel progression (visitor -> lead -> MQL -> SQL)
- Cost per acquisition by channel
- Revenue attributed to marketing (if available)

**Content metrics:**
- Blog traffic and engagement
- Top-performing content pieces
- Content conversion rates

**Email metrics:**
- Emails sent, open rate, CTR, unsubscribe rate
- Campaign-level performance
- List growth rate

### Step 3: SEO performance check

Use `capability_execute` with capabilityId "seo.audit_page" to assess:
- Organic traffic trends
- Keyword ranking changes (up and down movers)
- New keywords entering the top 20
- Technical SEO issues affecting performance

Use `capability_execute` with capabilityId "seo.keyword_research" to check:
- Ranking position changes for target keywords
- New keyword opportunities based on trends

### Step 4: Market context

Use `capability_execute` with capabilityId "research.web_search" for:
- Industry news that may affect metrics (algorithm changes, market events)
- Competitor activity during the reporting period
- Seasonal factors or trends impacting performance

### Step 5: Internal context (if available)

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Known issues that affected performance (outages, bugs, delays)
- Campaign launches or changes during the period
- Team discussion about results or anomalies

### Step 6: Analyze and synthesize

Calculate:
- Period-over-period changes (absolute and percentage)
- Identify top 3 wins and top 3 concerns
- Root cause analysis for significant changes
- Trend lines (improving, declining, stable)
- Budget efficiency (cost per lead, ROAS, CAC)

### Output Format

**Marketing Performance Report: [Period]**

**Executive Summary**
3-4 sentence overview highlighting the most important takeaway, biggest win, and primary concern.

**Scorecard**

| KPI | This Period | Last Period | Change | Target | Status |
|---|---|---|---|---|---|
| Total Leads | number | number | +/-X% | target | On/Off Track |
| Marketing Qualified Leads | number | number | +/-X% | target | On/Off Track |
| Cost per Lead | $X | $X | +/-X% | $target | On/Off Track |
| Website Sessions | number | number | +/-X% | target | On/Off Track |
| Conversion Rate | X% | X% | +/-Xpp | target | On/Off Track |
| Email Open Rate | X% | X% | +/-Xpp | target | On/Off Track |
| ROAS | X:1 | X:1 | +/-X% | target | On/Off Track |

**Channel Performance**

### Paid Channels
| Channel | Spend | Leads | CPL | Conv Rate | ROAS | Trend |
|---|---|---|---|---|---|---|
| Google Ads | $X | X | $X | X% | X:1 | direction |
| LinkedIn Ads | $X | X | $X | X% | X:1 | direction |
| Facebook Ads | $X | X | $X | X% | X:1 | direction |

### Organic Channels
| Channel | Sessions | Leads | Conv Rate | Trend |
|---|---|---|---|---|
| Organic Search | X | X | X% | direction |
| Social Organic | X | X | X% | direction |
| Referral | X | X | X% | direction |

### Email
| Metric | Value | Benchmark | Assessment |
|---|---|---|---|
| Emails Sent | X | - | - |
| Open Rate | X% | industry avg | above/below |
| Click Rate | X% | industry avg | above/below |
| Unsubscribe Rate | X% | industry avg | above/below |

**Top Wins**
1. What happened, why it matters, and what to do next
2. What happened, why it matters, and what to do next
3. What happened, why it matters, and what to do next

**Concerns & Action Items**
1. What is declining, likely cause, and recommended fix
2. What is declining, likely cause, and recommended fix
3. What is declining, likely cause, and recommended fix

**SEO Snapshot**
- Organic traffic trend: direction and magnitude
- Keyword movements: top gainers and losers
- Technical issues: any crawl or indexing problems

**Campaign Highlights**

| Campaign | Status | Leads | CPL | Performance vs Goal |
|---|---|---|---|---|
| campaign name | active/complete | X | $X | above/on/below target |

**Budget Utilization**

| Category | Allocated | Spent | Remaining | Pacing |
|---|---|---|---|---|
| Paid Media | $X | $X | $X | on/over/under |
| Content | $X | $X | $X | on/over/under |
| Events | $X | $X | $X | on/over/under |
| **Total** | **$X** | **$X** | **$X** | assessment |

**Recommendations**
1. Specific action with expected impact and priority
2. Specific action with expected impact and priority
3. Specific action with expected impact and priority

**Next Period Priorities**
- 3-5 focus areas for the upcoming period with rationale
