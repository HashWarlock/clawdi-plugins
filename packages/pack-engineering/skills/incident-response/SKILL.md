---
name: engineering-incident-response
description: Coordinate incident response by gathering context, creating tasks, and organizing communication
metadata:
  openclaw:
    tags: [engineering, incident, on-call, response]
---

# Incident Response Workflow

When the user reports an incident, asks for help coordinating an outage response,
or needs to organize an incident investigation:

## Step 1: Search for related recent alerts and incidents

Use `capability_execute` with the following parameters:
- capabilityId: "chat.search_messages"
- packId: "engineering"
- args:
  - query: "<incident_description_keywords> alert error outage"
  - channels: ["incidents", "alerts", "on-call", "engineering"]
  - maxResults: 20
  - dateRange: "last_24_hours"

Gather any alerts, error reports, or related discussions that may be
connected to this incident. Identify if this is a new incident or a
recurrence of a known issue.

## Step 2: Search for related runbooks and incident playbooks

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<affected_service_or_component> runbook playbook incident response"
  - maxResults: 10
  - tags: ["runbook", "playbook", "incident", "on-call"]

Find existing runbooks that cover the affected service or failure mode.
These provide the baseline response steps and escalation procedures.

## Step 3: Identify the on-call schedule and responders

Use `capability_execute` with the following parameters:
- capabilityId: "calendar.read_events"
- packId: "engineering"
- args:
  - filter: "on-call OR oncall OR incident"
  - timeRange: "today"
  - maxResults: 10
  - fields: ["title", "attendees", "start", "end"]

Determine who is currently on-call for the affected service and who
should be pulled into the response.

## Step 4: Search for prior incidents with similar symptoms

Use `capability_execute` with the following parameters:
- capabilityId: "docs.search_files"
- packId: "engineering"
- args:
  - query: "<error_message_or_symptoms> postmortem incident report"
  - maxResults: 8
  - tags: ["postmortem", "incident-report", "rca"]

Look for prior postmortems that match the symptoms. These can
dramatically accelerate diagnosis by revealing known root causes.

## Step 5: Research external service status

Use `capability_execute` with the following parameters:
- capabilityId: "research.web_search"
- packId: "engineering"
- args:
  - query: "<affected_external_service> status outage <current_date>"
  - maxResults: 5

Check if the incident is caused by or related to a third-party
service outage (cloud provider, CDN, DNS, payment processor, etc.).

## Step 6: Create the incident tracking task

Use `capability_execute` with the following parameters:
- capabilityId: "project.create_task"
- packId: "engineering"
- args:
  - title: "[INC] <concise_incident_description>"
  - description: "<structured_incident_brief_from_output_format>"
  - priority: "urgent"
  - labels: ["incident", "<severity>", "<affected_service>"]
  - project: "incidents"
  - assignee: "<incident_commander_or_on_call>"

Note: This is a side-effecting action. The router will request confirmation.

## Step 7: Create follow-up investigation tasks

Based on the initial triage, create specific investigation tasks using
`capability_execute` with:
- capabilityId: "project.create_task"
- packId: "engineering"
- args:
  - title: "[INC-<incident_id>] <specific_investigation_action>"
  - description: "<what to investigate and why>"
  - priority: "<based_on_severity>"
  - labels: ["incident", "investigation"]
  - parentTask: "<incident_task_id>"

Create separate tasks for each distinct investigation track:
- Root cause investigation
- Customer impact assessment
- Mitigation or rollback action
- Communication and status updates

## Step 8: Present the incident response brief

Format the output as follows:

```
## Incident Response Brief

### Incident Overview
- **Incident ID:** <generated_or_task_id>
- **Reported:** <timestamp>
- **Reporter:** <who reported it>
- **Severity:** <sev1/sev2/sev3/sev4>
- **Status:** <investigating/identified/mitigating/resolved>
- **Affected service(s):** <service_names>

### Symptoms
<clear description of what is broken from the user/customer perspective>

- <symptom 1>
- <symptom 2>
- <error messages if applicable>

### Initial Assessment
- **Likely scope:** <single tenant / multi-tenant / global>
- **Customer impact:** <estimated number of affected users/customers>
- **Revenue impact:** <if quantifiable>
- **Data integrity risk:** <yes/no with explanation>

### Related Context
- **Matching alerts:** <list of related alerts found in chat>
- **Similar prior incidents:**
  - <incident_ref>: <root_cause_summary> -- <relevant_or_not>
- **External service status:** <any third-party issues found>

### Applicable Runbook
- **Runbook:** <title and location if found>
- **Key steps from runbook:**
  1. <step>
  2. <step>
  3. <step>

### Response Team
| Role | Person | Status |
|------|--------|--------|
| Incident Commander | <name> | <on-call/paged> |
| Primary Investigator | <name> | <assigned> |
| Communications Lead | <name> | <if applicable> |

### Immediate Actions
1. <first thing to do right now with specific instructions>
2. <second action>
3. <third action>

### Communication Plan
- **Internal:** Post status update in #incidents every <interval>
- **Customer-facing:** <draft status page update if sev1/sev2>
- **Stakeholder notification:** <who needs to know and by when>

### Tracking
- **Incident task:** <task_id_and_link>
- **Investigation tasks:**
  - <task_id>: <description>
  - <task_id>: <description>

### Timeline
| Time | Event |
|------|-------|
| <time> | Incident reported |
| <time> | Response brief created |
| <time> | <next expected checkpoint> |
```

For Sev1 incidents, add an explicit reminder to send a customer-facing
status update within 15 minutes and to establish a dedicated war room channel.
