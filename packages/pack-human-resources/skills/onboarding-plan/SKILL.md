---
name: onboarding-plan
description: Generate onboarding checklists and first-week plans for new hires
metadata:
  openclaw:
    tags: [human-resources, onboarding, new-hires, checklists]
---

## Onboarding Plan Workflow

You help HR teams, managers, and hiring coordinators create structured onboarding
plans for new hires. You generate role-appropriate checklists, first-day and first-week
schedules, and 30/60/90-day milestone plans.

### Step 1: Identify the new hire and role context

Ask for or infer:
- **New hire name**
- **Role title and level** (e.g., Senior Software Engineer, L4)
- **Department and team**
- **Manager name**
- **Start date**
- **Location** (office, remote, hybrid)
- **Employment type** (full-time, part-time, contractor)

### Step 2: Retrieve the new hire's HRIS record (if available)

Use `capability_execute` with capabilityId `hris.get_employee` and packId `human-resources`
to pull any existing profile data for the new hire.

Pass in args:
```
{ "query": "<new hire name or id>", "fields": ["name", "role", "level", "department", "manager", "start_date", "location", "employment_type", "entity", "buddy"] }
```

If the employee is not yet in the HRIS, proceed with the information provided by the user.

### Step 3: Search for existing onboarding templates

Use `capability_execute` with capabilityId `docs.search_files` and packId `human-resources`
to find any existing onboarding templates, checklists, or department-specific guides.

Pass in args:
```
{ "query": "onboarding checklist <department> <role>", "file_types": ["doc", "pdf", "md", "notion", "sheet"], "folders": ["HR", "Onboarding", "People Ops"] }
```

Also search for team-specific onboarding resources:

```
{ "query": "new hire guide <team or department>", "file_types": ["doc", "pdf", "md", "notion"] }
```

### Step 4: Check for scheduled onboarding events

Use `capability_execute` with capabilityId `calendar.read_events` and packId `human-resources`
to find any pre-scheduled onboarding sessions, orientations, or welcome events
around the start date.

Pass in args:
```
{ "date_range": "<start date> to <start date + 14 days>", "query": "onboarding OR orientation OR welcome OR new hire", "calendar": "hr" }
```

If calendar data is unavailable, skip and note that onboarding events should be
scheduled manually.

### Step 5: Generate the onboarding plan

Produce a comprehensive onboarding plan with the following sections:

#### Pre-Start Checklist (Before Day 1)
Assign each item to the responsible party (HR, IT, Manager, or Hiring Coordinator):

- [ ] Send welcome email with start date, time, and location details
- [ ] Ship or prepare laptop, monitors, and peripherals
- [ ] Create email account and company accounts
- [ ] Set up access to required tools (Slack, Jira, GitHub, HRIS, etc.)
- [ ] Assign an onboarding buddy from the team
- [ ] Add new hire to team distribution lists and channels
- [ ] Prepare desk or workspace (if in-office)
- [ ] Schedule Day 1 orientation and first-week meetings
- [ ] Send pre-reading materials (company overview, team wiki, product docs)
- [ ] Order welcome swag or kit

#### Day 1 Schedule

Build an hour-by-hour schedule for the first day:

1. **9:00 AM** -- Welcome meeting with manager (30 min)
   - Introductions, team overview, expectations for week 1
2. **9:30 AM** -- IT setup and account verification (30 min)
   - Verify laptop, email, Slack, VPN, and key tools
3. **10:00 AM** -- HR orientation (60 min)
   - Benefits enrollment, policy overview, HRIS walkthrough
4. **11:00 AM** -- Onboarding buddy coffee chat (30 min)
5. **11:30 AM** -- Team introductions (30 min)
6. **12:00 PM** -- Team lunch
7. **1:00 PM** -- Self-guided reading: company handbook and product docs (90 min)
8. **2:30 PM** -- Engineering/dept onboarding session (60 min) -- department-specific
9. **3:30 PM** -- First 1:1 with manager: goals and expectations (30 min)
10. **4:00 PM** -- Free time: explore tools, read documentation, set up dev environment

Adapt times and sessions based on the role and department.

#### First Week Plan (Days 2-5)

For each day, provide 3-5 structured activities:

- **Day 2**: Product deep-dive, shadow key meetings, complete required training
- **Day 3**: Begin first small task or starter project, meet cross-functional partners
- **Day 4**: Continue starter project, attend team standup and planning sessions
- **Day 5**: End-of-week check-in with manager, reflect on first impressions

#### 30/60/90-Day Milestones

**30 Days -- Ramp Up**
- [ ] Complete all required compliance and security training
- [ ] Ship or complete first meaningful contribution
- [ ] Attend all recurring team ceremonies (standups, retros, planning)
- [ ] Have 1:1s with all direct team members
- [ ] Meet 3-5 cross-functional stakeholders
- [ ] Document any onboarding gaps or friction for future hires

**60 Days -- Contributing**
- [ ] Own and deliver a medium-sized project or initiative
- [ ] Participate in on-call rotation or equivalent (if applicable)
- [ ] Receive first formal feedback from manager
- [ ] Begin mentoring or pairing with teammates on shared work
- [ ] Propose one process improvement based on fresh-eyes perspective

**90 Days -- Independent**
- [ ] Operate independently on standard team workflows
- [ ] Lead or drive a project end-to-end
- [ ] Complete 90-day review with manager
- [ ] Set goals for the next quarter
- [ ] Offboard from onboarding buddy program

### Step 6: Save the onboarding plan

Use `capability_execute` with capabilityId `docs.create_brief` and packId `human-resources`
to save the generated plan.

Pass in args:
```
{ "title": "Onboarding Plan - <new hire name> - <role> - <start date>", "content": "<generated plan>", "folder": "HR/Onboarding/<start date year>" }
```

### Step 7: Send the plan to relevant parties (optional)

If requested, use `capability_execute` with capabilityId `mail.send_followup` and
packId `human-resources` to email the onboarding plan to the manager and hiring
coordinator.

Pass in args:
```
{ "to": ["<manager email>", "<hiring coordinator email>"], "subject": "Onboarding Plan for <new hire name> - Starting <start date>", "body": "<summary of plan with link to full document>" }
```

### Output Format

```
## Onboarding Plan: <New Hire Name>
**Role:** <Role Title, Level>
**Department:** <Department> | **Team:** <Team>
**Manager:** <Manager Name>
**Start Date:** <Date> | **Location:** <Office / Remote / Hybrid>

---

### Pre-Start Checklist
| Task | Owner | Due | Status |
|------|-------|-----|--------|
| ...  | ...   | ... | [ ]    |

### Day 1 Schedule
| Time | Activity | Duration | With |
|------|----------|----------|------|
| ...  | ...      | ...      | ...  |

### First Week Plan
[Day-by-day breakdown]

### 30/60/90-Day Milestones
[Milestone checklists as above]

---

**Onboarding Buddy:** <Name>
**Key Contacts:** <IT, HR, Team Lead>
```
