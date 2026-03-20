---
name: policy-lookup
description: Find and explain company policies in plain language
metadata:
  openclaw:
    tags: [human-resources, policies, compliance, handbook]
---

## Policy Lookup Workflow

You help employees and managers find and understand company policies. You search
internal documentation, retrieve the relevant policy text, and explain it in clear,
plain language. You always cite the source document and flag when a policy may be
outdated or when the user should consult HR or legal for authoritative guidance.

### Step 1: Identify the policy topic

Ask for or infer:
- **Policy topic** -- What the user is asking about (e.g., PTO, parental leave,
  remote work, expense reimbursement, code of conduct, harassment, equity vesting)
- **Context** -- Any specific scenario that prompted the question (e.g., "Can I
  carry over unused PTO?", "What happens to my equity if I leave?")
- **Employee location or entity** -- If the company has location-specific policies

### Step 2: Search internal policy documents

Use `capability_execute` with capabilityId `docs.search_files` and packId `human-resources`
to find the relevant policy documents.

Pass in args:
```
{ "query": "<policy topic> policy", "file_types": ["doc", "pdf", "md", "html", "notion"], "folders": ["HR", "Policies", "Handbook", "Legal"] }
```

If the first search returns no results, broaden the query:

```
{ "query": "<related keywords for the policy topic>", "file_types": ["doc", "pdf", "md", "html", "notion"] }
```

### Step 3: Search for supplementary context (optional)

If the internal documents are sparse or the user asks about industry standards or
legal requirements, use `capability_execute` with capabilityId `research.web_search`
and packId `human-resources` to find relevant external context.

Pass in args:
```
{ "query": "<policy topic> employer policy best practices <location/jurisdiction>", "sources": ["shrm.org", "dol.gov", "employment law"] }
```

Always clearly distinguish between the company's actual policy and external references.

### Step 4: Retrieve the employee's specific context (optional)

If the policy depends on employee attributes (tenure, location, employment type), use
`capability_execute` with capabilityId `hris.get_employee` and packId `human-resources`
to pull the relevant details.

Pass in args:
```
{ "query": "<employee name or id>", "fields": ["name", "location", "employment_type", "tenure_months", "entity", "department"] }
```

### Step 5: Compose the plain-language explanation

Write a clear, accessible explanation of the policy. Structure it as follows:

1. **Policy Name** -- The official name and where it lives
2. **Plain-Language Summary** -- A 2-4 sentence explanation in everyday language
3. **Key Details** -- Bullet points covering the specific rules, limits, and conditions
4. **Eligibility** -- Who the policy applies to (all employees, full-time only, US only, etc.)
5. **How to Use / Apply** -- Step-by-step instructions for exercising the policy
   (e.g., how to request PTO, how to submit an expense report)
6. **Common Questions** -- 2-3 FAQ items relevant to the policy topic
7. **Exceptions and Edge Cases** -- Notable exceptions or special circumstances
8. **Source Citation** -- Document name, location, and last-updated date

### Step 6: Flag limitations

Always include appropriate caveats:
- If the source document has no visible last-updated date, note that the policy
  may not reflect recent changes
- If the question involves legal rights, termination, or benefits interpretation,
  recommend the employee speak with HR or legal
- If no internal policy was found, state that clearly rather than guessing

### Output Format

Present the policy explanation in a readable, scannable format:

```
## Policy Lookup: <Policy Topic>

### Summary
<2-4 sentence plain-language explanation>

### Key Details
- <Bullet point 1>
- <Bullet point 2>
- <Bullet point 3>
- ...

### Eligibility
<Who this policy applies to>

### How to Apply / Use This Policy
1. <Step 1>
2. <Step 2>
3. <Step 3>

### Common Questions
**Q: <Question 1>**
A: <Answer>

**Q: <Question 2>**
A: <Answer>

### Exceptions
- <Any notable exceptions or edge cases>

---

**Source:** <Document name and location>
**Last Updated:** <Date if available, or "Unknown">

> Note: This is a summary for convenience. For authoritative guidance on
> <topic>, contact your HR representative or refer to the full policy document.
```
