---
name: search
description: Search across all connected enterprise sources for relevant information
metadata:
  openclaw:
    tags: [enterprise-search, search, research]
---

# Enterprise Search

Search across all connected sources -- web, documents, email, and chat -- to find
relevant information for a user query. This skill fans out across available data
sources and returns a unified, deduplicated result set.

## When to Use

Activate this skill when the user wants to:

- Find information across multiple work tools at once
- Search for a topic, person, project, or keyword across their organization
- Locate a document, email thread, or chat conversation they remember partially
- Answer a factual question that may be documented somewhere internally

## Workflow

### Step 1: Parse the search query

Extract the user's core search intent:

- Identify primary keywords and phrases
- Determine if the query targets a specific source type (docs only, email only) or all sources
- Note any time constraints (e.g., "from last week", "recent")
- Note any person or team filters (e.g., "from Alice", "in the engineering channel")

### Step 2: Search web sources

Use `capability_execute` with the following parameters:

- **capabilityId:** `research.web_search`
- **packId:** `enterprise-search`
- **args:**
  - `query`: the user's search query, refined for web context
  - `maxResults`: 10
  - `recency`: time filter if the user specified one, otherwise omit

This step finds publicly available or web-indexed information relevant to the query.
Skip this step if the user explicitly asked to search only internal sources.

### Step 3: Search internal documents

Use `capability_execute` with the following parameters:

- **capabilityId:** `docs.search_files`
- **packId:** `enterprise-search`
- **args:**
  - `query`: the user's search query
  - `maxResults`: 15
  - `fileTypes`: filter by file type if the user specified one (e.g., "spreadsheets", "presentations")

This step searches the connected document store (Notion, Google Drive, Confluence, SharePoint)
for matching files, pages, and documents.

### Step 4: Search email

Use `capability_execute` with the following parameters:

- **capabilityId:** `mail.read_inbox`
- **packId:** `enterprise-search`
- **args:**
  - `query`: the user's search query
  - `maxResults`: 10
  - `dateRange`: time filter if specified, otherwise last 30 days
  - `folder`: "all" to search across all mail folders

This step searches the user's email for matching threads and messages.

### Step 5: Search chat messages (if available)

Use `capability_execute` with the following parameters:

- **capabilityId:** `chat.search_messages`
- **packId:** `enterprise-search`
- **args:**
  - `query`: the user's search query
  - `maxResults`: 10
  - `channels`: specific channels if the user named them, otherwise search all accessible channels

This capability is optional. If it returns `needs_setup`, skip this step and note
that chat search was not available.

### Step 6: Deduplicate and rank results

Combine all results from the previous steps:

1. Remove exact duplicates (same URL or document ID appearing from multiple sources)
2. Group results by topic relevance
3. Rank by a combination of:
   - Recency (newer results rank higher for time-sensitive queries)
   - Source authority (internal docs rank higher than web results for internal topics)
   - Match quality (exact phrase matches rank higher than keyword matches)

### Step 7: Present results

## Output Format

Present results in this structure:

```
## Search Results: "{query}"

**Sources searched:** {list of sources that were queried}
**Results found:** {total count}

### Top Results

1. **{Title}** ({source type}: {source name})
   {2-3 sentence summary of the content and why it matches}
   Link: {url or path}
   Date: {date}

2. **{Title}** ({source type}: {source name})
   {2-3 sentence summary}
   Link: {url or path}
   Date: {date}

[... up to 10 top results ...]

### Additional Results by Source

**Documents ({count})**
- {title} - {brief description}
- ...

**Email ({count})**
- {subject} from {sender} on {date} - {brief description}
- ...

**Chat ({count})**
- {channel}: {message preview} by {author} on {date}
- ...

**Web ({count})**
- {title} - {brief description}
- ...

---
*{Note any sources that were unavailable or returned errors}*
```

If no results are found across any source, suggest alternative search terms or
ask the user to refine their query. If a capability returned `needs_setup`, tell
the user which source is not connected and suggest running `/connect_apps`.
