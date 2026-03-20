---
name: marketing-draft-content
description: Draft marketing copy — blog posts, social media posts, ad copy, landing pages, and product descriptions. Triggers on "draft a blog post", "write social posts for", "write ad copy", "draft landing page copy", "write a product description"
argument-hint: "<topic, brief, or context>"
user-invocable: true
metadata:
  openclaw:
    tags: [marketing, content, writing, copywriting]
---

## Draft Content

When the user asks to draft marketing copy or content:

### Step 1: Determine content type and parameters

Identify from the request:
- **Content type**: blog post, social media post, ad copy, landing page, product description, press release, newsletter section
- **Topic**: subject matter or product/feature
- **Audience**: who will read this
- **Tone**: professional, casual, technical, playful, authoritative
- **Length**: short-form (social, ads) vs long-form (blog, landing page)
- **Platform**: specific platform constraints (Twitter 280 chars, LinkedIn 3000 chars, etc)
- **CTA**: what action the reader should take

### Step 2: Research and context gathering

Use `capability_execute` with capabilityId "research.web_search" to collect:
1. Best-performing examples of the same content type
2. Current trends in the topic area
3. Key statistics or data points to strengthen the copy
4. Competitor messaging on the same topic
5. Recent news hooks that add timeliness

Use `capability_execute` with capabilityId "seo.keyword_research" for SEO content:
- Target keywords and their natural placement
- Related questions to address
- Featured snippet opportunities

### Step 3: Gather brand context (if available)

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Brand voice guidelines or past examples
- Product messaging documents
- Customer language and testimonials
- Approved claims and proof points

Use `capability_execute` with capabilityId "analytics.get_metrics" to check:
- Past content performance to inform what works
- Audience engagement data for content preferences

### Step 4: Write the draft

**Blog post rules:**
- Hook reader in the first 2 sentences
- Use clear H2/H3 structure for scannability
- Include data points and examples
- Write short paragraphs (3-4 sentences max)
- End with a clear CTA
- Include SEO keywords naturally
- Target the specified word count

**Social media post rules:**
- Lead with the hook — first line must stop the scroll
- Write for the specific platform's format and culture
- Include a clear value proposition or takeaway
- End with engagement prompt or CTA
- Provide 3 variants with different angles

**Ad copy rules:**
- Headline: benefit-driven, under 30 characters for search ads
- Description: specific value proposition with proof point
- CTA: action-oriented verb
- Provide 3-5 variants for A/B testing
- Follow platform character limits strictly

**Landing page rules:**
- Hero headline: clear value proposition
- Subhead: supporting detail
- 3-5 benefit sections with headlines
- Social proof section
- FAQ section addressing common objections
- Single focused CTA repeated throughout
- Write for scanning, not reading

### Step 5: Save the brief (if requested)

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Final draft document for review and collaboration

### Output Format

For **blog posts**:

**Draft: [Title]**

Meta description: [155 chars]
Target keyword: [keyword]
Word count: [count]

---

[Full blog post draft with H2/H3 structure, formatted in markdown]

---

**Revision Notes**
- Areas where more specific data could be inserted
- Sections that may need SME review
- Alternative angles considered

---

For **social media posts**:

**Social Media Drafts: [Topic]**

Platform: [platform name]

**Variant 1** (angle: [approach])
[Full post text]
Suggested media: [image/video recommendation]

**Variant 2** (angle: [approach])
[Full post text]
Suggested media: [image/video recommendation]

**Variant 3** (angle: [approach])
[Full post text]
Suggested media: [image/video recommendation]

---

For **ad copy**:

**Ad Copy Variants: [Campaign/Product]**

Platform: [platform]
Format: [search/display/social]

| Variant | Headline | Description | CTA |
|---|---|---|---|
| A | headline text | description text | CTA text |
| B | headline text | description text | CTA text |
| C | headline text | description text | CTA text |

**Rationale**: why each variant takes its angle

---

For **landing pages**:

**Landing Page Copy: [Page Name]**

**Hero Section**
- Headline: [headline]
- Subhead: [subhead]
- CTA button: [button text]

**Benefit Sections**
1. [Section headline] — [supporting copy]
2. [Section headline] — [supporting copy]
3. [Section headline] — [supporting copy]

**Social Proof**
- [Testimonial or proof point placement]

**FAQ**
Q: [question]
A: [answer]

**Final CTA**
- Headline: [closing headline]
- CTA button: [button text]
