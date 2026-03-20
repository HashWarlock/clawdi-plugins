---
name: sales-account-research
description: Research a company or person for sales intelligence. Triggers on "research [company]", "look up [person]", "intel on [prospect]", "who is [name] at [company]"
metadata:
  openclaw:
    tags: [sales, research, prospecting]
---

## Account Research

When the user asks to research a company, person, or prospect:

### Step 1: Parse the request

Determine what type of research is needed:
- **Company research**: company name, domain, or URL provided
- **Person research**: individual name, title, or LinkedIn URL provided
- **Role search**: "who runs engineering at [company]"
- **Domain lookup**: email domain or website provided

### Step 2: Web research (always)

Use `capability_execute` with capabilityId "research.web_search" to run these searches:
1. Company homepage and about page
2. Recent news and press releases (last 90 days)
3. Funding history and investors
4. Company careers page (hiring signals)
5. Key leadership team
6. Product and pricing information
7. Customer case studies and testimonials

If researching a person, add:
8. Person's professional background
9. Person's recent public activity or publications

### Step 3: Enrichment (if available)

Use `capability_execute` with capabilityId "enrichment.lookup_company" for:
- Firmographics (size, revenue, industry, headquarters)
- Tech stack
- Org chart
- Growth signals

Use `capability_execute` with capabilityId "enrichment.lookup_person" for:
- Verified contact info
- Role history
- Social profiles

### Step 4: CRM context (if available)

Use `capability_execute` with capabilityId "crm.lookup_account" to check:
- Prior relationship (existing account, past opportunities)
- Opportunity history and current pipeline
- Existing contacts and their roles
- Last activity date

### Step 5: Synthesize

Combine all sources. Prioritize enrichment data over web scraping when both are available. Identify qualification signals.

### Output Format

Present as structured markdown:

**Quick Take**: 2-3 sentence executive summary of the prospect.

**Company Profile**

| Field | Value |
|---|---|
| Company | name |
| Industry | industry |
| Size | employee count |
| Revenue | if known |
| HQ | location |
| Founded | year |
| Funding | total and last round |

**Recent News**
- Bullet list of 3-5 most relevant recent developments

**Hiring Signals**
- What roles they are hiring for and what that implies

**Key People**
For each relevant person:
- Name, title, and background
- Talking point specific to them

**Tech Stack**
- Known technologies relevant to your product

**Prior Relationship** (if CRM data available)
- Account history, open opportunities, last contact

**Qualification Signals**
- Positive signals (growth, hiring, tech fit, trigger events)
- Concerns (layoffs, leadership change, competitor incumbent)
- Unknown (gaps to fill in discovery)

**Recommended Approach**
- Best entry point (who to contact and why)
- Opening hook (what to lead with)
- 3 discovery questions to ask

**Sources**
- List all sources used with links where available
