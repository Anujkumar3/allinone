# Personal Productivity Dashboard

A full-project version of your daily dashboard with:

- Quick links to daily tools
- Today's tasks with checkboxes
- Notes section for quick thoughts
- Jira task widget (server-side integration)
- Personal and Manager dashboard modes
- Hierarchy-aware manager scoping (manager -> reportees)

## Project Structure

- `public/` - Frontend assets (`index.html`, `styles.css`, `app.js`)
- `src/` - Server and configuration
- `data/` - Dashboard defaults (`dashboard.json`)
- `server.js` - Root entrypoint

## Run

```bash
npm start
```

Then open `http://127.0.0.1:3000`.

## Jira Integration

The dashboard includes `Jira Tasks` and uses a backend proxy route:

- `GET /api/jira/issues`
- `GET /api/team/summary`
- `GET /api/hierarchy/managers`
- `GET /api/hierarchy/reports?managerId=<id>&includeIndirect=true`
- `GET /api/auth/context?email=<user-email>`
- `GET /api/raw/team-data?managerId=<id>&includeIndirect=true`

Configure these environment variables before running:

- `JIRA_BASE_URL` (example: `https://your-company-jira.example.com`)
- `JIRA_EMAIL` (or Jira username for your deployment)
- `JIRA_API_TOKEN` (API token/password)
- `JIRA_JQL` (optional)
- `JIRA_MAX_RESULTS` (optional, default `8`)
- `JIRA_TEAM_JQL` (optional, manager mode query)
- `JIRA_TEAM_MAX_RESULTS` (optional, default `50`)
- `JIRA_ASSIGNEE_FIELD` (optional, default `assignee`)
- `JIRA_ALLOW_SELF_SIGNED` (optional, `true` only for internal self-signed TLS)

Example PowerShell run:

```powershell
$env:JIRA_BASE_URL="https://your-jira-host"
$env:JIRA_EMAIL="you@company.com"
$env:JIRA_API_TOKEN="your-token"
$env:JIRA_JQL="assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC"
$env:JIRA_TEAM_JQL="assignee is not EMPTY AND statusCategory != Done ORDER BY priority DESC, updated DESC"
$env:JIRA_ASSIGNEE_FIELD="assignee"
npm start
```

Note: The URL you shared (`.../configurableDashboard?...`) looks like an application dashboard URL, not Jira REST API root. For Jira sync you need the Jira base URL used by `/rest/api/2` or `/rest/api/3`.

## Development Mode

```bash
npm run dev
```

This uses Node's watch mode to restart on server file changes.

## Go Live (Team Access)

Use a cloud host so your team can access the app from browser without VPN to your laptop.

Minimum production setup:

1. Push this project to a Git repository.
2. Deploy on a Node host (Render, Railway, Azure App Service, or similar).
3. Configure environment variables from `.env.example`.
4. Set `HOST=0.0.0.0` and `PORT` from platform (most providers set `PORT` automatically).
5. Set `MONGODB_URI` and `MONGODB_DB` for shared notifications/storage.
6. Verify health endpoint after deploy: `/api/health` should return `{ ok: true }`.

Recommended production env vars:

- `HOST=0.0.0.0`
- `PORT=3000` (or provider-assigned port)
- `MONGODB_URI=...`
- `MONGODB_DB=allinonw`
- `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`

After deployment, share the app URL with your team.

## MongoDB (Production Recommended)

Notifications can be stored in MongoDB for production reliability. If `MONGODB_URI` is set, the app uses MongoDB for in-app notifications. If not set (or if connection fails), it falls back to JSON file storage.

Set environment variables:

```bash
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@al-ml.s3cmnek.mongodb.net/?appName=Al-ml
MONGODB_DB=allinonw
```

Important:

- Replace `<db_password>` with your real Atlas user password.
- Do not commit credentials to source control.
- In Atlas Network Access, allow your deployment IP(s).

## Microsoft Teams Notifications (Help / Unblock Me)

You can send blocker notifications to a Teams channel using an Incoming Webhook.

1. In Teams, create an Incoming Webhook for the target channel and copy the webhook URL.
2. Set these environment variables:

```bash
BLOCKER_NOTIFY_WEBHOOK_URL=https://...your-teams-webhook...
BLOCKER_NOTIFY_PROVIDER=teams
```

3. Restart the server.
4. In Manager mode, use the Blocker Queue `Notify` button.

The server will format the notification as a Teams MessageCard including impact, type, owner, blocker details, reporter, manager, and timestamp.

## Customize Links and Default Tasks

Edit `data/dashboard.json`.

## Hierarchy Setup

Edit `data/hierarchy.json` to define manager-reportee relationships, or **sync from Nokia Directory**.

### Syncing from Nokia Directory

The full org hierarchy can be fetched from **Nokia Directory** ([https://directory.int.net.nokia.com/](https://directory.int.net.nokia.com/)). Use the sync script to pull data into `data/hierarchy.json`.

**Option A — Directory API (when available)**  
If your directory exposes a REST API (e.g. `/api/people` or similar), set the URL and run:

```bash
# .env or environment
DIRECTORY_URL=https://directory.int.net.nokia.com/api/people
# DIRECTORY_USER=...   # if auth required
# DIRECTORY_PASSWORD=...

npm run sync-hierarchy
```

**Option B — Local export**  
The directory at https://directory.int.net.nokia.com/ shows **per-person profile pages** (Name, Email, Business Title, Team, Responsible, etc.). It does **not** expose a single “all employees” API, so you cannot fetch everyone from that URL alone. To get hierarchy for many people:

1. Obtain a **bulk export** (JSON or CSV) from your org tool (NIMS, HR, or directory export if available) with at least: Email, Name, Business Title, Team, Responsible (manager name).
2. If the export is JSON with fields like `Email`, `Business Title`, `Team`, `Responsible`, the sync script will map them and resolve manager links:

```bash
node scripts/sync-hierarchy-from-directory.js --file path/to/directory-export.json
```

Output is written to `data/hierarchy.json` by default. Use `--out path/to/hierarchy.json` to override.

**Environment variables (optional):**

| Variable | Description |
|----------|-------------|
| `DIRECTORY_URL` | Full API URL for hierarchy/people endpoint |
| `DIRECTORY_USER` | Basic auth user (if required) |
| `DIRECTORY_PASSWORD` | Basic auth password or token |
| `DIRECTORY_INSECURE` | `true` to allow self-signed TLS (internal only) |

If the directory API response shape differs from the script’s default mapping, edit `mapDirectoryRecordToEmployee` in `scripts/sync-hierarchy-from-directory.js` to match your API (e.g. `displayName`, `mail`, `department`, `managerId`).

---

Each employee in `data/hierarchy.json` supports:

- `id` (unique employee identifier)
- `managerId` (who this person reports to)
- `jiraAssignee` (value used in Jira JQL filter)

Manager dashboard uses this hierarchy so each manager sees their own reportees (direct + indirect by default).

## Role-Based Login Mapping (Apply User)

When the user enters their email and clicks **Apply**, the backend fetches their profile from **Nokia Directory** ([https://directory.int.net.nokia.com/en/index.php](https://directory.int.net.nokia.com/en/index.php)) — **no local hierarchy file is required** for this:

1. Frontend sends user email to `/api/auth/context?email=...`.
2. Backend does **HTTP GET** to the directory URL with that email (e.g. `?mail=...`, `?search=...`) and parses the HTML or JSON response.
3. Backend returns `user` and `managerScope` (manager from “Responsible” field). Nothing is saved locally.
4. If the directory is unreachable or returns no profile, you get `source: "email_only"` (user from email only, no manager scope).

**No SQL** — We cannot run a SQL query against a web URL. The directory is a web app; we can only send **HTTP requests** (GET/POST). The directory must either (a) accept a URL with search params (e.g. `?mail=user@nokia.com`) and return the profile page, or (b) expose a separate API (e.g. JSON) that we can call. If it uses a **form with POST** or **different parameter names**, we need to use those (see “Find the real request” below).

Optional env: `DIRECTORY_URL`, `DIRECTORY_INSECURE=true` for self-signed TLS. **To avoid 302 redirect to login**, set directory credentials (if the directory supports HTTP Basic auth): `DIRECTORY_USER` (or `DIRECTORY_EMAIL`) and `DIRECTORY_PASSWORD`. The server will send them on every request to the directory.

**Find the real request (if directory still not used)**  
1. Open the directory in the browser: https://directory.int.net.nokia.com/en/index.php  
2. Open **DevTools → Network**.  
3. Search for a person (e.g. by email or name).  
4. See which **request** is sent: **URL** (path + query), **method** (GET or POST), **form body** if POST.  
5. Set `DIRECTORY_URL` to that URL’s base and, if the param name is different (e.g. `searchterm`, `q`), we can add it in `directoryClient.js` or you can ask for a small code change. If the directory uses **POST**, the client would need to be updated to POST with the right body.

**Why you might get `source: "email_only"` (directory not used)**  
The backend calls the directory with the user’s email (e.g. `GET DIRECTORY_URL?mail=user@nokia.com`). If that fails, you get auth context from the email only (no manager scope). Common causes:

| Cause | What to do |
|-------|------------|
| **Not on VPN** | The directory is internal; the machine running the server must be on Nokia VPN. |
| **TLS / self-signed cert** | Set `DIRECTORY_INSECURE=true` in `.env` (internal only). |
| **Wrong URL or params** | The directory might use a different path or query (e.g. `?search=`, `?uid=`). Set `DIRECTORY_URL` to the exact base URL and, if needed, adjust the client. |
| **Login required (302)** | The directory redirects to **Microsoft Azure AD** sign-in. You can use **Microsoft Graph** with credentials: set **AZURE_TENANT_ID**, **AZURE_CLIENT_ID**, **AZURE_CLIENT_SECRET** in `.env`. The app will get a token and fetch the user profile from Graph by email. The Azure app must have **Application permission User.Read.All** (admin consent). For Outlook calendar sync, add **Calendars.Read** (application permission). Tenant for Nokia from the login URL: `5d471751-9675-428d-917b-70f44f9630b0`. |
| **Firewall / proxy** | Server might not use the same proxy as the browser; configure Node to use your corporate proxy if required. |

**Debug**  
Run with `DIRECTORY_DEBUG=1` to log each directory request and response in the server console:

```bash
DIRECTORY_DEBUG=1 npm start
```

Then apply with an email and check the terminal for `[directory] GET ...`, `status`, and any `error` or `timeout`. That shows why the fetch failed.

You can also provide a server fallback identity via `DEFAULT_USER_EMAIL`.

For manager list and reportees (`/api/hierarchy/managers`, `/api/hierarchy/reports`, `/api/team/summary`), the app still uses `data/hierarchy.json` when available (e.g. for the manager dropdown and team scope). Auth context itself comes from the directory when the user applies.

## Raw Data Samples

Sample raw performance data is available in `data/teamRawData.json`.

Fields include:
- `attendancePct`
- `productivityPct`
- `utilizationPct`
- `completedTasks`
- `plannedTasks`

Manager KPI row now uses aggregated raw metrics from backend `rawMetrics` in `/api/team/summary`.

Frontend task/notes/performance state and selected view mode are saved in browser localStorage.

---

## System Design (HLD + LLD)

### 1. Overview

The dashboard is a **single-page web app** backed by a **Node.js API** that:

- Serves static UI and exposes REST APIs for hierarchy, auth context, Jira, and raw metrics.
- **Scopes all team data by manager** on the server (hierarchy + Jira + raw) so the client never sees other teams’ data.
- Degrades gracefully when Jira is unconfigured or unavailable.

**External dependencies:** Jira REST API (optional), local JSON files (hierarchy, dashboard config, raw metrics).

---

### 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Browser (SPA)                                                               │
│  public/app.js  →  state, events, renderers, fetch(/api/...)                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ HTTP
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Node server (src/server.js)                                                 │
│  • Static: / → public/*   • API: /api/* → orchestration                      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ hierarchyStore.js   │   │ jiraClient.js       │   │ rawDataStore.js     │
│ • managers list     │   │ • fetch + normalize │   │ • read raw JSON     │
│ • reports (BFS)     │   │ • summary (KPI)     │   │ • aggregate by scope │
│ • email → scope     │   │                     │   │                     │
└──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
           │                          │                         │
           ▼                          ▼                         ▼
   data/hierarchy.json         Jira REST API            data/teamRawData.json
```

**Data flow (manager mode):** User picks manager or email → frontend calls `/api/team/summary?managerId=...` → server gets scoped employee IDs from hierarchy → server calls Jira (filtered by those assignees) and rawDataStore (filtered by same IDs) → server merges Jira summary + rawMetrics → frontend renders KPIs.

---

### 3. HLD — Key User Flows

| Flow | Steps |
|------|--------|
| **App load** | UI loads config + manager list + optional `/api/auth/context?email=...`. Personal widgets (tasks, notes, links) render immediately. |
| **Manager mode** | User enters email or selects manager → UI calls `/api/team/summary?managerId=...` → server resolves reportees (direct + optional indirect), fetches Jira for those assignees, aggregates raw metrics for same IDs, returns merged summary. |
| **Team KPI display** | Frontend renders completion, attendance, productivity, overdue, risk count from `summary` + `rawMetrics`. |

---

### 4. HLD — Component Responsibilities

| Layer | Component | Responsibility |
|-------|-----------|-----------------|
| Frontend | `public/app.js` | State, event wiring, renderers, API calls (no business logic). |
| API | `src/server.js` | Routing, static hosting, orchestration: hierarchy scope → Jira + raw aggregation. |
| Domain | `src/hierarchyStore.js` | Load/parse hierarchy; list managers; reportee traversal (BFS); resolve email → manager scope. |
| Domain | `src/jiraClient.js` | Jira HTTP fetch, normalize response, compute summary (totals, workload, risk, trend). |
| Domain | `src/rawDataStore.js` | Load raw records, filter by scoped employee IDs, aggregate (e.g. averages, execution rate). |
| Data | `data/*.json` | Configurable sources: hierarchy, dashboard defaults, raw team metrics (demo/test). |

---

### 5. LLD — Data Model

| Entity | Purpose | Key fields |
|--------|---------|------------|
| **Employee (hierarchy)** | Org structure and Jira mapping | `id`, `managerId`, `name`, `email`, `role`, `level`, `title`, `orgUnit`, `jiraAssignee` |
| **Raw team record** | Per-person performance inputs | `employeeId`, `attendancePct`, `productivityPct`, `utilizationPct`, `completedTasks`, `plannedTasks` |

---

### 6. LLD — API Contracts

| Method | Endpoint | Returns |
|--------|----------|---------|
| GET | `/api/hierarchy/managers` | Manager list: `id`, `name`, `email`, `role`, `level`, `title`, `orgUnit`. |
| GET | `/api/auth/context?email=<userEmail>` | `user`, `managerScope` (managerId, managerName, managerLevel, managerTitle, …). |
| GET | `/api/hierarchy/reports?managerId=<id>&includeIndirect=true` | `manager`, `reportees[]`, `reporteeCount`. |
| GET | `/api/team/summary?managerId=<id>` | Jira summary + `managerScope` + `rawMetrics` (attendance, productivity, utilization, executionRate, sampleSize). |
| GET | `/api/raw/team-data?managerId=<id>` | Aggregated raw metrics only (same scope rules). |

---

### 7. LLD — Core Algorithms

| Algorithm | Description |
|-----------|-------------|
| **Reportee traversal** | BFS from manager node using `managerId` adjacency; optional `includeIndirect` for full subtree. |
| **Scope resolution (email → manager)** | Find user by normalized email; if `role === 'manager'` → self as scope; else walk `managerId` chain upward until a manager node. |
| **Raw metric aggregation** | Filter records by scoped `employeeId`; compute averages for percentages; execution rate = completed / planned (with safeguards). |

---

### 8. Error Handling

| Scenario | Backend | Frontend |
|----------|---------|----------|
| Jira not configured | Return `configured: false` + message; no Jira data in summary. | UI stays usable; show message per card/section. |
| Invalid manager ID | 404 from hierarchy / team endpoints. | Human-readable status. |
| Jira/network failure | 502 with safe fallback payload (e.g. empty summary). | Same; no crash. |

---

### 9. Security and Reliability

- **Secrets:** `.env` only; no hardcoded Jira credentials.
- **Inputs:** URL/query parsing; no raw user input in file paths.
- **Static serving:** Path traversal guarded (e.g. restrict to `public/`).
- **Production:** Add JWT auth and role checks for `/api/*`.

---

### 10. Scalability Roadmap / 10k Employees (No Local File)

**You don’t have to put 10k employees in a local file.**

- **Apply user (auth context):** Use **Microsoft Graph** on demand. Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`; give the app **User.Read.All**. When someone applies with their email, the server calls Graph to fetch that one user (and manager) by email. No local hierarchy file needed for this.
- **Manager list / reportees:** For 10k, either (1) keep a **small** local list (e.g. only manager IDs/names for the dropdown) and get reportees from Graph when a manager is selected, or (2) add an internal **directory/HR API** or **PostgreSQL** that your team exposes; the app would call that instead of reading a big JSON file.
- **Optional later:** Replace JSON with **PostgreSQL** for hierarchy and raw metrics; **Redis** cache for Jira; **observability** (logs, metrics).

---

### 11. Automation ideas (weekly summary – less manual input)

Employees currently type their weekly summary. To **reduce manual work** and **automate** parts of it:

| Idea | What it does | How |
|------|----------------|-----|
| **Suggest from Jira** *(in app)* | Pre-fill the summary with “This week I worked on: PROJ-123, PROJ-456…” from their assigned Jira issues. | Use the **“Suggest from Jira”** button on the Weekly Summary card (loads from the existing Jira widget). |
| **Friday reminder** | Nudge employees who haven’t submitted by Friday. | Cron/Task Scheduler runs a script that reads `data/weeklySummaries.json` + hierarchy, finds reportees with no submission for current week, sends reminder email (SMTP) or posts to Slack/Teams. |
| **Template** | Give a fixed structure so they only fill bullets. | Pre-fill textarea with “Key deliverables:\nBlockers:\nNext week:\n” (or store template in dashboard config). |
| **Calendar / Git** | Add “Meetings” or “Commits” to the summary. | Script or API that pulls calendar events or git activity for the week and appends to the suggestion (needs Calendar API or GitLab/GitHub API). |
| **One-line mode** | Shorter submission. | Optional “Quick summary” field (one line) in addition to or instead of the long text. |

**Implemented:** **Suggest from Jira** – on the employee Weekly Summary card, click **Suggest from Jira** to append their current Jira issues to the text; they can edit and submit.

---

### 12. Automation ideas (whole project – less manual work)

Ideas to **automate or reduce manual input**, split by **Employee** and **Manager**.

---

#### Employee (employer)

| Area | Manual today | Automate by |
|------|----------------|-------------|
| **Login** | Enters email, clicks Sign in. | **SSO** (Azure AD/Okta) so identity comes from session; or **remember last user** and pre-fill email. |
| **Today’s tasks** | Checks boxes; list from config. | **Sync from Jira:** “My open Jira issues” as tasks (read-only or map checkbox to status). **Templates:** Weekly repeating tasks from config. |
| **Notes** | Types in Notes box. | **Sync from OneNote/Notion**; **suggest from calendar** (“Meetings today: …”); paste/voice. |
| **Calendar** | Clicks day, types note. | **Sync Outlook/Google** – show real events; “Add day note from today’s meetings”. |
| **Jira** | Already server-driven. | **Auto-refresh** every N min when tab is open; **JQL** like “updated this week” so list is relevant. |
| **Performance** | Enters attendance %, engagement %, hours. | **Pull from HR / time-tracking** (Tempo, Harvest); or **defaults by role** from config. |
| **Weekly summary** | Types (or uses “Suggest from Jira”). | **Suggest from Jira** *(done)*. **Template** (Key deliverables / Blockers / Next week). **Friday reminder** (cron + email/Slack). **Calendar/Git** in suggestion. |
| **Quick links** | Static from config. | **Per role/department**; or **recently used** links. |

**Employee quick wins:** Remember last user • Tasks from Jira • Weekly summary template • Auto-refresh Jira.

**Employee larger:** SSO • Calendar sync • HR/time-tracking feed • Friday reminder job.

---

#### Manager

| Area | Manual today | Automate by |
|------|----------------|-------------|
| **Login** | Enter email, click Sign in. | **SSO** (Azure AD/Okta) so user is known from session; or **remember last user** and pre-fill email. |
| **Manager scope** | Pick manager (or self) from dropdown to see team. | **Auto-detect:** If user is manager (from role/title), default scope to self so they see their team without picking. |
| **Team summary** | Click “Refresh Team” to load Jira + KPIs for reportees. | **Auto-refresh** (e.g. every 5–10 min) when in manager view; or **refresh on tab focus**. |
| **Weekly summaries** | Click “Weekly summaries”, open popup, see who submitted. | **Badge** on button (e.g. “5/25 submitted”); **optional email digest** – one email per week with who submitted + link to app. |
| **Risk / workload** | Scan cards after refresh for overdue, blocked. | **Auto-refresh** with team summary; **alerts** (e.g. “3 overdue”, “2 blocked”) in badge or banner. |
| **Reminders** | Manually chase who didn’t submit. | **One-click “Send reminder”** to non-submitters (email or Slack from backend); or **Friday cron** that emails/Slacks list of non-submitters to manager. |
| **Roll-up / report** | Read each reportee’s summary in popup. | **Roll-up summary** – one paragraph “team week” from reportees’ summaries; or **export** “Download team week” (who submitted + key points). |
| **Quick links** | Static from config. | Same as employee: **per role/department**; or **recently used** links. |

**Manager quick wins:** Auto-refresh team summary when in manager view • Badge on “Weekly summaries” (e.g. “12 submitted”) • Remember last user / SSO.

**Manager larger:** Weekly email digest (who submitted + link) • One-click or cron reminders to non-submitters • Optional Slack/Teams notification when reportees submit.

---

#### Implemented automation (from tables above)

**Employee:** Remember last user (login email pre-filled from localStorage) • **Jira auto-refresh** every 5 min when Personal view is active • Tasks from Jira (set `useJiraAsTasks: true` in `data/dashboard.json`) • Weekly summary template (pre-fill + “Use template” button) • Performance defaults by role • Quick links: per-role and recently used.

**Manager:** Auto-detect scope • **Team summary auto-refresh** every 10 min in Manager view • **Refresh on tab focus** (Jira when Personal, team when Manager) • Badge on “Weekly summaries” (e.g. “5/25”) • “Who hasn’t submitted” • Roll-up summary • Export team week as JSON • Friday reminder script: `node scripts/friday-reminder.js`.

**Not implemented (need external APIs or services):**

| Area | In table | Status |
|------|----------|--------|
| **Calendar async** | Sync Outlook/Google – show real events; day note from meetings | **Outlook/Microsoft 365 done.** Uses Azure Graph Calendars.Read (app permission). Calendar shows real events per day (badge + tooltip); day modal has "Add from meetings" to append that day's events to the note. Teams meetings are detected and include join links in appended notes. Google Calendar not implemented. |
| **Notes async** | Sync OneNote/Notion; suggest from calendar | **Suggest from calendar done.** Notes card has "Suggest from calendar" to append today's meetings to the textarea. OneNote/Notion sync not implemented. |
| SSO | Azure AD/Okta | Not in code; deploy behind IdP. |
| HR / time-tracking | Tempo, Harvest, defaults by role | Defaults by role done; pull from Tempo/Harvest not in code. |
| Email/Slack | Friday reminder, digest, “Send reminder” | Friday script outputs JSON only; no nodemailer/Slack in repo. |

So: **auto-refresh (Jira + team + tab focus) is done.** **Calendar (Outlook/Microsoft 365)** and **notes "suggest from calendar"** are implemented; Google Calendar and OneNote/Notion sync would require additional integrations.

---

#### More ideas (feature & UX)

**Employee**

- **Focus list:** Pin 3–5 “today’s focus” items (from tasks or Jira) at the top; persist per day.
- **Streak / habits:** Simple “submitted summary N weeks in a row” or “logged attendance N days” badge.
- **Export:** “Download my week” (tasks + notes + summary) as PDF or markdown.
- **Dark mode:** Toggle or follow system preference.
- **Keyboard shortcuts:** e.g. `N` for new note, `T` for today, `J` for Jira panel.
- **Jira deep links:** Click issue → open in Jira in same or new tab (if not already).
- **Time zone:** Show “your local time” for deadlines or calendar if you add time-based features.
- **Calendar week view:** Toggle month ↔ week so the calendar shows one week with time slots (e.g. 8–18) and event blocks.
- **Recurring day notes:** “Copy last Monday’s note” or “Same as last week” for stand-up-style day notes.
- **Notes templates:** Dropdown or snippets (e.g. “Blockers:”, “Done today:”, “Tomorrow:”) to paste into Notes.
- **Task estimates:** Optional “estimated hours” or “priority” (P1–P3) per task; show total estimated time for the day.
- **Quick today:** One click to open today’s calendar note and focus the notes box (for morning ritual).
- **Summary from calendar:** “Suggest from calendar” for the weekly summary (e.g. “Meetings this week: …”) not just Notes.
- **Jira status in list:** Show status (To Do / In Progress / Done) or assignee next to each Jira issue in the task list.
- **Personal KPIs history:** Simple chart or table of “my attendance % / engagement %” over the last 4–8 weeks.

**Manager**

- **Filters:** Filter team view by “submitted / not submitted this week”, “has overdue”, or by org unit.
- **Sort:** Sort reportees by name, overdue count, last summary date, or KPI.
- **One-click feedback:** “Send reminder” to non-submitters (triggers email or Slack from backend).
- **Roll-up summary:** One paragraph “team week” generated from reportees’ summaries (e.g. bullet merge or AI summarization if you add it).
- **Drill-down:** Click a reportee → see their Jira issues, last summary, and KPIs on a detail page or slide-out.
- **Export:** “Download team week” (who submitted + key points) for leadership or records.
- **Comparison:** Simple “this week vs last week” for team KPIs (e.g. completion %, overdue count).
- **Team calendar overlay:** Optional view “team meetings this week” (e.g. from each reportee’s calendar if Graph is extended).
- **Risk flags:** Auto-flag “no summary 2 weeks”, “all overdue”, “attendance below X%” with a small icon or badge on the card.
- **Bulk actions:** “Send reminder to all non-submitters” or “Export only those who haven’t submitted”.
- **Summary search:** Search across all reportees’ weekly summary text (e.g. by keyword or “blocker”).
- **Approval / acknowledgment:** Optional “Mark as read” or “Acknowledged” on a reportee’s summary (with timestamp).
- **Team goals vs actual:** Section to define “team goals this week” and compare to roll-up or completion metrics.
- **Manager notes:** Private note per reportee (e.g. “Follow up on X”) stored per week, not visible to reportee.

**Both / platform**

- **Mobile-friendly:** Responsive layout or a “compact” view so the dashboard works on phones.
- **Offline:** Cache last-loaded data; show “cached” badge and refresh when back online.
- **Notifications:** Browser push or in-app bell for “summary due”, “manager viewed your summary”, or “new team summary”.
- **Audit log:** Optional log of who viewed which summary (for compliance or transparency).
- **Search:** Global search across notes, day notes, weekly summary, and (for managers) reportee summaries.
- **Favorites / pins:** Pin specific quick links or Jira issues to the top of their sections.
- **Custom sections:** Let admin or user add a “custom card” (e.g. iframe, link list, or simple HTML) from config.
- **Accessibility:** Full keyboard nav, screen-reader labels, reduced-motion option, and WCAG contrast checks.
- **i18n:** Language toggle (e.g. EN / FI) for UI strings and date formats.
- **Dashboard layouts:** Save or choose layout (e.g. “wide calendar”, “minimal”, “focus on Jira”) per user.
- **Integrations hub:** Single “Integrations” page: status of Jira, Calendar, (future) OneNote/Notion, and “Connect” buttons.
- **Health check:** Status page or footer “Last Jira sync: 2 min ago; Calendar: OK” for debugging.

---

### 13. Local Runbook

`npm start` → open `http://127.0.0.1:3000` (or configured `PORT`).

---

### 14. Interview Talking Points

- **Backend scoping:** Hierarchy and team data scoped on server → security and consistency; client cannot override scope.
- **JSON vs DB:** JSON is simple for demo; DB required for scale and multi-instance.
- **Separation of concerns:** Stores/clients vs server orchestration vs frontend renderers.
- **Graceful degradation:** Jira optional; UI remains functional with `configured: false`.
- **Extensibility:** Same API contract with different backends (teams, roles, auth providers).
