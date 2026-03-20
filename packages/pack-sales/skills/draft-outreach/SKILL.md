---
name: sales-draft-outreach
description: Draft personalized outreach based on research. Triggers on "draft outreach to [person/company]", "write cold email to [prospect]", "outreach for [company]"
metadata:
  openclaw:
    tags: [sales, outreach, email, prospecting]
---

## Draft Outreach

When the user asks to draft outreach to a prospect:

### Step 1: Parse the request

Identify:
- Target person (name, title, company)
- Outreach type: cold, warm, re-engagement, or post-event
- Channel: email, LinkedIn, or both

### Step 2: Research first (always)

Use `capability_execute` with capabilityId "research.web_search":
- Target person's professional background
- Target company's recent news and initiatives
- Any shared connections or common ground
- Relevant trigger events (funding, hiring, product launch)

Use `capability_execute` with capabilityId "enrichment.lookup_person" (if available):
- Verified email and title
- Role history and tenure

Use `capability_execute` with capabilityId "crm.lookup_account" (if available):
- Prior relationship with the company
- Past outreach attempts and their outcome

### Step 3: Identify the hook

Find the strongest personalization angle, in priority order:
1. **Trigger event**: something that just happened (funding, hire, launch)
2. **Mutual connection**: shared contact or community
3. **Their content**: something they wrote, said, or shared publicly
4. **Company initiative**: a strategic move that your product supports
5. **Role-based pain point**: a common challenge for their role

### Step 4: Draft using AIDA structure

- **Attention**: Personal hook (not generic flattery)
- **Interest**: Their specific problem or opportunity
- **Desire**: Proof point — how you've helped someone like them
- **Action**: Clear, low-friction CTA (not "let's schedule a call")

**Email style rules (strict):**
- Plain text only — no markdown formatting
- Subject line: short, specific, no clickbait
- 3-5 sentences max for cold outreach
- No generic openers ("I came across your company")
- No buzzwords ("synergy", "leverage", "innovative")
- One clear ask, not multiple options

### Output Format

**Research Summary**
- Target: name, title, company
- Hook: the personalization angle and why it works
- Goal: what you want from this outreach

**Email Draft**

To: email
Subject: [specific subject line]

[Plain text email body — no markdown]

**Subject Line Alternatives**
1. Alternative 1
2. Alternative 2

**LinkedIn Message** (if requested)
- Connection request (<300 characters)
- Follow-up message after connection

**Why This Approach**

| Element | Reasoning |
|---|---|
| Hook | why this angle was chosen |
| CTA | why this ask is appropriate |
| Tone | why this register was chosen |

**Follow-Up Sequence**
- Day 3: brief follow-up angle
- Day 7: new value-add angle
- Day 14: break-up message approach
