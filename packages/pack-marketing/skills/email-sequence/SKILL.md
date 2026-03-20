---
name: marketing-email-sequence
description: Design a multi-step email sequence with targeting, subject lines, body copy, timing, and A/B testing plan. Triggers on "email sequence for", "drip campaign", "nurture sequence", "onboarding emails", "email workflow for [goal]"
metadata:
  openclaw:
    tags: [marketing, email, sequences, automation]
---

## Email Sequence

When the user asks to create an email sequence or drip campaign:

### Step 1: Define the sequence parameters

Gather from the user:
- **Sequence type**: welcome/onboarding, nurture, re-engagement, post-purchase, event follow-up, product launch, trial-to-paid, cart abandonment
- **Audience**: who receives this sequence
- **Entry trigger**: what causes someone to enter the sequence
- **Goal**: activation, conversion, retention, upsell, engagement
- **Number of emails**: or let the plan determine this
- **Brand voice**: tone and style guidelines
- **Compliance**: CAN-SPAM, GDPR, or other requirements

### Step 2: Research best practices

Use `capability_execute` with capabilityId "research.web_search" to find:
1. Best practices for this sequence type (timing, length, content)
2. Industry benchmarks (open rates, CTR, conversion rates)
3. Examples of effective sequences in the same category
4. Common mistakes to avoid
5. Subject line patterns that drive high open rates

### Step 3: Analyze existing performance (if available)

Use `capability_execute` with capabilityId "analytics.get_metrics" to check:
- Current email open rates, CTR, and unsubscribe rates
- Best-performing email subject lines and send times
- Audience engagement patterns by segment
- Conversion funnel drop-off points

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- Internal notes on past email performance
- Customer feedback on email communications
- Sales team input on what messaging resonates

### Step 4: Design the sequence

For each email in the sequence, define:
- **Send timing**: delay from trigger or previous email
- **Subject line**: primary and A/B variant
- **Preview text**: first line visible in inbox
- **Purpose**: what this email accomplishes in the sequence
- **Body copy**: full email text
- **CTA**: primary action and button text
- **Exit conditions**: when to remove someone from the sequence

**Email copy rules (strict):**
- Plain text or minimal HTML — no heavy formatting
- Short paragraphs (2-3 sentences max)
- One primary CTA per email
- Personalization tokens where appropriate ({first_name}, {company_name})
- Subject lines under 50 characters
- Preview text that complements (not repeats) the subject line
- Conversational tone — write like a human, not a brand
- Clear unsubscribe path in every email

### Step 5: Send via connected platform (if available)

Use `capability_execute` with capabilityId "mail.send_followup" to:
- Queue or schedule the first email in the sequence
- Set up automation triggers (if the platform supports it)

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Complete sequence document for implementation

### Output Format

**Email Sequence: [Sequence Name]**

**Sequence Overview**

| Field | Value |
|---|---|
| Type | welcome / nurture / re-engagement / etc |
| Audience | segment description |
| Entry Trigger | what starts the sequence |
| Goal | primary conversion goal |
| Emails | total count |
| Duration | total days from first to last |
| Expected Open Rate | benchmark % |
| Expected CTR | benchmark % |

**Sequence Flow**

```
[Trigger] -> Email 1 (Day 0) -> Wait 2d -> Email 2 (Day 2) -> Wait 3d -> Email 3 (Day 5) -> ...
Exit conditions: [when to remove from sequence]
```

---

**Email 1: [Email Name]**
Send: [timing from trigger]
Purpose: [what this email accomplishes]

Subject A: [primary subject line]
Subject B: [A/B variant]
Preview: [preview text]

---

[Full email body copy]

---

CTA: [button text] -> [destination URL description]

---

**Email 2: [Email Name]**
Send: [timing from previous email]
Purpose: [what this email accomplishes]

Subject A: [primary subject line]
Subject B: [A/B variant]
Preview: [preview text]

---

[Full email body copy]

---

CTA: [button text] -> [destination URL description]

---

(Continue for all emails in the sequence)

---

**A/B Testing Plan**

| Test | Variable | Variant A | Variant B | Success Metric |
|---|---|---|---|---|
| Email 1 | Subject line | subject A | subject B | Open rate |
| Email 3 | CTA | CTA text A | CTA text B | Click rate |

**Segmentation Rules**
- Conditions for branching the sequence based on engagement
- What happens when someone clicks vs ignores

**Success Metrics**

| Metric | Target | Measurement |
|---|---|---|
| Sequence completion rate | X% | % who receive all emails |
| Overall conversion rate | X% | % who complete goal action |
| Unsubscribe rate | <X% | % who opt out during sequence |

**Implementation Notes**
- Platform-specific setup instructions
- Merge tag mappings
- Compliance checklist
