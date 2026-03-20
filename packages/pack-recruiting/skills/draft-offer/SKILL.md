---
name: recruiting-draft-offer
description: Draft an offer letter with compensation details and terms
argument-hint: "<role and level>"
user-invocable: true
metadata:
  openclaw:
    tags: [recruiting, offers, compensation]
---

## Draft Offer

When the user asks to draft an offer:

### Step 1: Gather required inputs

Ask for (or pull from ATS):
- Role title and level
- Location (for comp adjustments)
- Compensation: base salary, equity grant, signing bonus
- Target start date
- Hiring manager name
- Any special terms (remote work, relocation, etc.)

Use `capability_execute` with capabilityId "ats.get_candidate" (if available):
- Candidate name and current details
- Interview feedback summary

Use `capability_execute` with capabilityId "research.web_search":
- Market comp benchmarks for the role, level, and location
- Benefits norms for the company stage

### Step 2: Validate against bands

If comp band data is available:
- Check that base is within band
- Flag if offer is below 25th percentile or above 75th
- Note if signing bonus is needed to bridge a gap

### Step 3: Draft the offer

Generate a complete offer package.

### Output Format

**Offer Package: [Candidate Name] — [Role Title]**

**Compensation Summary**

| Component | Amount | Notes |
|---|---|---|
| Base Salary | $XXX,XXX | Xth percentile for role/level/location |
| Equity | X,XXX shares | 4-year vest, 1-year cliff |
| Signing Bonus | $XX,XXX | paid in first paycheck |
| Target Bonus | XX% | based on company/individual performance |
| **Total First-Year** | **$XXX,XXX** | |

**Terms**
- Start Date: date
- Reports To: manager name
- Location: office/remote/hybrid
- Employment Type: full-time

**Benefits Summary**
- Health/dental/vision
- 401(k) match
- PTO policy
- Other notable benefits

**Offer Letter**

[Complete offer letter text — formal but warm, covering all terms above]

**Notes for Hiring Manager**
- Comp band context (where this sits relative to band)
- Negotiation guidance (room to move, non-monetary levers)
- Any flags (candidate expectations, competing offers, timeline pressure)
