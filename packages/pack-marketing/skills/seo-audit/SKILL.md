---
name: marketing-seo-audit
description: Run a comprehensive SEO audit on a URL covering technical, on-page, content, and off-page factors with prioritized fix recommendations. Triggers on "SEO audit", "audit [URL]", "check SEO for [site]", "why isn't [page] ranking", "SEO health check"
metadata:
  openclaw:
    tags: [marketing, seo, audit, technical]
---

## SEO Audit

When the user asks for an SEO audit of a page or site:

### Step 1: Identify audit scope

Determine from the user:
- **URL to audit**: specific page or entire domain
- **Target keywords**: what they want to rank for (if known)
- **Current ranking**: where they rank now (if known)
- **Competitors**: who they are competing against in search
- **Priority**: technical SEO, content optimization, or full audit

### Step 2: Technical SEO analysis

Use `capability_execute` with capabilityId "seo.audit_page" to check:

**Crawlability & Indexation:**
- Robots.txt configuration
- XML sitemap presence and validity
- Canonical tag implementation
- Meta robots directives
- HTTP status codes (redirect chains, 404s)
- Hreflang tags (for multilingual sites)

**Performance:**
- Page load speed (Core Web Vitals if available)
- Mobile responsiveness
- Image optimization (format, compression, alt text)
- Render-blocking resources
- Caching headers

**Site Architecture:**
- URL structure and hierarchy
- Internal linking depth
- Breadcrumb implementation
- Navigation structure
- Orphaned pages

**Security:**
- HTTPS implementation
- Mixed content issues
- Security headers

### Step 3: On-page content analysis

Use `capability_execute` with capabilityId "seo.audit_page" to evaluate:

**Title and meta tags:**
- Title tag (presence, length, keyword inclusion)
- Meta description (presence, length, compellingness)
- Heading hierarchy (H1-H6 structure)
- Open Graph and Twitter Card tags

**Content quality:**
- Word count and depth vs top-ranking competitors
- Keyword usage and density (primary and secondary)
- Content freshness (last updated date)
- Readability score
- Duplicate content signals
- Thin content pages

**Schema markup:**
- Structured data presence and validity
- Schema types relevant to the content
- Rich snippet eligibility

### Step 4: Keyword and competitive analysis

Use `capability_execute` with capabilityId "seo.keyword_research" to assess:
- Target keyword search volume and difficulty
- Current ranking positions
- Keyword cannibalization (multiple pages targeting same keyword)
- Related keyword opportunities
- Featured snippet potential
- SERP feature eligibility (People Also Ask, images, videos)

Use `capability_execute` with capabilityId "research.web_search" to compare:
- Top 5 ranking pages for the target keyword
- Content depth and format differences
- Backlink profile comparison (visible signals)
- Domain authority indicators

### Step 5: Off-page signals

Use `capability_execute` with capabilityId "research.web_search" to evaluate:
- Backlink quality indicators (mentions from authoritative sites)
- Brand mentions and unlinked brand citations
- Social signals and share counts
- Local SEO signals (if applicable)

### Step 6: Analytics correlation (if available)

Use `capability_execute` with capabilityId "analytics.get_metrics" to correlate:
- Organic traffic trends for the audited pages
- Bounce rate and time on page from organic traffic
- Conversion rate from organic visitors
- Pages per session from organic entry points

### Step 7: Prioritize findings

Score each issue by:
- **Impact**: how much fixing it could improve rankings (High/Medium/Low)
- **Effort**: how difficult or time-consuming the fix is (High/Medium/Low)
- **Priority**: Impact / Effort ratio

### Output Format

**SEO Audit: [URL]**

**Audit Summary**

| Category | Score | Status |
|---|---|---|
| Technical SEO | X/100 | Good/Fair/Poor |
| On-Page SEO | X/100 | Good/Fair/Poor |
| Content Quality | X/100 | Good/Fair/Poor |
| Off-Page Signals | X/100 | Good/Fair/Poor |
| **Overall** | **X/100** | **assessment** |

**Critical Issues** (fix immediately)

| Issue | Category | Impact | Fix |
|---|---|---|---|
| issue description | Technical/On-Page/Content | High | specific fix action |

**Warnings** (fix soon)

| Issue | Category | Impact | Fix |
|---|---|---|---|
| issue description | Technical/On-Page/Content | Medium | specific fix action |

**Opportunities** (optimize when possible)

| Opportunity | Category | Impact | Action |
|---|---|---|---|
| opportunity description | category | expected gain | what to do |

**Technical SEO Details**

| Check | Status | Details |
|---|---|---|
| HTTPS | Pass/Fail | detail |
| Mobile Friendly | Pass/Fail | detail |
| Page Speed | Pass/Fail | LCP, FID, CLS values |
| Robots.txt | Pass/Fail | detail |
| Sitemap | Pass/Fail | detail |
| Canonical Tags | Pass/Fail | detail |
| Schema Markup | Pass/Fail | detail |

**On-Page Analysis**

| Element | Current | Recommendation |
|---|---|---|
| Title Tag | current title (X chars) | suggested improvement |
| Meta Description | current meta (X chars) | suggested improvement |
| H1 | current H1 | assessment |
| URL Structure | current URL | assessment |
| Keyword Density | X% | recommendation |
| Word Count | X words | vs top 5 avg of Y words |

**Content Gap Analysis**

| Topic/Section | Covered | Top Competitors Cover It | Action |
|---|---|---|---|
| topic | Yes/No | X of 5 | add section about this |

**Keyword Performance**

| Keyword | Position | Volume | Difficulty | Opportunity |
|---|---|---|---|---|
| keyword | current rank | monthly vol | score | quick win / long term |

**Prioritized Action Plan**

| Priority | Action | Category | Impact | Effort | Est. Timeline |
|---|---|---|---|---|---|
| 1 | specific action | category | High | Low | timeline |
| 2 | specific action | category | High | Medium | timeline |
| 3 | specific action | category | Medium | Low | timeline |

**Quick Wins** (high impact, low effort)
1. Specific action with expected result
2. Specific action with expected result
3. Specific action with expected result

**Sources & Tools Used**
- List all data sources and tools referenced
