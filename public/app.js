const STORAGE_KEYS = {
  tasks: "dashboard.tasks",
  notes: "dashboard.notes",
  performance: "dashboard.performance",
  viewMode: "dashboard.viewMode",
  managerId: "dashboard.managerId",
  userEmail: "dashboard.userEmail",
  loggedIn: "dashboard.loggedIn",
  role: "dashboard.role",
  calendarNotes: "dashboard.calendarNotes",
  recentLinkUrls: "dashboard.recentLinkUrls",
  theme: "dashboard.theme",
  helpRequests: "dashboard.helpRequests"
};

const JIRA_AUTO_REFRESH_MS = 5 * 60 * 1000;
const TEAM_AUTO_REFRESH_MS = 10 * 60 * 1000;
const RECENT_LINKS_MAX = 5;
const REMOVED_DEFAULT_TASK_TITLES = new Set([
  "Review updates in Nokia Central",
  "Check open merge requests in NFMT GitLab",
  "Complete required Nokia Learn items",
  "Validate key Oracle FSCM tasks"
]);
let jiraRefreshTimer = null;
let teamRefreshTimer = null;

const todayDate = document.getElementById("todayDate");
const quickLinksEl = document.getElementById("quickLinks");
const taskList = document.getElementById("taskList");
const taskProgress = document.getElementById("taskProgress");
const resetTasksBtn = document.getElementById("resetTasksBtn");
const notesEl = document.getElementById("notes");
const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");

const jiraList = document.getElementById("jiraList");
const jiraStatus = document.getElementById("jiraStatus");
const refreshJiraBtn = document.getElementById("refreshJiraBtn");
const focusList = document.getElementById("focusList");
const sprintDaysLeftChip = document.getElementById("sprintDaysLeftChip");
const sprintWindowRangeText = document.getElementById("sprintWindowRangeText");
const sprintWindowStatusText = document.getElementById("sprintWindowStatusText");
const sprintProgressFill = document.getElementById("sprintProgressFill");
const sprintProgressText = document.getElementById("sprintProgressText");
const sprintWindowUpdatedText = document.getElementById("sprintWindowUpdatedText");
const sprintStartInput = document.getElementById("sprintStartInput");
const sprintEndInput = document.getElementById("sprintEndInput");
const sprintSaveBtn = document.getElementById("sprintSaveBtn");
const sprintManagerStatus = document.getElementById("sprintManagerStatus");
const streakBadgesStatus = document.getElementById("streakBadgesStatus");
const streakBadgesList = document.getElementById("streakBadgesList");

const perfScoreChip = document.getElementById("perfScoreChip");
const kpiProductivity = document.getElementById("kpiProductivity");
const kpiAttendance = document.getElementById("kpiAttendance");
const kpiCompletion = document.getElementById("kpiCompletion");
const kpiEngagement = document.getElementById("kpiEngagement");
const kpiUtilization = document.getElementById("kpiUtilization");
const kpiTracked = document.getElementById("kpiTracked");
const trendBars = document.getElementById("trendBars");
const inputAttendance = document.getElementById("inputAttendance");
const inputEngagement = document.getElementById("inputEngagement");
const inputTrackedHours = document.getElementById("inputTrackedHours");
const inputPlannedHours = document.getElementById("inputPlannedHours");
const savePerfBtn = document.getElementById("savePerfBtn");
const alertList = document.getElementById("alertList");

const personalModeBtn = document.getElementById("personalModeBtn");
const managerModeBtn = document.getElementById("managerModeBtn");

const teamStatus = document.getElementById("teamStatus");
const authStatus = document.getElementById("authStatus");
const userEmailInput = document.getElementById("userEmailInput");
const applyUserBtn = document.getElementById("applyUserBtn");
const managerSelect = document.getElementById("managerSelect");
const refreshTeamBtn = document.getElementById("refreshTeamBtn");
const viewToggle = document.getElementById("viewToggle");
const userBadge = document.getElementById("userBadge");
const logoutBtn = document.getElementById("logoutBtn");
const teamOpenCount = document.getElementById("teamOpenCount");
const teamBugCount = document.getElementById("teamBugCount");
const teamInProgressCount = document.getElementById("teamInProgressCount");
const teamBlockedCount = document.getElementById("teamBlockedCount");
const teamOverdueCount = document.getElementById("teamOverdueCount");
const teamDoneCount = document.getElementById("teamDoneCount");
const teamCompletionRate = document.getElementById("teamCompletionRate");
const teamOpenedWeek = document.getElementById("teamOpenedWeek");
const teamClosedWeek = document.getElementById("teamClosedWeek");
const teamOpenedMonth = document.getElementById("teamOpenedMonth");
const teamClosedMonth = document.getElementById("teamClosedMonth");
const teamHealthScore = document.getElementById("teamHealthScore");
const teamBurnoutFlags = document.getElementById("teamBurnoutFlags");
const aging0to3 = document.getElementById("aging0to3");
const aging4to7 = document.getElementById("aging4to7");
const aging8to14 = document.getElementById("aging8to14");
const aging15plus = document.getElementById("aging15plus");
const unplannedWorkPct = document.getElementById("unplannedWorkPct");
const blockedChainsCount = document.getElementById("blockedChainsCount");
const milestoneWarningsCount = document.getElementById("milestoneWarningsCount");
const attritionRiskCount = document.getElementById("attritionRiskCount");
const teamInsightsList = document.getElementById("teamInsightsList");
const managerCompletionKpi = document.getElementById("managerCompletionKpi");
const managerAttendanceKpi = document.getElementById("managerAttendanceKpi");
const managerProductivityKpi = document.getElementById("managerProductivityKpi");
const managerOverdueKpi = document.getElementById("managerOverdueKpi");
const managerRiskCountKpi = document.getElementById("managerRiskCountKpi");
const teamWorkloadList = document.getElementById("teamWorkloadList");
const teamRiskList = document.getElementById("teamRiskList");
const teamTrendBars = document.getElementById("teamTrendBars");
const helpType = document.getElementById("helpType");
const helpImpact = document.getElementById("helpImpact");
const helpOwner = document.getElementById("helpOwner");
const helpSince = document.getElementById("helpSince");
const helpDetails = document.getElementById("helpDetails");
const helpSubmitBtn = document.getElementById("helpSubmitBtn");
const helpStatus = document.getElementById("helpStatus");
const helpRequestsList = document.getElementById("helpRequestsList");
const managerBlockersList = document.getElementById("managerBlockersList");
const managerBlockersStatus = document.getElementById("managerBlockersStatus");
const refreshManagerBlockersBtn = document.getElementById("refreshManagerBlockersBtn");
const weeklySummaryWeekLabel = document.getElementById("weeklySummaryWeekLabel");
const weeklySummaryText = document.getElementById("weeklySummaryText");
const weeklySummarySubmitBtn = document.getElementById("weeklySummarySubmitBtn");
const weeklySummarySuggestJiraBtn = document.getElementById("weeklySummarySuggestJiraBtn");
const weeklySummaryStatus = document.getElementById("weeklySummaryStatus");
const weeklySummariesWeekLabel = document.getElementById("weeklySummariesWeekLabel");
const weeklySummariesList = document.getElementById("weeklySummariesList");
const weeklySummariesStatus = document.getElementById("weeklySummariesStatus");
const weeklySummariesPrevWeek = document.getElementById("weeklySummariesPrevWeek");
const weeklySummariesNextWeek = document.getElementById("weeklySummariesNextWeek");
const weeklySummariesRefreshBtn = document.getElementById("weeklySummariesRefreshBtn");
const weeklySummariesOpenBtn = document.getElementById("weeklySummariesOpenBtn");
const weeklySummariesModal = document.getElementById("weeklySummariesModal");
const weeklySummariesModalClose = document.getElementById("weeklySummariesModalClose");

const fallbackConfig = {
  quickLinks: [
    { label: "Nokia Central", url: "https://nokia.sharepoint.com/sites/Nokia_Central" },
    { label: "NFMT GitLab", url: "https://bhgitlab.ext.net.nokia.com/NFMT" },
    { label: "Nokia Learn", url: "https://nokialearn.csod.com/client/nokialearn/default.aspx?ReturnUrl=https%3a%2f%2fnokialearn.csod.com%2fui%2flms-learner-home%2fhome%3ftab_page_id%3d-200300006%26tab_id%3d221000375" },
    { label: "Oracle FSCM", url: "https://fa-evmr-saasfaprod1.fa.ocs.oraclecloud.com/fscmUI/faces/FuseWelcome?_adf.ctrl-state=o13a25by4_114&_afrLoop=53903620890656156&_afrWindowMode=0&_afrWindowId=null&_afrFS=16&_afrMT=screen&_afrMFW=1413&_afrMFH=704&_afrMFDW=1280&_afrMFDH=800&_afrMFC=8&_afrMFCI=0&_afrMFM=0&_afrMFR=129&_afrMFG=0&_afrMFS=0&_afrMFO=0" }
  ],
  defaultTasks: []
};

let appConfig = fallbackConfig;
let tasks = [];
let jiraIssues = [];
let teamSummary = null;
let teamRawMetrics = null;
let viewMode = "personal";
let managers = [];
let selectedManagerId = "";
let userEmail = "";
let resolvedManagerFromAuth = false;

let performanceState = {
  attendance: 96,
  engagement: 82,
  trackedHours: 6.5,
  plannedHours: 8,
  trend: [68, 71, 74, 72, 76, 79, 81]
};

let calendarNotes = {};
let calendarEventsByDate = {};
let calendarViewYear = new Date().getFullYear();
let calendarViewMonth = new Date().getMonth();
let currentCalendarModalDateKey = "";
let weeklySummariesWeekKey = "";
let helpRequests = [];
let managerHelpRequests = [];

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dayNum = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

function formatWeekLabel(weekKey) {
  const [y, m, d] = weekKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ─── In-app Notification System ───────────────────────────────────────────────

let notifPollInterval = null;
let notifDropdownOpen = false;

function getNotifTypeIcon(type) {
  if (type === "rollup") return "📋";
  if (type === "rollup-missing") return "⚠️";
  if (type === "rollup-sent") return "✅";
  return "🔔";
}

function renderNotifications(notifications) {
  const list = document.getElementById("notifList");
  if (!list) return;
  list.innerHTML = "";
  if (!notifications || notifications.length === 0) {
    const empty = document.createElement("p");
    empty.className = "notif-empty muted";
    empty.textContent = "No notifications.";
    list.appendChild(empty);
    return;
  }
  notifications.forEach((n) => {
    const item = document.createElement("div");
    item.className = "notif-item" + (n.readAt ? " notif-item-read" : " notif-item-unread");
    item.setAttribute("data-notif-id", n.id);

    const icon = document.createElement("span");
    icon.className = "notif-icon";
    icon.textContent = getNotifTypeIcon(n.type);

    const body = document.createElement("div");
    body.className = "notif-body";

    const title = document.createElement("div");
    title.className = "notif-title";
    title.textContent = n.title;

    const msg = document.createElement("div");
    msg.className = "notif-msg";
    msg.textContent = n.message;

    const meta = document.createElement("div");
    meta.className = "notif-meta";
    meta.textContent = n.createdAt ? new Date(n.createdAt).toLocaleString() : "";

    body.appendChild(title);
    body.appendChild(msg);
    body.appendChild(meta);
    item.appendChild(icon);
    item.appendChild(body);
    list.appendChild(item);
  });
}

async function fetchNotifications() {
  if (!userEmail) return;
  try {
    const response = await fetch("/api/notifications?userEmail=" + encodeURIComponent(userEmail), {
      cache: "no-store"
    });
    if (!response.ok) return;
    const data = await response.json();
    const badge = document.getElementById("notifBadge");
    const count = data.unreadCount || 0;
    if (badge) {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.classList.toggle("hidden", count === 0);
    }
    if (notifDropdownOpen) {
      const unreadResponse = await fetch(
        "/api/notifications?userEmail=" + encodeURIComponent(userEmail) + "&unreadOnly=true",
        { cache: "no-store" }
      );
      if (unreadResponse.ok) {
        const unreadData = await unreadResponse.json();
        renderNotifications(unreadData.notifications || []);
      }
    }
  } catch (_) {}
}

async function markAllNotificationsRead() {
  if (!userEmail) return false;
  try {
    const response = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail })
    });
    if (!response.ok) return false;
    const badge = document.getElementById("notifBadge");
    if (badge) {
      badge.textContent = "0";
      badge.classList.add("hidden");
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function openNotifDropdown() {
  const dropdown = document.getElementById("notifDropdown");
  if (!dropdown) return;
  notifDropdownOpen = true;
  dropdown.classList.remove("hidden");
  // Load and render
  if (!userEmail) return;
  try {
    const response = await fetch(
      "/api/notifications?userEmail=" + encodeURIComponent(userEmail) + "&unreadOnly=true",
      {
      cache: "no-store"
      }
    );
    if (!response.ok) return;
    const data = await response.json();
    renderNotifications(data.notifications || []);
  } catch (_) {}
}

function closeNotifDropdown() {
  const dropdown = document.getElementById("notifDropdown");
  if (dropdown) dropdown.classList.add("hidden");
  notifDropdownOpen = false;
}

function wireNotifications() {
  const bellBtn = document.getElementById("notifBellBtn");
  const closeBtn = document.getElementById("notifCloseBtn");
  const markAllBtn = document.getElementById("notifMarkAllReadBtn");

  if (bellBtn) {
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (notifDropdownOpen) {
        closeNotifDropdown();
      } else {
        openNotifDropdown();
      }
    });
  }
  if (closeBtn) closeBtn.addEventListener("click", closeNotifDropdown);
  if (markAllBtn) {
    markAllBtn.addEventListener("click", async () => {
      markAllBtn.disabled = true;
      const ok = await markAllNotificationsRead();
      await fetchNotifications();
      // Refresh list to reflect read state immediately.
      if (notifDropdownOpen) {
        const response = await fetch(
          "/api/notifications?userEmail=" + encodeURIComponent(userEmail) + "&unreadOnly=true",
          {
          cache: "no-store"
          }
        );
        if (response.ok) {
          const data = await response.json();
          renderNotifications(data.notifications || []);
        }
      }
      if (!ok) {
        const list = document.getElementById("notifList");
        if (list) {
          const msg = document.createElement("p");
          msg.className = "notif-empty muted";
          msg.textContent = "Could not mark notifications as read. Please retry.";
          list.prepend(msg);
        }
      }
      markAllBtn.disabled = false;
    });
  }
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!notifDropdownOpen) return;
    const dropdown = document.getElementById("notifDropdown");
    const bell = document.getElementById("notifBellBtn");
    if (dropdown && !dropdown.contains(e.target) && bell && !bell.contains(e.target)) {
      closeNotifDropdown();
    }
  });
  // Poll every 30 seconds
  notifPollInterval = setInterval(fetchNotifications, 30000);
}
// ──────────────────────────────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return fallback;
  }
}

function saveState(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getCalendarNotesStorageKey(email = userEmail) {
  const normalized = String(email || "").trim().toLowerCase();
  return normalized
    ? `${STORAGE_KEYS.calendarNotes}.${normalized}`
    : STORAGE_KEYS.calendarNotes;
}

function loadCalendarNotesState(email = userEmail) {
  const loaded = loadState(getCalendarNotesStorageKey(email), {});
  return typeof loaded === "object" && loaded !== null ? loaded : {};
}

function saveCalendarNotesState(email = userEmail) {
  saveState(getCalendarNotesStorageKey(email), calendarNotes);
}

function renderDate() {
  if (!todayDate) return;
  var d = new Date();
  todayDate.textContent = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  todayDate.title = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderSprintWindow(payload) {
  const startDate = String(payload?.startDate || "");
  const endDate = String(payload?.endDate || "");
  const daysLeft = Number.isFinite(payload?.daysLeft) ? Number(payload.daysLeft) : null;
  const updatedAt = String(payload?.updatedAt || "");
  const updatedBy = String(payload?.updatedBy || "");

  const setSprintChipState = (state, text) => {
    if (!sprintDaysLeftChip) return;
    sprintDaysLeftChip.textContent = text;
    sprintDaysLeftChip.classList.remove("sprint-chip-live", "sprint-chip-soon", "sprint-chip-ended", "sprint-chip-neutral");
    if (state === "live") sprintDaysLeftChip.classList.add("sprint-chip-live");
    else if (state === "soon") sprintDaysLeftChip.classList.add("sprint-chip-soon");
    else if (state === "ended") sprintDaysLeftChip.classList.add("sprint-chip-ended");
    else sprintDaysLeftChip.classList.add("sprint-chip-neutral");
  };

  if (sprintStartInput) sprintStartInput.value = startDate;
  if (sprintEndInput) sprintEndInput.value = endDate;

  if (!startDate || !endDate) {
    setSprintChipState("neutral", "Not Set");
    if (sprintWindowRangeText) sprintWindowRangeText.textContent = "Sprint dates are not configured yet.";
    if (sprintWindowStatusText) sprintWindowStatusText.textContent = "Manager can set sprint start and end dates.";
    if (sprintProgressFill) sprintProgressFill.style.width = "0%";
    if (sprintProgressText) sprintProgressText.textContent = "0% timeline elapsed";
    if (sprintWindowUpdatedText) sprintWindowUpdatedText.textContent = "";
    return;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const now = new Date();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const progressPct = totalMs > 0 ? clamp(Math.round((elapsedMs / totalMs) * 100), 0, 100) : 0;

  if (sprintWindowRangeText) {
    sprintWindowRangeText.textContent = `Sprint: ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`;
  }
  if (daysLeft === null) {
    setSprintChipState("neutral", "Invalid Date");
    if (sprintWindowStatusText) sprintWindowStatusText.textContent = "Could not calculate days left.";
    if (sprintProgressFill) sprintProgressFill.style.width = "0%";
    if (sprintProgressText) sprintProgressText.textContent = "0% timeline elapsed";
    if (sprintWindowUpdatedText) sprintWindowUpdatedText.textContent = "";
    return;
  }
  if (now < start) {
    const msUntilStart = start.getTime() - now.getTime();
    const daysUntilStart = Math.max(0, Math.ceil(msUntilStart / (24 * 60 * 60 * 1000)));
    setSprintChipState("soon", `Starts in ${daysUntilStart} day(s)`);
    if (sprintWindowStatusText) sprintWindowStatusText.textContent = "Sprint is upcoming.";
    if (sprintProgressFill) sprintProgressFill.style.width = "0%";
    if (sprintProgressText) sprintProgressText.textContent = "0% timeline elapsed";
  } else if (daysLeft > 0) {
    setSprintChipState("live", `${daysLeft} day(s) left`);
    if (sprintWindowStatusText) sprintWindowStatusText.textContent = "Sprint is in progress.";
    if (sprintProgressFill) sprintProgressFill.style.width = `${progressPct}%`;
    if (sprintProgressText) sprintProgressText.textContent = `${progressPct}% timeline elapsed`;
  } else {
    setSprintChipState("ended", "Ended");
    if (sprintWindowStatusText) sprintWindowStatusText.textContent = "Sprint end date reached.";
    if (sprintProgressFill) sprintProgressFill.style.width = "100%";
    if (sprintProgressText) sprintProgressText.textContent = "100% timeline elapsed";
  }

  if (sprintWindowUpdatedText) {
    if (updatedAt) {
      const by = updatedBy ? ` by ${updatedBy}` : "";
      sprintWindowUpdatedText.textContent = `Last updated ${new Date(updatedAt).toLocaleString()}${by}`;
    } else {
      sprintWindowUpdatedText.textContent = "";
    }
  }
}

async function loadSprintWindow() {
  try {
    const response = await fetch("/api/sprint-window", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      if (sprintWindowStatusText) sprintWindowStatusText.textContent = data.message || "Could not load sprint dates.";
      return;
    }
    renderSprintWindow(data);
  } catch {
    if (sprintWindowStatusText) sprintWindowStatusText.textContent = "Could not load sprint dates.";
  }
}

async function saveSprintWindow() {
  if (!sprintSaveBtn) return;
  const startDate = String(sprintStartInput?.value || "").trim();
  const endDate = String(sprintEndInput?.value || "").trim();
  if (!startDate || !endDate) {
    if (sprintManagerStatus) sprintManagerStatus.textContent = "Please set both start and end dates.";
    return;
  }

  sprintSaveBtn.disabled = true;
  if (sprintManagerStatus) sprintManagerStatus.textContent = "Saving sprint dates...";
  try {
    const response = await fetch("/api/sprint-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorEmail: userEmail,
        startDate,
        endDate
      })
    });
    const data = await response.json();
    if (!response.ok) {
      if (sprintManagerStatus) sprintManagerStatus.textContent = data.message || "Could not save sprint dates.";
      sprintSaveBtn.disabled = false;
      return;
    }

    renderSprintWindow(data);
    if (sprintManagerStatus) sprintManagerStatus.textContent = "Sprint dates saved.";
  } catch {
    if (sprintManagerStatus) sprintManagerStatus.textContent = "Could not save sprint dates.";
  }
  sprintSaveBtn.disabled = false;
}

function getInitials(label) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getQuickLinksForRole() {
  const role = (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEYS.role)) || "employee";
  const byRole = appConfig.quickLinksByRole && appConfig.quickLinksByRole[role];
  const base = Array.isArray(byRole) ? byRole : (Array.isArray(appConfig.quickLinks) ? appConfig.quickLinks : []);
  const recentUrls = loadState(STORAGE_KEYS.recentLinkUrls, []);
  const recent = Array.isArray(recentUrls) ? recentUrls.slice(0, RECENT_LINKS_MAX) : [];
  const seen = new Set(base.map((l) => l.url));
  const recentLinks = recent.map((url) => {
    const label = typeof url === "string" ? url : (url && url.label) ? url.label : url;
    const u = typeof url === "string" ? url : (url && url.url) ? url.url : "";
    return { label: typeof label === "string" ? label : u, url: u };
  }).filter((l) => l.url && !seen.has(l.url));
  recentLinks.forEach((l) => seen.add(l.url));
  return recentLinks.length ? [...recentLinks, ...base] : base;
}

function recordLinkClick(url, label) {
  const key = STORAGE_KEYS.recentLinkUrls;
  let list = loadState(key, []);
  list = [{ url, label: label || url }, ...list.filter((x) => (x.url || x) !== url)].slice(0, RECENT_LINKS_MAX);
  saveState(key, list);
}

function renderQuickLinks() {
  if (!quickLinksEl) return;
  quickLinksEl.innerHTML = "";
  const links = getQuickLinksForRole();

  links.forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "link-btn";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.addEventListener("click", () => recordLinkClick(link.url, link.label));

    const badge = document.createElement("span");
    badge.className = "link-badge";
    badge.textContent = getInitials(link.label);

    const label = document.createElement("span");
    label.textContent = link.label;

    anchor.appendChild(badge);
    anchor.appendChild(label);
    quickLinksEl.appendChild(anchor);
  });
}

function renderTaskProgress() {
  if (!taskProgress) return;
  if ((!tasks || tasks.length === 0) && Array.isArray(jiraIssues) && jiraIssues.length > 0) {
    const doneCount = jiraIssues.filter((issue) => /done|resolved|closed/i.test(issue.status || "")).length;
    taskProgress.textContent = `${doneCount}/${jiraIssues.length} Jira done`;
    return;
  }
  const doneCount = tasks.filter((task) => task.done).length;
  const total = tasks.length || 1;
  taskProgress.textContent = `${Math.round((doneCount / total) * 100)}% done`;
}

function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = "";

  if ((!tasks || tasks.length === 0) && Array.isArray(jiraIssues) && jiraIssues.length > 0) {
    const focusMap = new Map();
    jiraIssues
      .filter((issue) => isHighPriority(issue) || isHighLevelIssue(issue))
      .forEach((issue) => {
        if (issue && issue.key && !focusMap.has(issue.key)) focusMap.set(issue.key, issue);
      });

    const focusIssues = Array.from(focusMap.values());
    if (focusIssues.length > 0) {
      focusIssues.forEach((issue) => {
        const li = document.createElement("li");
        li.className = "task-item";

        const typeTag = document.createElement("span");
        typeTag.style.cssText = "font-size:0.72rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-right:6px;background:var(--accent,#0ea5a2);color:#fff;vertical-align:middle;";
        typeTag.textContent = issue.issueType || "Task";

        const link = document.createElement("a");
        link.href = issue.url || "#";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.cssText = "color:var(--accent);font-weight:600;font-size:0.85rem;vertical-align:middle;";
        link.textContent = `[${issue.key}] ${issue.summary}`;

        const meta = document.createElement("div");
        meta.style.cssText = "font-size:0.75rem;color:var(--muted);margin-top:2px;padding-left:2px;";
        meta.textContent = `${issue.status || "Unknown"} · ${issue.priority || "-"}`;

        li.appendChild(typeTag);
        li.appendChild(link);
        li.appendChild(meta);
        taskList.appendChild(li);
      });

      renderTaskProgress();
      updateDashboardKpiCards();
      return;
    }
  }

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item ${task.done ? "done" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.id = `task-${task.id}`;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveState(STORAGE_KEYS.tasks, tasks);
      renderTasks();
      renderFocusSummary();
      renderPerformanceKpis();
      renderAlerts();
    });

    const label = document.createElement("label");
    label.setAttribute("for", checkbox.id);
    label.textContent = task.title;

    const progressWrap = document.createElement("div");
    progressWrap.className = "task-progress-bar";
    const progressFill = document.createElement("div");
    progressFill.className = "task-progress-fill";
    progressWrap.appendChild(progressFill);

    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(progressWrap);
    taskList.appendChild(li);
  });

  renderTaskProgress();
  updateDashboardKpiCards();
}

function dateToKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function formatMeetingLine(event) {
  const subject = String(event?.subject || "").trim() || "(No title)";
  const startTime = event?.start ? new Date(event.start) : null;
  const timeLabel = startTime && !isNaN(startTime.getTime())
    ? startTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) + " "
    : "";
  const modeLabel = event?.isTeamsMeeting ? "[Teams] " : "[Meeting] ";
  const joinUrl = String(event?.teamsJoinUrl || "").trim();
  const joinText = joinUrl ? ` | Join: ${joinUrl}` : "";
  return `- ${modeLabel}${timeLabel}${subject}${joinText}`;
}

async function loadCalendarEventsForMonth() {
  if (!userEmail) return;
  const year = calendarViewYear;
  const month = calendarViewMonth;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  try {
    const res = await fetch("/api/calendar/events?email=" + encodeURIComponent(userEmail) + "&from=" + encodeURIComponent(start.toISOString()) + "&to=" + encodeURIComponent(end.toISOString()));
    const data = await res.json();
    const events = (data && data.events) ? data.events : [];
    const byDate = {};
    events.forEach((e) => {
      const dateStr = e.start && e.start.slice(0, 10);
      if (dateStr) {
        if (!byDate[dateStr]) byDate[dateStr] = [];
        byDate[dateStr].push(e);
      }
    });
    calendarEventsByDate = byDate;
    renderCalendar();
  } catch (_) {
    calendarEventsByDate = {};
  }
}

async function suggestNotesFromCalendar() {
  if (!notesEl || !userEmail) return;
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  try {
    const res = await fetch("/api/calendar/events?email=" + encodeURIComponent(userEmail) + "&from=" + encodeURIComponent(from.toISOString()) + "&to=" + encodeURIComponent(to.toISOString()));
    const data = await res.json();
    const events = (data && data.events) ? data.events : [];
    const teamsCount = events.filter((e) => e && e.isTeamsMeeting).length;
    const lines = events.length ? [`Meetings today${teamsCount ? ` (Teams: ${teamsCount})` : ""}:`] : [];
    events.forEach((e) => lines.push(formatMeetingLine(e)));
    const append = lines.join("\n");
    if (append) {
      notesEl.value = (notesEl.value || "").trim() ? (notesEl.value + "\n\n" + append) : append;
      saveState(STORAGE_KEYS.notes, notesEl.value);
    }
  } catch (_) {}
}

function renderCalendar() {
  if (!calendarGrid || !monthLabel) return;

  const year = calendarViewYear;
  const month = calendarViewMonth;
  const now = new Date();
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();
  const isViewingCurrentMonth = year === todayYear && month === todayMonth;

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayStartOffset = (firstDay.getDay() + 6) % 7;

  monthLabel.textContent = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  calendarGrid.innerHTML = "";

  for (let i = 0; i < mondayStartOffset; i += 1) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = dateToKey(year, month, day);
    const hasNote = calendarNotes[dateKey] && String(calendarNotes[dateKey]).trim().length > 0;
    const events = calendarEventsByDate[dateKey] || [];
    const hasEvents = events.length > 0;
    const teamsCount = hasEvents ? events.filter((e) => e && e.isTeamsMeeting).length : 0;
    const isToday = isViewingCurrentMonth && day === todayDate;
    const cell = document.createElement("div");
    cell.className = `calendar-day clickable ${isToday ? "today" : ""} ${hasNote ? "has-note" : ""} ${hasEvents ? "has-events" : ""}`;
    const titleParts = [];
    if (hasNote) titleParts.push((calendarNotes[dateKey] || "").slice(0, 80) + (String(calendarNotes[dateKey]).length > 80 ? "…" : ""));
    if (hasEvents) {
      const meetingsSummary = events.length + " meeting(s): " + events.map((e) => e.subject).join("; ").slice(0, 60);
      titleParts.push(teamsCount > 0 ? `${meetingsSummary} | Teams: ${teamsCount}` : meetingsSummary);
    }
    cell.setAttribute("data-date", dateKey);
    cell.setAttribute("title", titleParts.length ? titleParts.join(" | ") : "Click to add note");
    const dayNum = document.createElement("span");
    dayNum.className = "calendar-day-num";
    dayNum.textContent = String(day);
    cell.appendChild(dayNum);
    if (hasNote) {
      const dot = document.createElement("span");
      dot.className = "calendar-day-note-dot";
      dot.setAttribute("aria-hidden", "true");
      cell.appendChild(dot);
    }
    if (hasEvents) {
      const evtBadge = document.createElement("span");
      evtBadge.className = "calendar-day-events";
      evtBadge.setAttribute("aria-hidden", "true");
      evtBadge.textContent = events.length;
      cell.appendChild(evtBadge);
    }
    cell.addEventListener("click", () => openCalendarNoteModal(dateKey));
    calendarGrid.appendChild(cell);
  }
}

function openCalendarNoteModal(dateKey) {
  const modal = document.getElementById("calendarNoteModal");
  const modalDate = document.getElementById("calendarNoteDate");
  const modalText = document.getElementById("calendarNoteText");
  const modalClose = document.getElementById("calendarNoteClose");
  const modalSave = document.getElementById("calendarNoteSave");
  if (!modal || !modalDate || !modalText) return;

  currentCalendarModalDateKey = dateKey;
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  modalDate.textContent = date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  modalText.value = calendarNotes[dateKey] || "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  modalText.focus();

  function onBackdropClick(e) {
    if (e.target === modal) closeModal();
  }
  function onEscape(e) {
    if (e.key === "Escape") closeModal();
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    modalClose.removeEventListener("click", closeModal);
    modalSave.removeEventListener("click", saveNote);
    modal.removeEventListener("click", onBackdropClick);
    modalText.removeEventListener("keydown", onEscape);
  }

  function saveNote() {
    const text = String(modalText.value || "").trim();
    if (text) calendarNotes[dateKey] = text;
    else delete calendarNotes[dateKey];
    saveCalendarNotesState();
    renderCalendar();
    closeModal();
  }

  modalClose.addEventListener("click", closeModal);
  modalSave.addEventListener("click", saveNote);
  modal.addEventListener("click", onBackdropClick);
  modalText.addEventListener("keydown", onEscape);

  const addMeetingsBtn = document.getElementById("calendarNoteAddMeetingsBtn");
  if (addMeetingsBtn) {
    addMeetingsBtn.onclick = async () => {
      const key = currentCalendarModalDateKey;
      if (!key || !userEmail) return;
      const from = key + "T00:00:00";
      const to = key + "T23:59:59";
      try {
        const res = await fetch("/api/calendar/events?email=" + encodeURIComponent(userEmail) + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to));
        const data = await res.json();
        const events = (data && data.events) ? data.events : [];
        const teamsCount = events.filter((e) => e && e.isTeamsMeeting).length;
        const lines = events.length ? [`Meetings this day${teamsCount ? ` (Teams: ${teamsCount})` : ""}:`] : [];
        events.forEach((e) => lines.push(formatMeetingLine(e)));
        const append = lines.join("\n");
        if (append) modalText.value = (modalText.value || "").trim() ? (modalText.value + "\n\n" + append) : append;
      } catch (_) {}
    };
  }
}

function wireCalendarNoteModal() {
  const modal = document.getElementById("calendarNoteModal");
  const modalSave = document.getElementById("calendarNoteSave");
  const modalText = document.getElementById("calendarNoteText");
  if (modalSave && modalText) {
    modalText.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        modalSave.click();
      }
    });
  }
}

function renderFocusSummary() {
  if (!focusList) return;

  const completedTasks = tasks.filter((task) => task.done).length;
  const totalTasks = tasks.length;
  const kpis = computePersonalJiraKpis();

  focusList.innerHTML = "";

  // ── Jira breakdown items ──────────────────────────────────────────────────
  const jiraGroups = [
    { label: "In Progress", items: jiraIssues.filter((i) => /in progress/i.test(i.status || "")) },
    { label: "New / To Do", items: jiraIssues.filter((i) => /^new$|^to do$/i.test((i.status || "").trim())) },
    { label: "Overdue", items: jiraIssues.filter((i) => i.dueDate && new Date(i.dueDate) < new Date() && !/done|resolved|closed/i.test(i.status || "")) }
  ];

  jiraGroups.forEach(({ label, items }) => {
    if (items.length === 0) return;
    const card = document.createElement("div");
    card.className = "focus-item";

    const title = document.createElement("strong");
    title.textContent = `${label} (${items.length})`;

    const list = document.createElement("ul");
    list.style.cssText = "margin: 4px 0 0 12px; padding: 0; list-style: disc;";
    items.slice(0, 5).forEach((issue) => {
      const li = document.createElement("li");
      li.style.cssText = "margin: 2px 0; font-size: 0.82rem;";
      const a = document.createElement("a");
      a.href = issue.url || "#";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = `[${issue.key}] ${issue.summary}`;
      a.style.cssText = "color: var(--accent); text-decoration: none;";
      li.appendChild(a);
      const meta = document.createElement("span");
      meta.textContent = ` — ${issue.issueType || "Task"} · ${issue.priority}`;
      meta.style.cssText = "color: var(--muted); font-size: 0.78rem;";
      li.appendChild(meta);
      list.appendChild(li);
    });
    if (items.length > 5) {
      const more = document.createElement("li");
      more.style.cssText = "color: var(--muted); font-size: 0.78rem;";
      more.textContent = `+${items.length - 5} more`;
      list.appendChild(more);
    }

    card.appendChild(title);
    card.appendChild(list);
    focusList.appendChild(card);
  });

  if (jiraIssues.length === 0) {
    const empty = document.createElement("div");
    empty.className = "focus-item";
    const t = document.createElement("strong");
    t.textContent = "Jira Load";
    const b = document.createElement("span");
    b.textContent = "No active Jira items found. Click Refresh Jira to load.";
    empty.appendChild(t);
    empty.appendChild(b);
    focusList.appendChild(empty);
  }

  // ── Checklist progress ────────────────────────────────────────────────────
  const checkCard = document.createElement("div");
  checkCard.className = "focus-item";
  const checkTitle = document.createElement("strong");
  checkTitle.textContent = "Checklist Progress";
  const checkBody = document.createElement("span");
  checkBody.textContent = `${completedTasks}/${totalTasks} personal tasks done today.`;
  checkCard.appendChild(checkTitle);
  checkCard.appendChild(checkBody);
  focusList.appendChild(checkCard);

  // ── Focus direction tip ───────────────────────────────────────────────────
  const tipCard = document.createElement("div");
  tipCard.className = "focus-item";
  const tipTitle = document.createElement("strong");
  tipTitle.textContent = "Focus Direction";
  const tipBody = document.createElement("span");
  tipBody.textContent = kpis.overdue > 0
    ? `${kpis.overdue} overdue item(s) need attention first.`
    : kpis.inProgress > 0
      ? `${kpis.inProgress} item(s) in progress — push at least one to Done today.`
      : completedTasks >= Math.ceil(totalTasks * 0.6)
        ? "Execution is healthy. Protect deep-work blocks."
        : "Start with one high-impact Jira item to unblock momentum.";
  tipCard.appendChild(tipTitle);
  tipCard.appendChild(tipBody);
  focusList.appendChild(tipCard);
}

function calculateCompletionRate() {
  const done = tasks.filter((task) => task.done).length;
  const total = tasks.length || 1;
  return Math.round((done / total) * 100);
}

function calculateUtilization() {
  const planned = Math.max(1, Number(performanceState.plannedHours || 8));
  const tracked = Number(performanceState.trackedHours || 0);
  return clamp(Math.round((tracked / planned) * 100), 0, 130);
}

function calculateProductivityScore() {
  const completion = calculateCompletionRate();
  const utilization = clamp(calculateUtilization(), 0, 100);
  const attendance = clamp(Number(performanceState.attendance || 0), 0, 100);
  const engagement = clamp(Number(performanceState.engagement || 0), 0, 100);

  const score = Math.round(
    completion * 0.35 +
    utilization * 0.25 +
    attendance * 0.2 +
    engagement * 0.2
  );

  return clamp(score, 0, 100);
}

function renderTrend() {
  if (!trendBars) return;
  trendBars.innerHTML = "";

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  performanceState.trend.forEach((value, idx) => {
    const bar = document.createElement("div");
    bar.className = "trend-bar";
    bar.style.height = `${clamp(value, 5, 100)}%`;
    bar.title = `${labels[idx]}: ${value}`;

    const label = document.createElement("span");
    label.className = "trend-label";
    label.textContent = labels[idx];

    bar.appendChild(label);
    trendBars.appendChild(bar);
  });
}

function renderPerformanceKpis() {
  const completion = calculateCompletionRate();
  const utilization = calculateUtilization();
  const productivity = calculateProductivityScore();

  if (perfScoreChip) perfScoreChip.textContent = `Score ${productivity}`;
  if (kpiProductivity) kpiProductivity.textContent = `${productivity}%`;
  if (kpiAttendance) kpiAttendance.textContent = `${clamp(Number(performanceState.attendance), 0, 100)}%`;
  if (kpiCompletion) kpiCompletion.textContent = `${completion}%`;
  if (kpiEngagement) kpiEngagement.textContent = `${clamp(Number(performanceState.engagement), 0, 100)}%`;
  if (kpiUtilization) kpiUtilization.textContent = `${utilization}%`;
  if (kpiTracked) {
    kpiTracked.textContent = `${Number(performanceState.trackedHours).toFixed(1)}h / ${Number(performanceState.plannedHours).toFixed(1)}h`;
  }

  if (inputAttendance) inputAttendance.value = String(clamp(Number(performanceState.attendance), 0, 100));
  if (inputEngagement) inputEngagement.value = String(clamp(Number(performanceState.engagement), 0, 100));
  if (inputTrackedHours) inputTrackedHours.value = String(Number(performanceState.trackedHours));
  if (inputPlannedHours) inputPlannedHours.value = String(Number(performanceState.plannedHours));

  renderTrend();
}

function renderAlerts() {
  if (!alertList) return;
  alertList.innerHTML = "";

  const alerts = [];
  const completion = calculateCompletionRate();
  const utilization = calculateUtilization();
  const productivity = calculateProductivityScore();

  if (jiraIssues.length >= 8) {
    alerts.push({ title: "High Jira Load", body: `${jiraIssues.length} open assigned issues. Re-prioritize top 3 for today.` });
  }
  if (completion < 50) {
    alerts.push({ title: "Low Task Completion", body: `Checklist completion is ${completion}%. Break one large task into two smaller outcomes.` });
  }
  if (utilization > 110) {
    alerts.push({ title: "Over-utilization Risk", body: `Utilization is ${utilization}%. This indicates potential overload risk.` });
  }
  if (productivity >= 80 && alerts.length === 0) {
    alerts.push({ title: "Healthy Performance", body: "Current indicators are stable. Keep this cadence." });
  }

  alerts.forEach((alert) => {
    const card = document.createElement("div");
    card.className = "focus-item";

    const title = document.createElement("strong");
    title.textContent = alert.title;

    const body = document.createElement("span");
    body.textContent = alert.body;

    card.appendChild(title);
    card.appendChild(body);
    alertList.appendChild(card);
  });
}

function renderStreakBadges(payload) {
  if (!streakBadgesList) return;
  streakBadgesList.innerHTML = "";
  const badges = Array.isArray(payload?.badges) ? payload.badges : [];

  if (badges.length === 0) {
    const empty = document.createElement("div");
    empty.className = "focus-item";
    empty.textContent = "No badge definitions available.";
    streakBadgesList.appendChild(empty);
    return;
  }

  badges.forEach((badge) => {
    const item = document.createElement("div");
    item.className = "focus-item";

    const title = document.createElement("strong");
    title.textContent = `${badge.earned ? "🏅" : "🎯"} ${badge.title}`;

    const body = document.createElement("span");
    body.textContent = badge.description || "";

    const meta = document.createElement("div");
    meta.className = "jira-meta";
    meta.textContent = badge.earned
      ? `Earned (streak ${badge.streak}/${badge.target})`
      : `Progress ${badge.streak}/${badge.target}`;

    item.appendChild(title);
    item.appendChild(body);
    item.appendChild(meta);
    streakBadgesList.appendChild(item);
  });
}

async function loadStreakBadges() {
  if (!streakBadgesList || !streakBadgesStatus) return;
  if (!userEmail) {
    streakBadgesStatus.textContent = "Sign in to view your streak badges.";
    streakBadgesList.innerHTML = "";
    return;
  }

  streakBadgesStatus.textContent = "Loading your badge progress...";
  try {
    const response = await fetch(
      "/api/streak-badges?userEmail=" + encodeURIComponent(userEmail),
      { cache: "no-store" }
    );
    const data = await response.json();
    if (!response.ok) {
      streakBadgesStatus.textContent = data.message || "Could not load badges.";
      streakBadgesList.innerHTML = "";
      return;
    }
    renderStreakBadges(data);
    const earned = (data.badges || []).filter((b) => b.earned).length;
    streakBadgesStatus.textContent = `${earned}/${(data.badges || []).length} badges earned.`;
  } catch (_) {
    streakBadgesStatus.textContent = "Could not load badges.";
    streakBadgesList.innerHTML = "";
  }
}

function updateTrendWithToday(score) {
  const trend = Array.isArray(performanceState.trend) ? [...performanceState.trend] : [68, 71, 74, 72, 76, 79, 81];
  while (trend.length < 7) trend.unshift(score);
  trend[trend.length - 1] = score;
  performanceState.trend = trend.slice(-7);
}

function renderJiraIssues() {
  if (!jiraList) return;
  jiraList.innerHTML = "";

  if (jiraIssues.length === 0) {
    const empty = document.createElement("div");
    empty.className = "focus-item";
    empty.textContent = "No Jira issues found for current query.";
    jiraList.appendChild(empty);
    return;
  }

  jiraIssues.forEach((issue) => {
    const row = document.createElement("div");
    row.className = "jira-item";

    const key = document.createElement("a");
    key.className = "jira-key";
    key.textContent = issue.key;
    key.href = issue.url || "#";
    key.target = "_blank";
    key.rel = "noopener noreferrer";

    const summary = document.createElement("div");
    summary.textContent = issue.summary;

    const meta = document.createElement("div");
    meta.className = "jira-meta";
    meta.textContent = `${issue.issueType || "Task"} | ${issue.status} | ${issue.priority} | ${issue.assignee}`;

    row.appendChild(key);
    row.appendChild(summary);
    row.appendChild(meta);
    jiraList.appendChild(row);
  });
}

async function loadJiraIssues() {
  if (!jiraStatus) return;
  jiraStatus.textContent = "Syncing Jira...";

  try {
    const sessionEmail = String(userEmail || loadState(STORAGE_KEYS.userEmail, "") || "").trim().toLowerCase();
    if (sessionEmail && !userEmail) {
      userEmail = sessionEmail;
      if (userEmailInput) userEmailInput.value = userEmail;
    }
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;
    const endpoint = sessionEmail
      ? "/api/jira/issues?email=" + encodeURIComponent(sessionEmail)
      : "/api/jira/issues";
    const response = await fetch(endpoint, controller ? { signal: controller.signal } : undefined);
    if (timeoutId) clearTimeout(timeoutId);
    const payload = await response.json();

    if (!response.ok || !payload.configured) {
      jiraStatus.textContent = payload.message || "Unable to fetch Jira issues.";
      jiraIssues = [];
      renderJiraIssues();
      renderTasks();
      renderPerformanceKpis();
      renderFocusSummary();
      renderAlerts();
      mergeTasksFromJira();
      return;
    }

    jiraIssues = Array.isArray(payload.issues) ? payload.issues : [];
    jiraStatus.textContent = `Loaded ${jiraIssues.length} Jira issues.`;
    renderJiraIssues();
    renderTasks();
    renderPerformanceKpis();
    renderFocusSummary();
    renderAlerts();
    mergeTasksFromJira();
    updateDashboardKpiCards();
  } catch (error) {
    const isTimeout = error && (error.name === "AbortError");
    jiraStatus.textContent = isTimeout
      ? "Jira request timed out. Click Refresh Jira to retry."
      : "Jira request failed. Check VPN/network and server config.";
    jiraIssues = [];
    renderJiraIssues();
    renderTasks();
    renderPerformanceKpis();
    renderFocusSummary();
    renderAlerts();
    mergeTasksFromJira();
  }
}

function mergeTasksFromJira() {
  if (!appConfig.useJiraAsTasks || !jiraIssues.length) return;
  const existingIds = new Set(tasks.map((t) => String(t.id)));
  let changed = false;
  jiraIssues.forEach((issue) => {
    const id = "jira-" + (issue.key || "");
    if (!id || id === "jira-" || existingIds.has(id)) return;
    tasks.push({ id, title: "[" + (issue.key || "") + "] " + (issue.summary || "").trim(), done: false, fromJira: true });
    existingIds.add(id);
    changed = true;
  });
  if (changed) {
    saveState(STORAGE_KEYS.tasks, tasks);
    renderTasks();
    renderFocusSummary();
    renderPerformanceKpis();
    renderAlerts();
    updateDashboardKpiCards();
  }
}

function renderTeamWorkload(summary) {
  if (!teamWorkloadList) return;
  teamWorkloadList.innerHTML = "";

  const rows = Array.isArray(summary?.workload) ? summary.workload : [];
  if (rows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "focus-item";
    empty.textContent = "No assignee workload data available for current team query.";
    teamWorkloadList.appendChild(empty);
    return;
  }

  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "focus-item";

    const title = document.createElement("strong");
    title.textContent = `${row.assignee} (${row.total})`;

    const body = document.createElement("span");
    body.textContent = `In progress: ${row.inProgress}, Blocked: ${row.blocked}, Overdue: ${row.overdue}`;

    item.appendChild(title);
    item.appendChild(body);

    const tickets = Array.isArray(row.tickets) ? row.tickets : [];
    if (tickets.length > 0) {
      const details = document.createElement("details");
      details.className = "assignee-ticket-details";

      const summaryEl = document.createElement("summary");
      summaryEl.textContent = `Show tickets (${tickets.length})`;
      details.appendChild(summaryEl);

      const list = document.createElement("ul");
      list.style.cssText = "margin: 6px 0 0 14px; padding: 0; list-style: disc;";

      tickets.forEach((ticket) => {
        const li = document.createElement("li");
        li.style.cssText = "margin: 3px 0; font-size: 0.82rem;";

        const link = document.createElement("a");
        link.href = ticket.url || "#";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `[${ticket.key}] ${ticket.summary}`;
        link.style.cssText = "color: var(--accent); text-decoration: none;";
        li.appendChild(link);

        const meta = document.createElement("span");
        const dueText = ticket.dueDate ? ` | Due: ${ticket.dueDate}` : "";
        meta.textContent = ` | ${ticket.issueType || "Task"} | ${ticket.status || "Unknown"} | ${ticket.priority || "-"}${dueText}`;
        meta.style.cssText = "color: var(--muted); font-size: 0.78rem;";
        li.appendChild(meta);

        list.appendChild(li);
      });

      details.appendChild(list);
      item.appendChild(details);
    }

    teamWorkloadList.appendChild(item);
  });
}

function renderTeamRisks(summary) {
  if (!teamRiskList) return;
  teamRiskList.innerHTML = "";

  const risks = Array.isArray(summary?.risks) ? summary.risks : [];
  if (risks.length === 0) {
    const healthy = document.createElement("div");
    healthy.className = "focus-item";

    const title = document.createElement("strong");
    title.textContent = "No Immediate Risks";

    const body = document.createElement("span");
    body.textContent = "Team load appears balanced for the current Jira slice.";

    healthy.appendChild(title);
    healthy.appendChild(body);
    teamRiskList.appendChild(healthy);
    return;
  }

  risks.forEach((risk) => {
    const item = document.createElement("div");
    item.className = "focus-item";

    const title = document.createElement("strong");
    title.textContent = `${risk.assignee} (${risk.level.toUpperCase()})`;

    const body = document.createElement("span");
    body.textContent = risk.message;

    item.appendChild(title);
    item.appendChild(body);
    teamRiskList.appendChild(item);
  });
}

function renderTeamTrend(summary) {
  if (!teamTrendBars) return;
  teamTrendBars.innerHTML = "";

  const trend = Array.isArray(summary?.trend) ? summary.trend : [];
  const max = Math.max(1, ...trend.map((item) => Number(item.value || 0)));

  trend.forEach((item) => {
    const bar = document.createElement("div");
    bar.className = "trend-bar";
    bar.style.height = `${Math.max(10, Math.round((Number(item.value || 0) / max) * 100))}%`;
    bar.title = `${item.label}: ${item.value}`;

    const label = document.createElement("span");
    label.className = "trend-label";
    label.textContent = item.label;

    bar.appendChild(label);
    teamTrendBars.appendChild(bar);
  });
}

function renderTeamInsights(summary) {
  const periodStats = summary?.periodStats || {};
  const weekly = periodStats.weekly || {};
  const monthly = periodStats.monthly || {};
  const aging = summary?.overdueAgingBuckets || {};
  const burnout = Array.isArray(summary?.burnoutRadar) ? summary.burnoutRadar : [];
  const blockedChains = Array.isArray(summary?.blockedChainAlerts) ? summary.blockedChainAlerts : [];
  const milestones = Array.isArray(summary?.milestoneWarnings) ? summary.milestoneWarnings : [];
  const attrition = Array.isArray(summary?.attritionRisk) ? summary.attritionRisk : [];
  const rebalancing = Array.isArray(summary?.workloadRebalancing) ? summary.workloadRebalancing : [];

  if (teamOpenedWeek) teamOpenedWeek.textContent = String(weekly.opened ?? 0);
  if (teamClosedWeek) teamClosedWeek.textContent = String(weekly.closed ?? 0);
  if (teamOpenedMonth) teamOpenedMonth.textContent = String(monthly.opened ?? 0);
  if (teamClosedMonth) teamClosedMonth.textContent = String(monthly.closed ?? 0);
  if (teamHealthScore) teamHealthScore.textContent = `${Number(summary?.teamHealthScore || 0)}%`;
  if (teamBurnoutFlags) teamBurnoutFlags.textContent = String(burnout.length);
  if (aging0to3) aging0to3.textContent = String(aging.d0to3 ?? 0);
  if (aging4to7) aging4to7.textContent = String(aging.d4to7 ?? 0);
  if (aging8to14) aging8to14.textContent = String(aging.d8to14 ?? 0);
  if (aging15plus) aging15plus.textContent = String(aging.d15plus ?? 0);
  if (unplannedWorkPct) unplannedWorkPct.textContent = `${Number(summary?.unplannedWork?.percentage || 0)}%`;
  if (blockedChainsCount) blockedChainsCount.textContent = String(blockedChains.length);
  if (milestoneWarningsCount) milestoneWarningsCount.textContent = String(milestones.length);
  if (attritionRiskCount) attritionRiskCount.textContent = String(attrition.length);

  if (!teamInsightsList) return;
  teamInsightsList.innerHTML = "";

  const lines = [];
  if (rebalancing.length > 0) {
    lines.push(`Workload rebalancing: ${rebalancing[0].recommendation}`);
  }
  if (milestones.length > 0) {
    lines.push(`Milestone warning: ${milestones[0].key} due in ${milestones[0].daysToDue} day(s).`);
  }
  if (blockedChains.length > 0) {
    lines.push(`Blocked chain: ${blockedChains[0].key} depends on ${blockedChains[0].dependencyKey}.`);
  }
  if (attrition.length > 0) {
    lines.push(`Attrition risk watch: ${attrition.slice(0, 2).map((x) => x.assignee).join(", ")}.`);
  }
  const availability = summary?.teamAvailabilityCheck;
  if (availability?.bestCandidates?.length) {
    lines.push(`Team availability candidates: ${availability.bestCandidates.join(", ")}.`);
  }

  if (lines.length === 0) {
    const item = document.createElement("div");
    item.className = "focus-item";
    item.textContent = "No additional delivery insights for the current Jira slice.";
    teamInsightsList.appendChild(item);
    return;
  }

  lines.forEach((text) => {
    const item = document.createElement("div");
    item.className = "focus-item";
    item.textContent = text;
    teamInsightsList.appendChild(item);
  });
}

function calculateManagerProductivity(summary) {
  const completion = Number(summary?.completionRate || 0);
  const totals = summary?.totals || {};
  const totalIssues = Number(totals.open || 0) + Number(totals.done || 0);
  const overdueRate = totalIssues ? Number(totals.overdue || 0) / totalIssues : 0;
  const blockedRate = totalIssues ? Number(totals.blocked || 0) / totalIssues : 0;

  const score = Math.round(
    completion * 0.7 +
    (100 - overdueRate * 100) * 0.2 +
    (100 - blockedRate * 100) * 0.1
  );

  return clamp(score, 0, 100);
}

function renderManagerKpiRow(summary) {
  const completion = Number(summary?.completionRate || 0);
  const attendance = teamRawMetrics
    ? clamp(Number(teamRawMetrics.attendance || 0), 0, 100)
    : clamp(Number(performanceState?.attendance || 0), 0, 100);
  const productivity = teamRawMetrics
    ? clamp(Number(teamRawMetrics.productivity || 0), 0, 100)
    : calculateManagerProductivity(summary);
  const overdue = Number(summary?.totals?.overdue || 0);
  const riskCount = Array.isArray(summary?.risks) ? summary.risks.length : 0;

  if (managerCompletionKpi) managerCompletionKpi.textContent = `${completion}%`;
  if (managerAttendanceKpi) managerAttendanceKpi.textContent = `${attendance}%`;
  if (managerProductivityKpi) managerProductivityKpi.textContent = `${productivity}%`;
  if (managerOverdueKpi) managerOverdueKpi.textContent = String(overdue);
  if (managerRiskCountKpi) managerRiskCountKpi.textContent = String(riskCount);
}

function renderTeamSummary(summary) {
  if (!summary) return;

  if (teamOpenCount) teamOpenCount.textContent = String(summary.totals?.open ?? 0);
  if (teamBugCount) teamBugCount.textContent = String(summary.bugCount ?? 0);
  if (teamInProgressCount) teamInProgressCount.textContent = String(summary.totals?.inProgress ?? 0);
  if (teamBlockedCount) teamBlockedCount.textContent = String(summary.totals?.blocked ?? 0);
  if (teamOverdueCount) teamOverdueCount.textContent = String(summary.totals?.overdue ?? 0);
  if (teamDoneCount) teamDoneCount.textContent = String(summary.totals?.done ?? 0);
  if (teamCompletionRate) teamCompletionRate.textContent = `${summary.completionRate ?? 0}%`;

  renderManagerKpiRow(summary);
  renderTeamWorkload(summary);
  renderTeamRisks(summary);
  renderTeamTrend(summary);
  renderTeamInsights(summary);
}

function renderHelpRequests() {
  if (!helpRequestsList) return;
  helpRequestsList.innerHTML = "";

  if (!Array.isArray(helpRequests) || helpRequests.length === 0) {
    const empty = document.createElement("div");
    empty.className = "focus-item";
    empty.textContent = "No active blockers logged.";
    helpRequestsList.appendChild(empty);
    return;
  }

  helpRequests.slice(0, 8).forEach((request) => {
    const card = document.createElement("div");
    card.className = "focus-item";

    const title = document.createElement("strong");
    title.textContent = `[${String(request.impact || "medium").toUpperCase()}] ${request.type} - waiting: ${request.owner || "N/A"}`;

    const body = document.createElement("span");
    body.textContent = request.details || "No details provided.";

    const meta = document.createElement("div");
    meta.className = "jira-meta";
    meta.textContent = `Since ${request.since || "today"} | Logged ${new Date(request.createdAt).toLocaleString()}`;

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const resolveBtn = document.createElement("button");
    resolveBtn.type = "button";
    resolveBtn.className = "btn-secondary";
    resolveBtn.setAttribute("data-blocker-id", request.id || "");
    resolveBtn.setAttribute("data-blocker-action", "resolve");
    resolveBtn.textContent = "Mark Unblocked";
    actions.appendChild(resolveBtn);

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(meta);
    card.appendChild(actions);
    helpRequestsList.appendChild(card);
  });
}

function renderManagerBlockers() {
  if (!managerBlockersList) return;
  managerBlockersList.innerHTML = "";

  if (!Array.isArray(managerHelpRequests) || managerHelpRequests.length === 0) {
    const empty = document.createElement("div");
    empty.className = "focus-item";
    empty.textContent = "No open blockers reported by team.";
    managerBlockersList.appendChild(empty);
    return;
  }

  managerHelpRequests.slice(0, 20).forEach((request) => {
    const card = document.createElement("div");
    card.className = "focus-item";

    const title = document.createElement("strong");
    title.textContent = `[${String(request.impact || "medium").toUpperCase()}] ${request.type} - ${request.createdByName || request.createdByEmail || "Unknown"}`;

    const body = document.createElement("span");
    body.textContent = request.details || "No details provided.";

    const meta = document.createElement("div");
    meta.className = "jira-meta";
    meta.textContent = `Owner: ${request.owner || "N/A"} | Since ${request.since || "today"}`;

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const notifyBtn = document.createElement("button");
    notifyBtn.type = "button";
    notifyBtn.className = "btn-secondary";
    notifyBtn.setAttribute("data-blocker-id", request.id || "");
    notifyBtn.setAttribute("data-blocker-action", "notify");
    notifyBtn.textContent = request.notifiedAt ? "Notify Again" : "Notify";
    actions.appendChild(notifyBtn);

    const resolveBtn = document.createElement("button");
    resolveBtn.type = "button";
    resolveBtn.className = "btn-secondary";
    resolveBtn.setAttribute("data-blocker-id", request.id || "");
    resolveBtn.setAttribute("data-blocker-action", "resolve");
    resolveBtn.textContent = "Mark Unblocked";
    actions.appendChild(resolveBtn);

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(meta);
    card.appendChild(actions);
    managerBlockersList.appendChild(card);
  });
}

async function loadHelpRequests() {
  if (!userEmail) {
    helpRequests = [];
    renderHelpRequests();
    return;
  }
  try {
    const response = await fetch("/api/blockers?userEmail=" + encodeURIComponent(userEmail));
    const data = await response.json();
    helpRequests = Array.isArray(data.blockers) ? data.blockers : [];
    renderHelpRequests();
  } catch {
    helpRequests = [];
    renderHelpRequests();
    if (helpStatus) helpStatus.textContent = "Could not load blockers from server.";
  }
}

async function loadManagerBlockers() {
  if (!managerBlockersList || !selectedManagerId) {
    managerHelpRequests = [];
    renderManagerBlockers();
    return;
  }
  if (managerBlockersStatus) managerBlockersStatus.textContent = "Loading blocker queue...";
  try {
    const response = await fetch("/api/blockers?managerId=" + encodeURIComponent(selectedManagerId));
    const data = await response.json();
    managerHelpRequests = Array.isArray(data.blockers) ? data.blockers : [];
    renderManagerBlockers();
    if (managerBlockersStatus) managerBlockersStatus.textContent = `${managerHelpRequests.length} open blocker(s).`;
  } catch {
    managerHelpRequests = [];
    renderManagerBlockers();
    if (managerBlockersStatus) managerBlockersStatus.textContent = "Could not load blocker queue.";
  }
}

async function notifyBlocker(id) {
  if (!id) return;
  if (managerBlockersStatus) managerBlockersStatus.textContent = "Sending notification...";
  try {
    const response = await fetch("/api/blockers/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, actorEmail: userEmail })
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      if (managerBlockersStatus) managerBlockersStatus.textContent = data.message || "Notification failed.";
      return;
    }
    if (managerBlockersStatus) managerBlockersStatus.textContent = "Notification sent.";
    await loadManagerBlockers();
  } catch {
    if (managerBlockersStatus) managerBlockersStatus.textContent = "Notification request failed.";
  }
}

async function resolveBlocker(id) {
  if (!id) return;
  if (helpStatus) helpStatus.textContent = "Updating blocker status...";
  if (managerBlockersStatus) managerBlockersStatus.textContent = "Updating blocker status...";
  try {
    const response = await fetch("/api/blockers/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, actorEmail: userEmail })
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      if (helpStatus) helpStatus.textContent = data.message || "Could not resolve blocker.";
      if (managerBlockersStatus) managerBlockersStatus.textContent = data.message || "Could not resolve blocker.";
      return;
    }
    await loadHelpRequests();
    await loadManagerBlockers();
    if (helpStatus) helpStatus.textContent = "Blocker marked as resolved.";
    if (managerBlockersStatus) managerBlockersStatus.textContent = "Blocker marked as resolved.";
  } catch {
    if (helpStatus) helpStatus.textContent = "Could not resolve blocker.";
    if (managerBlockersStatus) managerBlockersStatus.textContent = "Could not resolve blocker.";
  }
}

async function submitHelpRequest() {
  const request = {
    type: String(helpType?.value || "technical"),
    impact: String(helpImpact?.value || "medium"),
    owner: String(helpOwner?.value || "").trim(),
    since: String(helpSince?.value || "").trim(),
    details: String(helpDetails?.value || "").trim(),
    userEmail,
    managerId: selectedManagerId || ""
  };

  if (!request.details) {
    if (helpStatus) helpStatus.textContent = "Please describe the blocker before submitting.";
    return;
  }

  try {
    const response = await fetch("/api/blockers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      if (helpStatus) helpStatus.textContent = data.message || "Could not log blocker.";
      return;
    }

    await loadHelpRequests();
    if (viewMode === "manager") {
      await loadManagerBlockers();
    }

    if (helpDetails) helpDetails.value = "";
    if (helpOwner) helpOwner.value = "";
    if (helpStatus) {
      helpStatus.textContent = `Blocker logged. Suggested next step: notify ${request.owner || "your manager"} with this context.`;
    }
  } catch {
    if (helpStatus) helpStatus.textContent = "Could not log blocker. Try again.";
  }
}

async function loadTeamSummary() {
  if (!teamStatus) return;
  teamStatus.textContent = "Syncing team metrics from Jira...";

  try {
    const query = selectedManagerId ? `?managerId=${encodeURIComponent(selectedManagerId)}&includeIndirect=true` : "";
    const response = await fetch(`/api/team/summary${query}`);
    const payload = await response.json();

    if (!response.ok || !payload.configured) {
      teamStatus.textContent = payload.message || "Unable to fetch team summary.";
      return;
    }

    teamSummary = payload.summary || null;
    teamRawMetrics = payload.rawMetrics || null;
    renderTeamSummary(teamSummary);
    updateDashboardKpiCards();

    if (payload.managerScope?.managerName) {
      const managerMeta = formatManagerMeta(payload.managerScope.managerLevel, payload.managerScope.managerTitle);
      const managerLabel = managerMeta
        ? `${payload.managerScope.managerName} [${managerMeta}]`
        : payload.managerScope.managerName;
      const bugCount = Number(payload.summary?.bugCount ?? 0);
      teamStatus.textContent = `Team metrics loaded for ${managerLabel} (${payload.managerScope.reporteeCount} reportees, ${payload.total ?? 0} Jira items, ${bugCount} bugs).`;
    } else {
      const bugCount = Number(payload.summary?.bugCount ?? 0);
      teamStatus.textContent = `Team metrics loaded from ${payload.total ?? 0} Jira items (${bugCount} bugs).`;
    }
  } catch {
    teamStatus.textContent = "Team summary request failed. Check server and Jira config.";
  }
}

function setAuthStatus(message) {
  if (authStatus) authStatus.textContent = message;
}

function getTheme() {
  try {
    const t = localStorage.getItem(STORAGE_KEYS.theme);
    return t === "dark" || t === "light" ? t : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(STORAGE_KEYS.theme, next);
  } catch (_) {}
}

function toggleTheme() {
  applyTheme(getTheme() === "dark" ? "light" : "dark");
}

function updateProfileStrip() {
  const nameEl = document.getElementById("profileName");
  const roleEl = document.getElementById("profileRole");
  const avatarEl = document.getElementById("profileAvatar");
  if (nameEl) nameEl.textContent = (userEmail && userEmail.split("@")[0]) ? userEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
  const role = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEYS.role) : null;
  if (roleEl) roleEl.textContent = role === "manager" ? "Manager" : "Employee";
  if (avatarEl && userEmail) avatarEl.textContent = (userEmail[0] || "?").toUpperCase();
}

function isHighPriority(issue) {
  const p = String(issue.priority || "").toLowerCase();
  const s = String(issue.summary || "").toLowerCase();
  return /critical|blocker|1\s*-|highest|^p0|^p1/.test(p) ||
         /2\s*-\s*major|major/.test(p) ||
         /urgent|critical|blocker/.test(s);
}

function isHighLevelIssue(issue) {
  const t = String(issue.issueType || "").trim().toLowerCase();
  return t === "story" || t === "epic";
}

function renderHighLevelJira() {
  const section = document.getElementById("highLevelJiraSection");
  const list = document.getElementById("highLevelJiraList");
  const badge = document.getElementById("highLevelJiraBadge");
  if (!section || !list) return;

  const highLevel = jiraIssues.filter(isHighLevelIssue);
  if (badge) badge.textContent = String(highLevel.length);
  section.style.display = "";
  list.innerHTML = "";

  if (highLevel.length === 0) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.textContent = "No high-level Jira tickets (Story/Epic) in current filter.";
    list.appendChild(li);
    return;
  }

  highLevel.forEach((issue) => {
    const li = document.createElement("li");
    li.className = "task-item";

    const typeTag = document.createElement("span");
    typeTag.style.cssText = "font-size:0.72rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-right:6px;background:var(--accent,#0ea5a2);color:#fff;vertical-align:middle;";
    typeTag.textContent = issue.issueType || "Story";

    const link = document.createElement("a");
    link.href = issue.url || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.cssText = "color:var(--accent);font-weight:600;font-size:0.85rem;vertical-align:middle;";
    link.textContent = `[${issue.key}] ${issue.summary}`;

    const meta = document.createElement("div");
    meta.style.cssText = "font-size:0.75rem;color:var(--muted);margin-top:2px;padding-left:2px;";
    meta.textContent = `${issue.status} · ${issue.priority}`;

    li.appendChild(typeTag);
    li.appendChild(link);
    li.appendChild(meta);
    list.appendChild(li);
  });
}

function renderHighPriorityJira() {
  const section = document.getElementById("highPriorityJiraSection");
  const list = document.getElementById("highPriorityJiraList");
  const badge = document.getElementById("highPriorityJiraBadge");
  if (!section || !list) return;

  const highPri = jiraIssues.filter(isHighPriority);
  badge && (badge.textContent = String(highPri.length));
  section.style.display = highPri.length > 0 ? "" : "none";
  list.innerHTML = "";

  highPri.forEach((issue) => {
    const li = document.createElement("li");
    li.className = "task-item";

    const typeTag = document.createElement("span");
    typeTag.style.cssText = "font-size:0.72rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-right:6px;background:var(--warn,#f59e0b);color:#fff;vertical-align:middle;";
    typeTag.textContent = issue.issueType || "Task";

    const link = document.createElement("a");
    link.href = issue.url || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.cssText = "color:var(--accent);font-weight:600;font-size:0.85rem;vertical-align:middle;";
    link.textContent = `[${issue.key}] ${issue.summary}`;

    const meta = document.createElement("div");
    meta.style.cssText = "font-size:0.75rem;color:var(--muted);margin-top:2px;padding-left:2px;";
    meta.textContent = `${issue.status} · ${issue.priority}`;

    li.appendChild(typeTag);
    li.appendChild(link);
    li.appendChild(meta);
    list.appendChild(li);
  });

}

function computePersonalJiraKpis() {
  const now = new Date();
  const inProgress = jiraIssues.filter((i) => /in progress/i.test(i.status || "")).length;
  const done = jiraIssues.filter((i) => /done|resolved|closed/i.test(i.status || "")).length;
  const overdue = jiraIssues.filter((i) => i.dueDate && new Date(i.dueDate) < now && !/done|resolved|closed/i.test(i.status || "")).length;
  const total = jiraIssues.length;
  return { inProgress, done, overdue, total };
}

function updateDashboardKpiCards() {
  const inProgressEl = document.getElementById("kpiCardInProgress");
  const doneEl = document.getElementById("kpiCardDone");
  const overdueEl = document.getElementById("kpiCardOverdue");
  const totalEl = document.getElementById("kpiCardTotal");
  const teamInProgressEl = document.getElementById("kpiCardTeamInProgress");
  const teamDoneEl = document.getElementById("kpiCardTeamDone");
  const teamOverdueEl = document.getElementById("kpiCardTeamOverdue");
  const teamTotalEl = document.getElementById("kpiCardTeamTotal");
  if (viewMode === "personal") {
    const kpis = computePersonalJiraKpis();
    if (inProgressEl) inProgressEl.textContent = String(kpis.inProgress);
    if (doneEl) doneEl.textContent = String(kpis.done);
    if (overdueEl) overdueEl.textContent = String(kpis.overdue);
    if (totalEl) totalEl.textContent = String(kpis.total);
  } else if (viewMode === "manager" && teamSummary) {
    const t = teamSummary.totals || {};
    if (teamInProgressEl) teamInProgressEl.textContent = String(t.inProgress ?? 0);
    if (teamDoneEl) teamDoneEl.textContent = String(t.done ?? 0);
    if (teamOverdueEl) teamOverdueEl.textContent = String(t.overdue ?? 0);
    if (teamTotalEl) teamTotalEl.textContent = String(Number(t.open || 0) + Number(t.done || 0));
  }
}

function setManagerSelectDisabled(disabled) {
  if (managerSelect) managerSelect.disabled = disabled;
}

function formatManagerMeta(level, title) {
  const parts = [String(level || "").trim(), String(title || "").trim()].filter(Boolean);
  return parts.length ? parts.join(" - ") : "";
}

async function resolveUserContext() {
  if (!userEmail) {
    resolvedManagerFromAuth = false;
    setManagerSelectDisabled(false);
    setAuthStatus("User context not resolved. Enter your work email to auto-map manager scope.");
    return;
  }

  setAuthStatus("Resolving user hierarchy context...");

  try {
    const response = await fetch(`/api/auth/context?email=${encodeURIComponent(userEmail)}`);
    const payload = await response.json();

    if (!response.ok || !payload.managerScope?.managerId) {
      resolvedManagerFromAuth = false;
      setManagerSelectDisabled(false);
      setAuthStatus(payload.message || "Unable to resolve user manager mapping. Select manager manually.");
      return;
    }

    selectedManagerId = payload.managerScope.managerId;
    saveState(STORAGE_KEYS.managerId, selectedManagerId);

    resolvedManagerFromAuth = true;
    setManagerSelectDisabled(true);

    const userName = payload.user?.name || userEmail;
    const managerName = payload.managerScope.managerName || payload.managerScope.managerId;
    const managerMeta = formatManagerMeta(payload.managerScope.managerLevel, payload.managerScope.managerTitle);
    const roleNote = payload.managerScope.isManagerUser ? "(manager self-scope)" : "";
    const managerLabel = managerMeta ? `${managerName} [${managerMeta}]` : managerName;
    setAuthStatus(`Logged in as ${userName}. Manager scope: ${managerLabel} ${roleNote}`.trim());

    const nameEl = document.getElementById("profileName");
    if (nameEl && userName) nameEl.textContent = userName;
    updateProfileStrip();
    renderManagerOptions();
  } catch {
    resolvedManagerFromAuth = false;
    setManagerSelectDisabled(false);
    setAuthStatus("Failed to resolve user context. You can select manager manually.");
  }
}

function renderManagerOptions() {
  if (!managerSelect) return;
  managerSelect.innerHTML = "";

  if (managers.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "All managers (unscoped)";
    managerSelect.appendChild(option);
    return;
  }

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "All managers (unscoped)";
  managerSelect.appendChild(defaultOption);

  managers.forEach((manager) => {
    const option = document.createElement("option");
    option.value = manager.id;
    const managerMeta = formatManagerMeta(manager.level, manager.title);
    option.textContent = managerMeta
      ? `${manager.name} [${managerMeta}]`
      : `${manager.name} (${manager.id})`;
    option.title = manager.orgUnit || manager.title || manager.id;
    managerSelect.appendChild(option);
  });

  managerSelect.value = selectedManagerId;
  if (resolvedManagerFromAuth && selectedManagerId) {
    managerSelect.title = "Manager is auto-mapped from logged-in user context.";
  } else {
    managerSelect.title = "Choose manager for team scope.";
  }
}

async function loadManagers() {
  try {
    const response = await fetch("/api/hierarchy/managers");
    const payload = await response.json();

    if (!response.ok) {
      managers = [];
      renderManagerOptions();
      return;
    }

    managers = Array.isArray(payload.managers) ? payload.managers : [];

    if (selectedManagerId && !managers.some((manager) => manager.id === selectedManagerId)) {
      selectedManagerId = "";
      saveState(STORAGE_KEYS.managerId, selectedManagerId);
    }

    if (!selectedManagerId && managers.length > 0) {
      selectedManagerId = managers[0].id;
      saveState(STORAGE_KEYS.managerId, selectedManagerId);
    }

    renderManagerOptions();
  } catch {
    managers = [];
    renderManagerOptions();
  }
}

function applyViewMode(mode) {
  viewMode = mode === "manager" ? "manager" : "personal";
  saveState(STORAGE_KEYS.viewMode, viewMode);

  document.querySelectorAll("[data-view]").forEach((el) => {
    const cardMode = el.getAttribute("data-view");
    const visible = cardMode === "shared" || cardMode === viewMode;
    el.classList.toggle("hidden", !visible);
  });

  if (personalModeBtn) personalModeBtn.classList.toggle("active", viewMode === "personal");
  if (managerModeBtn) managerModeBtn.classList.toggle("active", viewMode === "manager");

  if (viewMode === "personal") {
    stopTeamAutoRefresh();
    startJiraAutoRefresh();
    loadHelpRequests();
  } else {
    stopJiraAutoRefresh();
    if (viewMode === "manager") {
      if (!teamSummary) loadTeamSummary();
      startTeamAutoRefresh();
      updateWeeklySummariesBadge();
      loadManagerBlockers();
    }
  }
  if (viewMode === "manager") {
    if (weeklySummariesWeekLabel) weeklySummariesWeekLabel.textContent = "Week of " + formatWeekLabel(weeklySummariesWeekKey || getWeekKey(new Date()));
  }
}

async function loadMyWeeklySummary() {
  const weekKey = getWeekKey(new Date());
  if (weeklySummaryWeekLabel) weeklySummaryWeekLabel.textContent = "Week of " + formatWeekLabel(weekKey);
  if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Loading...";
  if (!userEmail) {
    if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Sign in to submit your weekly summary.";
    return;
  }
  try {
    const response = await fetch("/api/weekly-summary?weekKey=" + encodeURIComponent(weekKey) + "&userEmail=" + encodeURIComponent(userEmail));
    const data = await response.json();
    const template = appConfig.weeklySummaryTemplate || "Key deliverables:\n\nBlockers:\n\nNext week:\n";
    if (weeklySummaryText) {
      weeklySummaryText.value = data.summaryText || (template ? template : "");
    }
    if (weeklySummaryStatus) weeklySummaryStatus.textContent = data.submittedAt ? "Last submitted: " + new Date(data.submittedAt).toLocaleString() : "";
  } catch {
    if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Could not load your summary.";
  }
}

function applyWeeklySummaryTemplate() {
  if (!weeklySummaryText) return;
  const template = appConfig.weeklySummaryTemplate || "Key deliverables:\n\nBlockers:\n\nNext week:\n";
  const cur = (weeklySummaryText.value || "").trim();
  weeklySummaryText.value = cur ? cur + "\n\n" + template : template;
  if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Template applied. Edit and submit.";
}

async function submitWeeklySummary() {
  const weekKey = getWeekKey(new Date());
  const summaryText = weeklySummaryText ? weeklySummaryText.value : "";
  if (!userEmail) {
    if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Sign in to submit.";
    return;
  }
  if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Submitting...";
  try {
    const response = await fetch("/api/weekly-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail, weekKey, summaryText, managerId: selectedManagerId || "" })
    });
    const data = await response.json();
    if (!response.ok) {
      if (weeklySummaryStatus) weeklySummaryStatus.textContent = data.message || "Submit failed.";
      return;
    }
    if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Submitted. Your manager can see this report.";
    loadStreakBadges();
  } catch {
    if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Network error.";
  }
}

async function loadTeamWeeklySummaries() {
  if (!selectedManagerId) {
    if (weeklySummariesStatus) weeklySummariesStatus.textContent = "Manager scope not set. Refresh the page after signing in as manager.";
    return;
  }
  if (weeklySummariesStatus) weeklySummariesStatus.textContent = "Loading...";
  try {
    const response = await fetch("/api/weekly-summary?managerId=" + encodeURIComponent(selectedManagerId) + "&weekKey=" + encodeURIComponent(weeklySummariesWeekKey));
    const data = await response.json();
    if (!response.ok) {
      if (weeklySummariesStatus) weeklySummariesStatus.textContent = data.message || "Failed to load.";
      return;
    }
    renderTeamWeeklySummaries(data.reportees || []);
    if (weeklySummariesStatus) weeklySummariesStatus.textContent = data.reportees.length + " reportees. " + (data.reportees.filter((r) => r.submittedAt).length) + " submitted for this week.";
    updateWeeklySummariesBadge();
  } catch {
    if (weeklySummariesStatus) weeklySummariesStatus.textContent = "Could not load team summaries.";
  }
}

async function updateWeeklySummariesBadge() {
  const badge = document.getElementById("weeklySummariesBadge");
  if (!badge || !selectedManagerId) return;
  const weekKey = weeklySummariesWeekKey || getWeekKey(new Date());
  try {
    const response = await fetch("/api/weekly-summary?managerId=" + encodeURIComponent(selectedManagerId) + "&weekKey=" + encodeURIComponent(weekKey));
    const data = await response.json();
    if (response.ok && Array.isArray(data.reportees)) {
      const total = data.reportees.length;
      const submitted = data.reportees.filter((r) => r.submittedAt).length;
      badge.textContent = submitted + "/" + total;
      badge.classList.toggle("hidden", total === 0);
    }
  } catch (_) {}
}

function renderTeamWeeklySummaries(reportees) {
  if (!weeklySummariesList) return;
  weeklySummariesList.innerHTML = "";
  reportees.forEach((r) => {
    const card = document.createElement("div");
    card.className = "focus-item weekly-summary-reportee";
    const name = document.createElement("strong");
    name.textContent = (r.userName || r.userEmail || "—") + (r.userEmail ? " (" + r.userEmail + ")" : "");
    card.appendChild(name);
    const body = document.createElement("span");
    body.className = "weekly-summary-reportee-body" + (r.summaryText ? "" : " muted");
    body.textContent = r.summaryText ? r.summaryText : "No submission yet.";
    card.appendChild(body);
    if (r.submittedAt) {
      const meta = document.createElement("div");
      meta.className = "weekly-summary-meta";
      meta.textContent = "Submitted " + new Date(r.submittedAt).toLocaleString();
      card.appendChild(meta);
    }
    weeklySummariesList.appendChild(card);
  });
}

function weeklySummariesModalEscape(e) {
  if (e.key === "Escape") closeWeeklySummariesModal();
}

function openWeeklySummariesModal() {
  if (!weeklySummariesModal) return;
  if (weeklySummariesWeekLabel) weeklySummariesWeekLabel.textContent = "Week of " + formatWeekLabel(weeklySummariesWeekKey || getWeekKey(new Date()));
  weeklySummariesModal.classList.add("open");
  weeklySummariesModal.setAttribute("aria-hidden", "false");
  document.addEventListener("keydown", weeklySummariesModalEscape);
  const remindEl = document.getElementById("weeklySummariesRemindList");
  const rollupEl = document.getElementById("weeklySummariesRollupPanel");
  if (remindEl) { remindEl.textContent = ""; remindEl.classList.add("hidden"); }
  if (rollupEl) { rollupEl.innerHTML = ""; rollupEl.classList.add("hidden"); }
  loadTeamWeeklySummaries();
  updateWeeklySummariesBadge();
}

function closeWeeklySummariesModal() {
  if (!weeklySummariesModal) return;
  weeklySummariesModal.classList.remove("open");
  weeklySummariesModal.setAttribute("aria-hidden", "true");
  document.removeEventListener("keydown", weeklySummariesModalEscape);
}

function suggestWeeklySummaryFromJira() {
  if (!weeklySummaryText) return;
  const lines = [];
  if (jiraIssues.length === 0) {
    if (weeklySummaryStatus) weeklySummaryStatus.textContent = "No Jira issues loaded. Use the Jira card Refresh first, or configure JIRA_* in .env.";
    return;
  }
  lines.push("This week I worked on:");
  jiraIssues.slice(0, 15).forEach((issue) => {
    lines.push("- " + (issue.key || "") + ": " + (issue.summary || "").trim());
  });
  const suggestion = lines.join("\n");
  const current = (weeklySummaryText.value || "").trim();
  weeklySummaryText.value = current ? current + "\n\n" + suggestion : suggestion;
  if (weeklySummaryStatus) weeklySummaryStatus.textContent = "Added " + jiraIssues.length + " Jira item(s). Edit and submit.";
}

async function fetchReminderList() {
  const el = document.getElementById("weeklySummariesRemindList");
  if (!el || !selectedManagerId) return;
  const weekKey = weeklySummariesWeekKey || getWeekKey(new Date());
  try {
    const response = await fetch("/api/weekly-summary/reminder?managerId=" + encodeURIComponent(selectedManagerId) + "&weekKey=" + encodeURIComponent(weekKey));
    const data = await response.json();
    if (response.ok && Array.isArray(data.nonSubmitters)) {
      const names = data.nonSubmitters.map((r) => r.name || r.email).filter(Boolean);
      el.textContent = names.length ? "Not yet submitted: " + names.join(", ") : "Everyone has submitted.";
      el.classList.remove("hidden");
    }
  } catch (_) {
    if (el) el.textContent = "Could not load list.";
    el.classList.remove("hidden");
  }
}

async function fetchRollup() {
  const panel = document.getElementById("weeklySummariesRollupPanel");
  if (!panel || !selectedManagerId) return;
  const weekKey = weeklySummariesWeekKey || getWeekKey(new Date());
  panel.innerHTML = "<span class='muted'>Loading roll-up&#8230;</span>";
  panel.classList.remove("hidden");
  try {
    const response = await fetch(
      "/api/weekly-summary/rollup?managerId=" +
      encodeURIComponent(selectedManagerId) +
      "&weekKey=" +
      encodeURIComponent(weekKey) +
      "&userEmail=" +
      encodeURIComponent(userEmail || "")
    );
    const data = await response.json();
    if (!response.ok) {
      panel.innerHTML = "<span class='muted'>Could not load roll-up.</span>";
      return;
    }
    const items = data.items || [];
    const submitted = items.filter((i) => i.submittedAt);
    const missing = items.filter((i) => !i.submittedAt);
    // Build the consolidated paragraph for copy
    const paragraphLines = submitted.map((i) => {
      const text = (i.summaryText || "").trim().replace(/\n+/g, " ");
      return i.name + ": " + text;
    });
    if (missing.length) {
      paragraphLines.push("No submission from: " + missing.map((i) => i.name).join(", ") + ".");
    }
    const paragraph = paragraphLines.join(" ");

    let html = "<div class='rollup-header'><strong>Roll-up — Week of " + formatWeekLabel(weekKey) + "</strong>";
    html += " <span class='chip'>" + submitted.length + "/" + items.length + " submitted</span>";
    html += "<button type='button' class='rollup-copy-btn btn-secondary' id='rollupCopyBtn'>Copy paragraph</button></div>";
    html += "<div class='rollup-paragraph' id='rollupParagraphText'>" + escapeHtml(paragraph) + "</div>";
    html += "<div class='rollup-items'>";
    items.forEach((item) => {
      const cls = item.submittedAt ? "rollup-item" : "rollup-item rollup-item-missing";
      html += "<div class='" + cls + "'>";
      html += "<div class='rollup-item-name'>" + escapeHtml(item.name || item.email) + (item.submittedAt ? "" : " <span class='chip chip-warn'>Not submitted</span>") + "</div>";
      if (item.summaryText) {
        html += "<div class='rollup-item-text'>" + escapeHtml(item.summaryText) + "</div>";
      } else {
        html += "<div class='rollup-item-text muted'>No submission for this week.</div>";
      }
      if (item.submittedAt) {
        html += "<div class='rollup-item-meta'>Submitted " + new Date(item.submittedAt).toLocaleString() + "</div>";
      }
      html += "</div>";
    });
    html += "</div>";
    if (typeof data.recipientsCovered === "number") {
      html += "<div class='rollup-meta muted'>Notifications sent to " + data.recipientsCovered + " recipient(s).";
      if (Array.isArray(data.recipientsSkipped) && data.recipientsSkipped.length) {
        html += " Skipped (missing email): " + escapeHtml(data.recipientsSkipped.join(", "));
      }
      html += "</div>";
    }
    panel.innerHTML = html;

    // Refresh bell count immediately after roll-up notifications are generated.
    fetchNotifications();

    const copyBtn = document.getElementById("rollupCopyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(paragraph).then(() => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "Copy paragraph"; }, 2000);
        }).catch(() => {
          copyBtn.textContent = "Copy failed";
          setTimeout(() => { copyBtn.textContent = "Copy paragraph"; }, 2000);
        });
      });
    }
  } catch (_) {
    panel.innerHTML = "<span class='muted'>Could not load roll-up.</span>";
  }
}

async function exportTeamWeek() {
  if (!selectedManagerId) return;
  const weekKey = weeklySummariesWeekKey || getWeekKey(new Date());
  try {
    const response = await fetch("/api/weekly-summary/export?managerId=" + encodeURIComponent(selectedManagerId) + "&weekKey=" + encodeURIComponent(weekKey));
    const data = await response.json();
    if (!response.ok) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "team-week-" + weekKey + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (_) {}
}

function wireWeeklySummary() {
  if (weeklySummarySubmitBtn) weeklySummarySubmitBtn.addEventListener("click", submitWeeklySummary);
  const weeklySummaryTemplateBtn = document.getElementById("weeklySummaryTemplateBtn");
  if (weeklySummaryTemplateBtn) weeklySummaryTemplateBtn.addEventListener("click", applyWeeklySummaryTemplate);
  if (weeklySummarySuggestJiraBtn) weeklySummarySuggestJiraBtn.addEventListener("click", suggestWeeklySummaryFromJira);
  if (weeklySummariesOpenBtn) weeklySummariesOpenBtn.addEventListener("click", openWeeklySummariesModal);
  const remindBtn = document.getElementById("weeklySummariesRemindBtn");
  if (remindBtn) remindBtn.addEventListener("click", fetchReminderList);
  const rollupBtn = document.getElementById("weeklySummariesRollupBtn");
  if (rollupBtn) rollupBtn.addEventListener("click", fetchRollup);
  const exportBtn = document.getElementById("weeklySummariesExportBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportTeamWeek);
  if (weeklySummariesModalClose) weeklySummariesModalClose.addEventListener("click", closeWeeklySummariesModal);
  if (weeklySummariesModal) {
    weeklySummariesModal.addEventListener("click", (e) => { if (e.target === weeklySummariesModal) closeWeeklySummariesModal(); });
  }
  if (weeklySummariesPrevWeek) {
    weeklySummariesPrevWeek.addEventListener("click", () => {
      const [y, m, d] = weeklySummariesWeekKey.split("-").map(Number);
      const mon = new Date(y, m - 1, d);
      mon.setDate(mon.getDate() - 7);
      weeklySummariesWeekKey = getWeekKey(mon);
      if (weeklySummariesWeekLabel) weeklySummariesWeekLabel.textContent = "Week of " + formatWeekLabel(weeklySummariesWeekKey);
      loadTeamWeeklySummaries();
    });
  }
  if (weeklySummariesNextWeek) {
    weeklySummariesNextWeek.addEventListener("click", () => {
      const [y, m, d] = weeklySummariesWeekKey.split("-").map(Number);
      const mon = new Date(y, m - 1, d);
      mon.setDate(mon.getDate() + 7);
      weeklySummariesWeekKey = getWeekKey(mon);
      if (weeklySummariesWeekLabel) weeklySummariesWeekLabel.textContent = "Week of " + formatWeekLabel(weeklySummariesWeekKey);
      loadTeamWeeklySummaries();
    });
  }
  if (weeklySummariesRefreshBtn) {
    weeklySummariesRefreshBtn.addEventListener("click", () => {
      loadTeamWeeklySummaries();
      updateWeeklySummariesBadge();
    });
  }
}

function wireEvents() {
  if (notesEl) {
    notesEl.addEventListener("input", () => {
      saveState(STORAGE_KEYS.notes, notesEl.value);
    });
  }
  const notesSuggestCalendarBtn = document.getElementById("notesSuggestCalendarBtn");
  if (notesSuggestCalendarBtn) notesSuggestCalendarBtn.addEventListener("click", suggestNotesFromCalendar);

  if (resetTasksBtn) {
    resetTasksBtn.addEventListener("click", () => {
      const jiraTasks = tasks.filter((t) => t.fromJira);
      tasks = appConfig.defaultTasks.map((task) => ({ ...task, done: false }));
      tasks.push(...jiraTasks);
      saveState(STORAGE_KEYS.tasks, tasks);
      renderTasks();
      renderFocusSummary();
      renderPerformanceKpis();
      renderAlerts();
    });
  }

  if (refreshJiraBtn) {
    refreshJiraBtn.addEventListener("click", loadJiraIssues);
  }

  if (helpSubmitBtn) {
    helpSubmitBtn.addEventListener("click", submitHelpRequest);
  }
  if (refreshManagerBlockersBtn) {
    refreshManagerBlockersBtn.addEventListener("click", loadManagerBlockers);
  }
  if (managerBlockersList) {
    managerBlockersList.addEventListener("click", (e) => {
      const target = e.target;
      if (!target || typeof target.getAttribute !== "function") return;
      const id = target.getAttribute("data-blocker-id");
      const action = target.getAttribute("data-blocker-action");
      if (!id) return;
      if (action === "resolve") {
        resolveBlocker(id);
        return;
      }
      notifyBlocker(id);
    });
  }
  if (helpRequestsList) {
    helpRequestsList.addEventListener("click", (e) => {
      const target = e.target;
      if (!target || typeof target.getAttribute !== "function") return;
      const id = target.getAttribute("data-blocker-id");
      const action = target.getAttribute("data-blocker-action");
      if (id && action === "resolve") resolveBlocker(id);
    });
  }

  if (savePerfBtn) {
    savePerfBtn.addEventListener("click", () => {
      performanceState.attendance = clamp(Number(inputAttendance?.value || 0), 0, 100);
      performanceState.engagement = clamp(Number(inputEngagement?.value || 0), 0, 100);
      performanceState.trackedHours = clamp(Number(inputTrackedHours?.value || 0), 0, 24);
      performanceState.plannedHours = clamp(Number(inputPlannedHours?.value || 8), 1, 24);

      const score = calculateProductivityScore();
      updateTrendWithToday(score);

      saveState(STORAGE_KEYS.performance, performanceState);
      renderPerformanceKpis();
      renderFocusSummary();
      renderAlerts();
    });
  }

  if (personalModeBtn) personalModeBtn.addEventListener("click", () => applyViewMode("personal"));
  if (managerModeBtn) managerModeBtn.addEventListener("click", () => applyViewMode("manager"));
  if (refreshTeamBtn) refreshTeamBtn.addEventListener("click", loadTeamSummary);
  if (sprintSaveBtn) sprintSaveBtn.addEventListener("click", saveSprintWindow);
  if (applyUserBtn) {
    applyUserBtn.addEventListener("click", async () => {
      userEmail = String(userEmailInput?.value || "").trim().toLowerCase();
      localStorage.setItem(STORAGE_KEYS.userEmail, userEmail);
      calendarNotes = loadCalendarNotesState(userEmail);
      renderCalendar();
      await resolveUserContext();
      await loadHelpRequests();
      if (viewMode === "manager") {
        loadTeamSummary();
        loadManagerBlockers();
      } else {
        loadCalendarEventsForMonth();
      }
      loadSprintWindow();
    });
  }
  if (managerSelect) {
    managerSelect.addEventListener("change", () => {
      if (resolvedManagerFromAuth) {
        managerSelect.value = selectedManagerId;
        return;
      }
      selectedManagerId = managerSelect.value;
      saveState(STORAGE_KEYS.managerId, selectedManagerId);
      loadTeamSummary();
      loadManagerBlockers();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem(STORAGE_KEYS.loggedIn);
        localStorage.removeItem(STORAGE_KEYS.role);
        localStorage.removeItem(STORAGE_KEYS.userEmail);
      } catch (_) {}
      window.location.href = "/login.html";
    });
  }

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
}

async function init() {
  applyTheme(getTheme());

  let loginRole = "";
  let hasLogin = false;
  try {
    hasLogin = localStorage.getItem(STORAGE_KEYS.loggedIn) === "true";
    loginRole = String(localStorage.getItem(STORAGE_KEYS.role) || "").trim().toLowerCase();
  } catch (_) {}

  if (!hasLogin || (loginRole !== "manager" && loginRole !== "employee")) {
    const rememberedEmail = String(loadState(STORAGE_KEYS.userEmail, "")).trim().toLowerCase();
    if (rememberedEmail) {
      try {
        const response = await fetch("/api/auth/context?email=" + encodeURIComponent(rememberedEmail));
        const data = await response.json();
        if (response.ok && data && data.user) {
          loginRole = data.user.role === "manager" ? "manager" : "employee";
          localStorage.setItem(STORAGE_KEYS.loggedIn, "true");
          localStorage.setItem(STORAGE_KEYS.role, loginRole);
          localStorage.setItem(STORAGE_KEYS.userEmail, rememberedEmail);
          hasLogin = true;
        }
      } catch (_) {}
    }
  }

  if (!hasLogin || (loginRole !== "manager" && loginRole !== "employee")) {
    window.location.href = "/login.html";
    return;
  }

  viewMode = loginRole === "manager" ? "manager" : "personal";
  if (viewToggle) viewToggle.style.display = "none";
  if (userBadge) {
    userEmail = String(loadState(STORAGE_KEYS.userEmail, "")).trim().toLowerCase();
    userBadge.textContent = (loginRole === "manager" ? "Manager: " : "Employee: ") + (userEmail || "—");
  }

  try {
    const response = await fetch("/api/dashboard");
    if (response.ok) {
      appConfig = await response.json();
    }
  } catch {
    appConfig = fallbackConfig;
  }

  const defaultTasks = Array.isArray(appConfig.defaultTasks) ? appConfig.defaultTasks : [];

  tasks = loadState(STORAGE_KEYS.tasks, defaultTasks);
  if (Array.isArray(tasks)) {
    tasks = tasks.filter((task) => !REMOVED_DEFAULT_TASK_TITLES.has(String(task?.title || "")));
    saveState(STORAGE_KEYS.tasks, tasks);
  }
  performanceState = loadState(STORAGE_KEYS.performance, performanceState);
  const role = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEYS.role) : null;
  const defaultsByRole = appConfig.performanceDefaultsByRole && appConfig.performanceDefaultsByRole[role || "employee"];
  if (defaultsByRole && typeof defaultsByRole === "object") {
    performanceState.attendance = performanceState.attendance ?? defaultsByRole.attendance;
    performanceState.engagement = performanceState.engagement ?? defaultsByRole.engagement;
    performanceState.trackedHours = performanceState.trackedHours ?? defaultsByRole.trackedHours;
    performanceState.plannedHours = performanceState.plannedHours ?? defaultsByRole.plannedHours;
  }

  selectedManagerId = loadState(STORAGE_KEYS.managerId, "");
  if (!userEmail) userEmail = String(loadState(STORAGE_KEYS.userEmail, "")).trim().toLowerCase();

  if (notesEl) notesEl.value = loadState(STORAGE_KEYS.notes, "");
  if (userEmailInput) userEmailInput.value = userEmail;

  calendarNotes = loadCalendarNotesState(userEmail);
  helpRequests = [];
  managerHelpRequests = [];
  if (helpSince) helpSince.value = new Date().toISOString().slice(0, 10);
  weeklySummariesWeekKey = getWeekKey(new Date());

  renderDate();
  renderQuickLinks();
  renderTasks();
  renderCalendar();
  renderPerformanceKpis();
  renderFocusSummary();
  renderAlerts();
  renderHelpRequests();
  renderJiraIssues();
  wireEvents();
  wireCalendarNoteModal();
  wireCalendarNav();
  wireWeeklySummary();
  wireNotifications();

  await loadJiraIssues();
  await loadHelpRequests();
  await loadSprintWindow();
  await loadStreakBadges();

  try {
    await loadManagers();
    await resolveUserContext();
    await loadManagerBlockers();
  } catch (_) {
    setAuthStatus("User context could not be fully resolved. Jira sync is still available.");
  }

  fetchNotifications();

  applyViewMode(viewMode);
  updateProfileStrip();
  updateDashboardKpiCards();

  if (viewMode === "personal" && userEmail) {
    loadMyWeeklySummary();
    loadCalendarEventsForMonth();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (viewMode === "personal") loadJiraIssues();
    else if (viewMode === "manager") {
      loadTeamSummary();
      updateWeeklySummariesBadge();
    }
  });
}

function wireCalendarNav() {
  const prevBtn = document.getElementById("calendarPrevMonth");
  const nextBtn = document.getElementById("calendarNextMonth");
  const todayBtn = document.getElementById("calendarToday");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (calendarViewMonth === 0) {
        calendarViewMonth = 11;
        calendarViewYear -= 1;
      } else {
        calendarViewMonth -= 1;
      }
      renderCalendar();
      loadCalendarEventsForMonth();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (calendarViewMonth === 11) {
        calendarViewMonth = 0;
        calendarViewYear += 1;
      } else {
        calendarViewMonth += 1;
      }
      renderCalendar();
      loadCalendarEventsForMonth();
    });
  }
  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      const now = new Date();
      calendarViewYear = now.getFullYear();
      calendarViewMonth = now.getMonth();
      renderCalendar();
      loadCalendarEventsForMonth();
    });
  }
}

init();
