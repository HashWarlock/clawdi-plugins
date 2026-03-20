---
name: ops-runbook
description: Create or update an operational runbook with step-by-step procedures for routine operations, incident response, or system maintenance. Triggers on "create a runbook for", "runbook for [system]", "write an operations guide for", "incident playbook for", "how to handle [scenario]"
argument-hint: "<system, procedure, or scenario name>"
user-invocable: true
metadata:
  openclaw:
    tags: [operations, runbook, incident-response, procedures]
---

## Runbook

When the user asks to create or update a runbook:

### Step 1: Define runbook scope

Gather from the user:
- **Runbook type**: routine operation, incident response, maintenance, deployment, disaster recovery
- **System/service**: what system or service this covers
- **Audience**: oncall engineer, operations team, tier 1 support, any team member
- **Skill level assumed**: beginner, intermediate, expert
- **Environment**: production, staging, development (or all)

### Step 2: Gather existing information

Use `capability_execute` with capabilityId "docs.search_files" to find:
- Existing runbooks for the same or related systems
- Architecture diagrams and system documentation
- Incident post-mortems involving this system
- Monitoring and alerting documentation
- Service level objectives (SLOs) and SLAs
- Deployment guides and configuration references

Use `capability_execute` with capabilityId "chat.search_messages" to find:
- How team members have handled this scenario before
- Common troubleshooting steps shared informally
- Known gotchas and tribal knowledge
- Recent incidents and how they were resolved

### Step 3: Research best practices

Use `capability_execute` with capabilityId "research.web_search" for:
- Best practices for this type of runbook
- Common failure modes for the technology involved
- Industry-standard procedures for similar operations
- Tool-specific commands and procedures

### Step 4: Identify related operational context

Use `capability_execute` with capabilityId "project.list_tasks" to check:
- Known issues or bugs that affect this system
- Scheduled maintenance or changes
- Open improvement tasks for the runbook

Use `capability_execute` with capabilityId "calendar.read_events" to check:
- Oncall rotation schedule for this system
- Maintenance windows

### Step 5: Build the runbook

Structure every procedure with:
- Exact commands to run (copy-paste ready)
- Expected output for each command
- Decision criteria at each step (what to do if output differs)
- Rollback steps if something goes wrong
- Time estimates for each section
- Escalation criteria and contacts

### Step 6: Save and distribute

Use `capability_execute` with capabilityId "docs.create_brief" to save:
- Complete runbook document

Use `capability_execute` with capabilityId "mail.send_followup" to notify:
- Oncall team and system owners about the new or updated runbook

### Output Format

**Runbook: [System/Procedure Name]**

**Document Control**

| Field | Value |
|---|---|
| Runbook ID | RB-XXXX |
| Version | 1.0 |
| System/Service | name |
| Type | Routine / Incident / Maintenance / Deployment / DR |
| Audience | oncall / ops team / all engineers |
| Last Updated | date |
| Owner | name |
| Review Cycle | monthly / quarterly |

**Quick Reference**

| Item | Value |
|---|---|
| Service URL | url |
| Dashboard | monitoring dashboard link |
| Logs | log query or location |
| Oncall | current oncall contact or rotation |
| Escalation | escalation path |
| Rollback | go to [Rollback Section] |

**Prerequisites**
- Required access and permissions
- Tools that must be installed
- Environment variables or configuration needed

**Alerts That Trigger This Runbook**

| Alert | Severity | Condition | Expected Impact |
|---|---|---|---|
| alert name | P1/P2/P3 | what triggers it | user-facing effect |

---

**Procedure**

### Step 1: [Initial Assessment]
**Time estimate**: X minutes
**Who**: oncall engineer

1. Check the alert details and identify the affected component:
   ```
   exact command to run
   ```
   **Expected output**: what you should see
   **If output differs**: what this means and what to do

2. Verify the current system status:
   ```
   exact command to run
   ```
   **Expected output**: description
   **Healthy**: proceed to Step 2
   **Unhealthy**: skip to Step 3 (mitigation)

---

### Step 2: [Diagnosis]
**Time estimate**: X minutes

1. Check the specific subsystem:
   ```
   exact command
   ```
   **Looking for**: what to look for in the output

2. Review recent changes:
   ```
   exact command
   ```
   **If recent deployment**: proceed to Rollback section
   **If no recent changes**: continue diagnosis

---

### Step 3: [Mitigation]
**Time estimate**: X minutes

1. Apply the mitigation:
   ```
   exact command
   ```
   **Expected result**: what should happen
   **If mitigation fails**: escalate (see Escalation section)

2. Verify mitigation effectiveness:
   ```
   exact command
   ```
   **Success criteria**: what healthy looks like

---

(Continue for all steps)

**Rollback Procedure**

### Rollback Step 1:
```
exact command
```
**Expected output**: description

### Rollback Step 2:
```
exact command
```
**Verification**: how to confirm rollback was successful

---

**Escalation Matrix**

| Condition | Escalate To | Contact Method | SLA |
|---|---|---|---|
| Cannot resolve in X minutes | Team Lead | Slack + page | 15 min |
| User-facing impact > X minutes | Engineering Manager | page | 10 min |
| Data integrity concern | VP Engineering | phone | immediate |

**Known Issues & Workarounds**

| Issue | Symptoms | Workaround | Permanent Fix Status |
|---|---|---|---|
| issue | what it looks like | temporary fix | ticket/status |

**Post-Incident Checklist**
- [ ] Write incident report
- [ ] Update this runbook with new findings
- [ ] Create tasks for permanent fixes
- [ ] Notify stakeholders of resolution
- [ ] Schedule post-mortem if severity warrants

**Appendix**
- System architecture diagram reference
- Related runbooks
- Glossary of system-specific terms
