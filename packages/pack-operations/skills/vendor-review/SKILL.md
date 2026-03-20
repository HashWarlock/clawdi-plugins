---
name: ops-vendor-review
description: Evaluate a vendor, tool, or service provider with capability assessment, risk analysis, cost comparison, and recommendation. Triggers on "review [vendor]", "evaluate [tool]", "should we use [service]", "vendor comparison", "vendor assessment for [name]"
metadata:
  openclaw:
    tags: [operations, vendor, procurement, evaluation]
---

## Vendor Review

When the user asks to evaluate or compare vendors, tools, or service providers:

### Step 1: Define evaluation scope

Gather from the user:
- **Vendor(s) to evaluate**: one vendor deep-dive or multi-vendor comparison
- **Category**: what problem the vendor solves
- **Requirements**: must-have and nice-to-have capabilities
- **Budget**: cost constraints or target pricing
- **Team size**: number of users or scale of deployment
- **Timeline**: when a decision is needed
- **Current solution**: what they use today (if anything)

### Step 2: Research vendors

Use `capability_execute` with capabilityId "research.web_search" for each vendor:
1. Product features and capabilities
2. Pricing model and published pricing
3. Customer reviews and ratings (G2, Capterra, Trustpilot)
4. Case studies and customer testimonials
5. Company background (founding, funding, team size, growth)
6. Recent product updates and roadmap announcements
7. Integration ecosystem and API capabilities
8. Security certifications and compliance (SOC 2, ISO 27001, GDPR)
9. Support model (SLA, channels, hours)
10. Known issues or complaints

### Step 3: Company enrichment

Use `capability_execute` with capabilityId "enrichment.lookup_company" for vendor viability:
- Company size and growth trajectory
- Funding history and financial stability
- Market position and competitive landscape
- Technology stack and infrastructure

### Step 4: Internal context

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Internal discussions about this vendor or category
- Feedback from team members who evaluated or used the vendor
- Requirements or concerns raised by stakeholders
- Previous vendor evaluations for the same category

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Existing vendor evaluation documents
- Procurement policies and approval requirements
- Current contracts and renewal dates
- Security assessment questionnaires

### Step 5: Evaluate against requirements

Score each vendor against:
- **Functional fit**: how well it meets stated requirements (weighted)
- **Technical fit**: integration, scalability, architecture alignment
- **Vendor viability**: financial health, market position, longevity risk
- **Security & compliance**: certifications, data handling, privacy
- **Support & service**: responsiveness, SLAs, customer success
- **Cost**: TCO including implementation, licensing, maintenance
- **User experience**: ease of use, adoption friction, training needs

### Step 6: Build recommendation

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Complete vendor evaluation document

Use `capability_execute` with capabilityId "project.create_task" to create:
- Follow-up tasks (schedule demo, request proposal, security review)

### Output Format

**Vendor Review: [Category]**

**Evaluation Summary**

| Field | Value |
|---|---|
| Category | what problem is being solved |
| Vendors Evaluated | list |
| Evaluation Date | date |
| Decision Needed By | date |
| Recommended Vendor | name (or "more evaluation needed") |
| Confidence Level | High / Medium / Low |

**Executive Recommendation**
3-4 sentence recommendation with the recommended vendor, primary reasons for the choice, and key caveats.

**Requirements Matrix**

| Requirement | Weight | Vendor A | Vendor B | Vendor C |
|---|---|---|---|---|
| Requirement 1 (must-have) | Critical | Yes/No/Partial | Yes/No/Partial | Yes/No/Partial |
| Requirement 2 (must-have) | Critical | Yes/No/Partial | Yes/No/Partial | Yes/No/Partial |
| Requirement 3 (nice-to-have) | High | Yes/No/Partial | Yes/No/Partial | Yes/No/Partial |
| Requirement 4 (nice-to-have) | Medium | Yes/No/Partial | Yes/No/Partial | Yes/No/Partial |

**Vendor Profiles**

### [Vendor A Name]

| Field | Value |
|---|---|
| Website | url |
| Founded | year |
| Company Size | employees |
| Funding | total raised |
| Customers | notable customers |
| Pricing | model and approximate cost |

**Strengths**
- 3-5 specific strengths with evidence

**Weaknesses**
- 3-5 specific weaknesses with evidence

**Customer Sentiment**: X/5 from [source] (X reviews)
Key themes from reviews: positive and negative patterns

---

(Repeat for each vendor)

**Comparative Scorecard**

| Dimension | Weight | Vendor A | Vendor B | Vendor C |
|---|---|---|---|---|
| Functional Fit | 30% | X/5 | X/5 | X/5 |
| Technical Fit | 20% | X/5 | X/5 | X/5 |
| Vendor Viability | 15% | X/5 | X/5 | X/5 |
| Security & Compliance | 15% | X/5 | X/5 | X/5 |
| Support & Service | 10% | X/5 | X/5 | X/5 |
| Cost | 10% | X/5 | X/5 | X/5 |
| **Weighted Total** | **100%** | **X/5** | **X/5** | **X/5** |

**Cost Comparison**

| Cost Component | Vendor A | Vendor B | Vendor C |
|---|---|---|---|
| License/Subscription (annual) | $X | $X | $X |
| Implementation | $X | $X | $X |
| Training | $X | $X | $X |
| Ongoing Support | $X | $X | $X |
| **Total Year 1** | **$X** | **$X** | **$X** |
| **Total 3-Year TCO** | **$X** | **$X** | **$X** |

**Risk Assessment**

| Vendor | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Vendor A | specific risk | level | level | mitigation |
| Vendor B | specific risk | level | level | mitigation |

**Integration Assessment**

| Integration | Vendor A | Vendor B | Vendor C |
|---|---|---|---|
| integration need | Native / API / Third-party / None | same | same |

**Recommendation**

**Recommended**: [Vendor Name]

**Rationale**:
1. Primary reason with evidence
2. Secondary reason with evidence
3. Supporting factor

**Caveats**:
- Important considerations or conditions for the recommendation

**Next Steps**

| Step | Action | Owner | Date |
|---|---|---|---|
| 1 | Schedule vendor demo | name | date |
| 2 | Request detailed proposal | name | date |
| 3 | Security assessment | name | date |
| 4 | Reference check | name | date |
| 5 | Final decision | name | date |

**Sources**
- List all research sources with links
