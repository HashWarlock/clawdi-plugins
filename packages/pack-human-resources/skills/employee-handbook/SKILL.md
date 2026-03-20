---
name: employee-handbook
description: Create or update employee handbook sections with compliant, clear language
metadata:
  openclaw:
    tags: [human-resources, handbook, policies, documentation]
---

## Employee Handbook Workflow

You help HR teams create new employee handbook sections or update existing ones.
You produce professionally written, compliance-aware content that is clear and
accessible to all employees. You support both full section creation and targeted
updates to existing sections.

### Step 1: Identify the handbook task

Ask for or infer:
- **Action**: create a new section or update an existing section
- **Section topic** (e.g., remote work policy, code of conduct, benefits overview,
  leave policies, workplace safety, anti-discrimination, social media policy)
- **Target audience** (all employees, US employees, managers only, etc.)
- **Company jurisdiction** (US, UK, EU, multi-jurisdiction, etc.)
- **Tone preference** (formal, conversational, balanced)

### Step 2: Search for the existing handbook

Use `capability_execute` with capabilityId `docs.search_files` and packId `human-resources`
to find the current employee handbook and the specific section being updated.

Pass in args:
```
{ "query": "employee handbook <section topic>", "file_types": ["doc", "pdf", "md", "html", "notion"], "folders": ["HR", "Handbook", "Policies", "Legal"] }
```

If updating an existing section, also search for the full handbook to understand
the surrounding context, style, and structure:

```
{ "query": "employee handbook table of contents", "file_types": ["doc", "pdf", "md", "html", "notion"], "folders": ["HR", "Handbook"] }
```

### Step 3: Research compliance requirements

Use `capability_execute` with capabilityId `research.web_search` and packId `human-resources`
to gather current legal requirements and best practices for the section topic.

Pass in args:
```
{ "query": "<section topic> employee handbook legal requirements <jurisdiction> <current year>", "sources": ["shrm.org", "dol.gov", "eeoc.gov", "employment law blogs"] }
```

For multi-jurisdiction companies, search for each relevant jurisdiction:

```
{ "query": "<section topic> employer obligations <jurisdiction>", "sources": ["government employment sites", "legal guides"] }
```

### Step 4: Review comparable policies at peer companies (optional)

If the user requests benchmarking against peers, use `capability_execute` with
capabilityId `research.web_search` and packId `human-resources`:

```
{ "query": "<section topic> employee handbook examples tech companies <current year>", "sources": ["publicly available handbooks", "HR publications"] }
```

### Step 5: Draft the handbook section

Produce the section with the following structure:

#### Section Header
- Clear, descriptive title
- Section number (if the handbook uses numbering)
- Effective date and last-revised date

#### Purpose Statement
A 1-2 sentence explanation of why this policy exists and what it aims to achieve.

#### Scope
Who the policy applies to:
- All employees, specific locations, specific employment types
- Any exclusions

#### Policy Statement
The core policy content, organized into clear subsections:
- Use plain language, not legalese
- Use numbered lists for sequential procedures
- Use bullet points for non-sequential items
- Bold key terms and obligations
- Include specific numbers, dates, and limits (not vague language)

#### Definitions
Define any terms that might be ambiguous or have specific legal meaning in context.

#### Procedures
Step-by-step instructions for how to follow the policy:
1. What to do first
2. Who to contact
3. Required forms or systems
4. Approval process
5. Timelines and deadlines

#### Manager Responsibilities
What managers must do to enforce or support this policy.

#### Employee Rights and Responsibilities
What employees are entitled to and what is expected of them.

#### Violations and Consequences
What happens if the policy is not followed. Use progressive discipline where
appropriate.

#### Related Policies
Cross-references to other relevant handbook sections.

#### Legal Notice
Required legal disclaimers, at-will statement (if applicable), and compliance
references.

### Step 6: Compare with existing section (if updating)

If updating an existing section, produce:
1. A redline summary highlighting what changed and why
2. A list of substantive changes vs. editorial changes
3. Flagged items that may require legal review before publishing

### Step 7: Save the handbook section

Use `capability_execute` with capabilityId `docs.create_brief` and packId `human-resources`
to save the new or updated section.

Pass in args:
```
{ "title": "Employee Handbook - <Section Title> - <Draft or Final>", "content": "<generated section>", "folder": "HR/Handbook/Drafts" }
```

### Step 8: Notify stakeholders (optional)

If requested, use `capability_execute` with capabilityId `mail.send_followup` and
packId `human-resources` to send the draft for review.

Pass in args:
```
{ "to": ["<hr director email>", "<legal counsel email>"], "subject": "Handbook Update for Review: <Section Title>", "body": "<summary of changes with link to draft document>" }
```

### Output Format

```
## Employee Handbook: <Section Title>

**Section:** <Number if applicable>
**Effective Date:** <Date>
**Last Revised:** <Date>
**Applies To:** <Scope>

---

### Purpose
<1-2 sentence purpose statement>

### Scope
<Who this applies to>

### Policy
<Core policy content with clear subsections>

### Definitions
| Term | Definition |
|------|------------|
| ...  | ...        |

### Procedures
1. <Step-by-step procedures>

### Manager Responsibilities
- <Bullet list of manager duties>

### Employee Rights and Responsibilities
- <Bullet list>

### Violations
<Progressive discipline or consequences>

### Related Policies
- <Cross-references>

### Legal Notice
<Required disclaimers>

---

### Change Log (if updating)
| Date | Change | Reason | Reviewer |
|------|--------|--------|----------|
| ...  | ...    | ...    | ...      |

> This section should be reviewed by legal counsel before publication.
> Last compliance check: <date or "pending">
```
