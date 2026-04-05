const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { host, port, publicDir, dataFile, hierarchyFile, rawDataFile, weeklySummariesFile, blockersFile, notificationsFile, sprintWindowFile } = require("./config");
const { readDashboardData } = require("./dataStore");
const { fetchJiraIssues, fetchTeamSummary } = require("./jiraClient");
const { readHierarchyData, getManagers, getReportees, resolveUserContext, resolveUserContextFromEmail } = require("./hierarchyStore");
const { fetchCalendarEvents } = require("./azureGraphClient");
const { readRawTeamData, aggregateRawMetrics } = require("./rawDataStore");
const { getWeekKey, submitSummary, getSummariesForManager, getMySummary, readSummaries, getRollupParagraph, mapReporteesToSummaries } = require("./weeklySummaryStore");
const { createBlocker, listBlockers, updateBlockerById, getBlockerById } = require("./blockerStore");
const { readSprintWindow, setSprintWindow } = require("./sprintStore");
const { TEAM_ACCESS_ALLOWLIST, isAllowedUserEmail, resolveAllowedEmailForIdentity } = require("./accessControl");
const { createBulkNotifications, getForUser, getUnreadCount, markAllReadForUser, markReadById } = require("./notificationStore");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function postWebhookJson(urlString, payload) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const body = JSON.stringify(payload || {});
      const isHttps = url.protocol === "https:";
      const transport = isHttps ? https : http;
      const req = transport.request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(body)
        }
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, statusCode: res.statusCode, response: data });
            return;
          }
          reject(new Error(`Webhook failed with status ${res.statusCode}`));
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getWebhookProvider(urlString) {
  const explicit = String(process.env.BLOCKER_NOTIFY_PROVIDER || "").trim().toLowerCase();
  if (explicit) return explicit;
  const url = String(urlString || "").toLowerCase();
  if (url.includes("webhook.office.com") || url.includes("office.com/webhook")) {
    return "teams";
  }
  return "generic";
}

function buildTeamsBlockerPayload(blocker, actorEmail, notifiedAt) {
  const impact = String(blocker?.impact || "medium").toUpperCase();
  const title = "Help / Unblock Me Notification";
  const details = String(blocker?.details || "No details provided.");
  const person = String(blocker?.createdByName || blocker?.createdByEmail || "Unknown");

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: `${title}: ${person}`,
    themeColor: impact === "HIGH" ? "C0392B" : impact === "MEDIUM" ? "E67E22" : "2E86C1",
    title,
    sections: [
      {
        activityTitle: `${person} reported a blocker`,
        text: details,
        facts: [
          { name: "Impact", value: impact },
          { name: "Type", value: String(blocker?.type || "technical") },
          { name: "Owner", value: String(blocker?.owner || "N/A") },
          { name: "Blocked Since", value: String(blocker?.since || "today") },
          { name: "Reporter", value: String(blocker?.createdByEmail || "N/A") },
          { name: "Manager", value: String(blocker?.managerId || "N/A") },
          { name: "Actor", value: String(actorEmail || "N/A") },
          { name: "Notified At", value: String(notifiedAt || "") }
        ],
        markdown: true
      }
    ]
  };
}

function buildBlockerNotifyPayload(webhookUrl, blocker, actorEmail, notifiedAt) {
  const provider = getWebhookProvider(webhookUrl);
  if (provider === "teams") {
    return buildTeamsBlockerPayload(blocker, actorEmail, notifiedAt);
  }

  return {
    title: "Help / Unblock Me Notification",
    blocker,
    actorEmail,
    notifiedAt
  };
}

function computeSprintDaysLeft(endDate) {
  const end = new Date(`${String(endDate || "")}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function compactIdentity(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function compactNoDigits(value) {
  return compactIdentity(value).replace(/[0-9]/g, "");
}

function previousWeekKey(weekKey) {
  const [y, m, d] = String(weekKey || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 7);
  return getWeekKey(date);
}

function computeConsecutiveWeekStreak(weekSet) {
  const keys = Array.from(weekSet || []).filter(Boolean).sort().reverse();
  if (keys.length === 0) return 0;
  let streak = 0;
  let current = keys[0];
  while (weekSet.has(current)) {
    streak += 1;
    current = previousWeekKey(current);
    if (!current) break;
  }
  return streak;
}

function matchesUserIdentity(value, candidatesCompact, candidatesCompactNoDigits) {
  const c = compactIdentity(value);
  const nd = compactNoDigits(value);
  return candidatesCompact.has(c) || candidatesCompactNoDigits.has(nd);
}

function buildUserIdentityCandidates(userEmail, localContext, employeeRecord) {
  const raw = [
    userEmail,
    localContext?.user?.email,
    localContext?.user?.id,
    localContext?.user?.name,
    localContext?.user?.jiraAssignee,
    employeeRecord?.email,
    employeeRecord?.id,
    employeeRecord?.name,
    employeeRecord?.jiraAssignee
  ];
  if (Array.isArray(employeeRecord?.aliases)) {
    raw.push(...employeeRecord.aliases);
  }
  return {
    compact: new Set(raw.map(compactIdentity).filter(Boolean)),
    compactNoDigits: new Set(raw.map(compactNoDigits).filter(Boolean))
  };
}

function computeSummaryStreak(summaries, identity) {
  const submittedWeeks = new Set(
    (summaries || [])
      .filter((s) => matchesUserIdentity(s?.userEmail, identity.compact, identity.compactNoDigits) || matchesUserIdentity(s?.userName, identity.compact, identity.compactNoDigits))
      .map((s) => String(s.weekKey || "").trim())
      .filter(Boolean)
  );
  return computeConsecutiveWeekStreak(submittedWeeks);
}

function computeExecutionStreak(records, identity) {
  const weekly = new Map();
  (records || []).forEach((row) => {
    if (!matchesUserIdentity(row?.employeeId, identity.compact, identity.compactNoDigits)) return;
    const date = new Date(row?.date);
    if (Number.isNaN(date.getTime())) return;
    const weekKey = getWeekKey(date);
    const bucket = weekly.get(weekKey) || { completed: 0, planned: 0 };
    bucket.completed += Number(row?.completedTasks || 0);
    bucket.planned += Number(row?.plannedTasks || 0);
    weekly.set(weekKey, bucket);
  });

  const qualifyingWeeks = new Set();
  weekly.forEach((bucket, weekKey) => {
    const pct = bucket.planned > 0 ? (bucket.completed / bucket.planned) * 100 : 0;
    if (pct >= 80) qualifyingWeeks.add(weekKey);
  });

  return computeConsecutiveWeekStreak(qualifyingWeeks);
}

function sendStaticFile(reqPath, res) {
  const requestPath = reqPath === "/" ? "/login.html" : reqPath;
  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  // Prevent path traversal outside the public directory.
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        // For direct route hits in production, fall back to login page for non-API, extensionless paths.
        const looksLikeAppRoute = !path.extname(requestPath) && !requestPath.startsWith("/api/");
        if (looksLikeAppRoute) {
          const loginPath = path.join(publicDir, "login.html");
          fs.readFile(loginPath, (loginErr, loginContent) => {
            if (loginErr) {
              res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
              res.end("404 Not Found");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(loginContent);
          });
          return;
        }

        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }

      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Internal Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = contentTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("400 Bad Request");
    return;
  }

  const requestUrl = new URL(req.url, `http://${host}:${port}`);
  const pathname = requestUrl.pathname;

  if (pathname === "/" || pathname === "/login" || pathname === "/login.html") {
    sendStaticFile("/login.html", res);
    return;
  }

  if (pathname === "/api/dashboard") {
    const data = readDashboardData(dataFile);
    writeJson(res, 200, data);
    return;
  }

  if (pathname === "/api/health") {
    writeJson(res, 200, {
      ok: true,
      service: "allinonw-dashboard",
      time: new Date().toISOString()
    });
    return;
  }

  if (pathname === "/api/sprint-window" && req.method === "GET") {
    const sprint = readSprintWindow(sprintWindowFile);
    const daysLeft = computeSprintDaysLeft(sprint.endDate);
    writeJson(res, 200, {
      ...sprint,
      daysLeft,
      configured: Boolean(sprint.startDate && sprint.endDate)
    });
    return;
  }

  if (pathname === "/api/sprint-window" && req.method === "POST") {
    readBody(req)
      .then((body) => {
        let data;
        try {
          data = JSON.parse(body || "{}");
        } catch {
          writeJson(res, 400, { message: "Invalid JSON body." });
          return;
        }

        const actorEmail = String(data.actorEmail || "").trim().toLowerCase();
        if (!actorEmail) {
          writeJson(res, 400, { message: "actorEmail is required." });
          return;
        }

        const hierarchy = readHierarchyData(hierarchyFile);
        const context = resolveUserContext(hierarchy.employees, actorEmail);
        const isManager = String(context?.user?.role || "").toLowerCase() === "manager";
        if (!isManager) {
          writeJson(res, 403, { message: "Only managers can set sprint dates." });
          return;
        }

        try {
          const saved = setSprintWindow(sprintWindowFile, {
            startDate: data.startDate,
            endDate: data.endDate,
            updatedBy: actorEmail
          });
          writeJson(res, 200, {
            ...saved,
            daysLeft: computeSprintDaysLeft(saved.endDate),
            configured: true,
            success: true
          });
        } catch (error) {
          writeJson(res, 400, { message: error.message || "Could not save sprint dates." });
        }
      })
      .catch((err) => {
        writeJson(res, 500, { message: err.message || "Failed to read body." });
      });
    return;
  }

  if (pathname === "/api/hierarchy/managers") {
    const hierarchy = readHierarchyData(hierarchyFile);
    writeJson(res, 200, { managers: getManagers(hierarchy.employees) });
    return;
  }

  if (pathname === "/api/calendar/events" && req.method === "GET") {
    const email = requestUrl.searchParams.get("email") || requestUrl.searchParams.get("userEmail") || "";
    const fromParam = requestUrl.searchParams.get("from") || requestUrl.searchParams.get("start") || "";
    const toParam = requestUrl.searchParams.get("to") || requestUrl.searchParams.get("end") || "";
    if (!email) {
      writeJson(res, 400, { configured: false, events: [], message: "email or userEmail is required." });
      return;
    }
    const fromDate = fromParam ? new Date(fromParam) : new Date();
    const toDate = toParam ? new Date(toParam) : new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      writeJson(res, 400, { configured: false, events: [], message: "Invalid from/to dates." });
      return;
    }
    fetchCalendarEvents(email.trim(), fromDate.toISOString(), toDate.toISOString())
      .then((result) => writeJson(res, 200, result))
      .catch((err) => {
        console.log("[calendar/events] error", err && err.message);
        writeJson(res, 500, { configured: true, events: [], message: err && err.message ? String(err.message) : "Calendar request failed." });
      });
    return;
  }

  if (pathname === "/api/auth/context") {
    const email = String(requestUrl.searchParams.get("email") || req.headers["x-user-email"] || process.env.DEFAULT_USER_EMAIL || "")
      .trim()
      .toLowerCase();
    if (!email) {
      writeJson(res, 400, { message: "Provide user email via query param, x-user-email header, or DEFAULT_USER_EMAIL." });
      return;
    }

    if (!isAllowedUserEmail(email)) {
      writeJson(res, 403, {
        message: "Access denied. Your email is not in the authorized team list.",
        authorizedCount: TEAM_ACCESS_ALLOWLIST.length
      });
      return;
    }

    const hierarchy = readHierarchyData(hierarchyFile);
    const localContext = resolveUserContext(hierarchy.employees, email);
    if (localContext) {
      writeJson(res, 200, { ...localContext, source: "local" });
      return;
    }

    const context = resolveUserContextFromEmail(email);
    writeJson(res, 200, { ...context, source: "email_only" });
    return;
  }

  if (pathname === "/api/hierarchy/reports") {
    const managerId = requestUrl.searchParams.get("managerId") || "";
    const includeIndirect = requestUrl.searchParams.get("includeIndirect") !== "false";

    const hierarchy = readHierarchyData(hierarchyFile);
    const details = getReportees(hierarchy.employees, managerId, includeIndirect);

    if (!details.manager) {
      writeJson(res, 404, { message: "Manager not found for the given managerId." });
      return;
    }

    writeJson(res, 200, {
      manager: {
        id: details.manager.id,
        name: details.manager.name,
        email: details.manager.email,
        role: details.manager.role,
        level: details.manager.level || null,
        title: details.manager.title || null,
        orgUnit: details.manager.orgUnit || null
      },
      reportees: details.reportees,
      reporteeCount: details.reportees.length
    });
    return;
  }

  if (pathname === "/api/raw/team-data") {
    const managerId = requestUrl.searchParams.get("managerId") || "";
    const includeIndirect = requestUrl.searchParams.get("includeIndirect") !== "false";
    const hierarchy = readHierarchyData(hierarchyFile);
    const rawData = readRawTeamData(rawDataFile);

    if (managerId) {
      const details = getReportees(hierarchy.employees, managerId, includeIndirect);
      if (!details.manager) {
        writeJson(res, 404, { message: "Manager not found for the given managerId." });
        return;
      }

      const employeeIds = details.reportees.map((person) => person.id);
      writeJson(res, 200, {
        managerId,
        reporteeCount: details.reportees.length,
        rawMetrics: aggregateRawMetrics(rawData.records, employeeIds)
      });
      return;
    }

    writeJson(res, 200, {
      managerId: null,
      rawMetrics: aggregateRawMetrics(rawData.records)
    });
    return;
  }

  if (pathname === "/api/jira/issues") {
    const email = String(
      requestUrl.searchParams.get("email") ||
      req.headers["x-user-email"] ||
      ""
    ).trim().toLowerCase();

    let options = {};
    if (email) {
      const hierarchy = readHierarchyData(hierarchyFile);
      const context = resolveUserContext(hierarchy.employees, email);
      const user = context && context.user ? context.user : null;
      const emailLocal = email.includes("@") ? email.split("@")[0] : email;
      
      // Check for optional assignee map override
      const assigneeMapStr = String(process.env.JIRA_PERSONAL_ASSIGNEE_MAP || "").trim();
      let overrideAssignee = null;
      if (assigneeMapStr) {
        assigneeMapStr.split(";").forEach((pair) => {
          const [mapEmail, mapKey] = pair.split(":").map((s) => String(s).trim());
          if (mapEmail.toLowerCase() === email && mapKey) {
            overrideAssignee = mapKey;
          }
        });
      }
      
      const candidates = [
        overrideAssignee,
        user && user.jiraAssignee,
        user && user.name,
        user && user.email,
        user && user.id,
        email,
        emailLocal
      ].filter((value, idx, arr) => value && arr.indexOf(value) === idx);

      if (candidates.length) {
        options = { assignees: candidates };
      }
    }

    fetchJiraIssues(options)
      .then((payload) => writeJson(res, 200, payload))
      .catch((error) => {
        writeJson(res, 502, {
          configured: true,
          issues: [],
          message: error.message
        });
      });
    return;
  }

  if (pathname === "/api/team/summary") {
    const managerId = requestUrl.searchParams.get("managerId") || "";
    const includeIndirect = requestUrl.searchParams.get("includeIndirect") !== "false";

    let managerScope = {
      managerId: null,
      managerName: null,
      reporteeCount: 0,
      scopedAssignees: 0
    };

    if (managerId) {
      const hierarchy = readHierarchyData(hierarchyFile);
      const details = getReportees(hierarchy.employees, managerId, includeIndirect);

      if (!details.manager) {
        writeJson(res, 404, { message: "Manager not found for the given managerId." });
        return;
      }

      const assignees = details.reportees
        .map((person) => person.jiraAssignee || person.email || person.id)
        .filter(Boolean);
      const assigneeRoster = details.reportees.map((person) => ({
        id: person.id,
        name: person.name,
        email: person.email,
        jiraAssignee: person.jiraAssignee || person.email || person.id
      }));

      managerScope = {
        managerId: details.manager.id,
        managerName: details.manager.name,
        managerLevel: details.manager.level || null,
        managerTitle: details.manager.title || null,
        managerOrgUnit: details.manager.orgUnit || null,
        reporteeCount: details.reportees.length,
        scopedAssignees: assignees.length
      };

      fetchTeamSummary({ assignees, assigneeRoster })
        .then((payload) => {
          const rawData = readRawTeamData(rawDataFile);
          const employeeIds = details.reportees.map((person) => person.id);
          const rawMetrics = aggregateRawMetrics(rawData.records, employeeIds);
          writeJson(res, 200, { ...payload, managerScope, rawMetrics });
        })
        .catch((error) => {
          writeJson(res, 502, {
            configured: true,
            summary: null,
            message: error.message
          });
        });
      return;
    }

    fetchTeamSummary()
      .then((payload) => {
        const rawData = readRawTeamData(rawDataFile);
        const rawMetrics = aggregateRawMetrics(rawData.records);
        writeJson(res, 200, { ...payload, rawMetrics });
      })
      .catch((error) => {
        writeJson(res, 502, {
          configured: true,
          summary: null,
          message: error.message
        });
      });
    return;
  }

  if (pathname === "/api/blockers" && req.method === "GET") {
    const managerId = String(requestUrl.searchParams.get("managerId") || "").trim();
    const userEmail = String(requestUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
    const includeResolved = requestUrl.searchParams.get("includeResolved") === "true";

    if (userEmail) {
      const hierarchy = readHierarchyData(hierarchyFile);
      const context = resolveUserContext(hierarchy.employees, userEmail);
      const canonicalEmail = String(context?.user?.email || "").trim().toLowerCase();
      const emailLocal = userEmail.includes("@") ? userEmail.split("@")[0] : userEmail;
      const canonicalLocal = canonicalEmail.includes("@") ? canonicalEmail.split("@")[0] : canonicalEmail;
      const candidates = [userEmail, canonicalEmail, emailLocal, canonicalLocal]
        .filter((value, idx, arr) => value && arr.indexOf(value) === idx);

      const blockers = listBlockers(blockersFile, { managerId, includeResolved })
        .filter((row) => candidates.includes(String(row.createdByEmail || "").trim().toLowerCase()));
      writeJson(res, 200, { blockers, total: blockers.length });
      return;
    }

    const blockers = listBlockers(blockersFile, { managerId, includeResolved });
    writeJson(res, 200, { blockers, total: blockers.length });
    return;
  }

  if (pathname === "/api/blockers" && req.method === "POST") {
    readBody(req)
      .then((body) => {
        let data;
        try {
          data = JSON.parse(body || "{}");
        } catch {
          writeJson(res, 400, { message: "Invalid JSON body." });
          return;
        }

        const userEmail = String(data.userEmail || data.createdByEmail || "").trim().toLowerCase();
        const details = String(data.details || "").trim();
        if (!userEmail || !details) {
          writeJson(res, 400, { message: "userEmail and details are required." });
          return;
        }

        const hierarchy = readHierarchyData(hierarchyFile);
        const context = resolveUserContext(hierarchy.employees, userEmail);
        const canonicalEmail = String(context?.user?.email || "").trim().toLowerCase() || userEmail;
        const entry = createBlocker(blockersFile, {
          type: data.type,
          impact: data.impact,
          owner: data.owner,
          since: data.since,
          details,
          createdByEmail: canonicalEmail,
          createdByName: context?.user?.name || userEmail,
          managerId: data.managerId || context?.managerScope?.managerId || null,
          status: "open"
        });

        writeJson(res, 200, { success: true, blocker: entry });
      })
      .catch((err) => {
        writeJson(res, 500, { message: err.message || "Failed to read body." });
      });
    return;
  }

  if (pathname === "/api/blockers/notify" && req.method === "POST") {
    readBody(req)
      .then(async (body) => {
        let data;
        try {
          data = JSON.parse(body || "{}");
        } catch {
          writeJson(res, 400, { message: "Invalid JSON body." });
          return;
        }

        const id = String(data.id || "").trim();
        if (!id) {
          writeJson(res, 400, { message: "id is required." });
          return;
        }

        const blocker = getBlockerById(blockersFile, id);
        if (!blocker) {
          writeJson(res, 404, { message: "Blocker not found." });
          return;
        }

        const actorEmail = String(data.actorEmail || "").trim().toLowerCase();
        const notifiedAt = new Date().toISOString();
        const webhookUrl = String(
          process.env.BLOCKER_NOTIFY_WEBHOOK_URL ||
          process.env.BLOCKER_NOTIFY_TEAMS_WEBHOOK_URL ||
          ""
        ).trim();

        if (!webhookUrl) {
          const updated = updateBlockerById(blockersFile, id, {
            notifiedAt,
            notifyStatus: "recorded:no-webhook"
          });
          writeJson(res, 200, {
            success: true,
            configured: false,
            blocker: updated,
            message: "Notification recorded locally. Set BLOCKER_NOTIFY_WEBHOOK_URL to send to Teams."
          });
          return;
        }

        const payload = buildBlockerNotifyPayload(webhookUrl, blocker, actorEmail, notifiedAt);

        try {
          const webhookResult = await postWebhookJson(webhookUrl, payload);
          const updated = updateBlockerById(blockersFile, id, {
            notifiedAt,
            notifyStatus: `sent:${webhookResult.statusCode}`
          });
          writeJson(res, 200, {
            success: true,
            configured: true,
            blocker: updated,
            message: "Notification sent."
          });
        } catch (error) {
          writeJson(res, 502, {
            success: false,
            configured: true,
            message: error.message || "Failed to send webhook notification."
          });
        }
      })
      .catch((err) => {
        writeJson(res, 500, { message: err.message || "Failed to read body." });
      });
    return;
  }

  if (pathname === "/api/blockers/resolve" && req.method === "POST") {
    readBody(req)
      .then((body) => {
        let data;
        try {
          data = JSON.parse(body || "{}");
        } catch {
          writeJson(res, 400, { message: "Invalid JSON body." });
          return;
        }

        const id = String(data.id || "").trim();
        if (!id) {
          writeJson(res, 400, { message: "id is required." });
          return;
        }

        const blocker = getBlockerById(blockersFile, id);
        if (!blocker) {
          writeJson(res, 404, { message: "Blocker not found." });
          return;
        }

        const actorEmail = String(data.actorEmail || "").trim().toLowerCase();
        const updated = updateBlockerById(blockersFile, id, {
          status: "resolved",
          resolvedAt: new Date().toISOString(),
          resolvedByEmail: actorEmail || null
        });

        writeJson(res, 200, {
          success: true,
          blocker: updated,
          message: "Blocker marked as resolved."
        });
      })
      .catch((err) => {
        writeJson(res, 500, { message: err.message || "Failed to read body." });
      });
    return;
  }

  if (pathname === "/api/weekly-summary" && req.method === "POST") {
    readBody(req)
      .then((body) => {
        let data;
        try {
          data = JSON.parse(body || "{}");
        } catch {
          writeJson(res, 400, { message: "Invalid JSON body." });
          return;
        }
        const userEmail = String(data.userEmail || data.email || "").trim().toLowerCase();
        const weekKey = String(data.weekKey || "").trim() || getWeekKey(new Date());
        const summaryText = String(data.summaryText || "").trim();
        if (!userEmail) {
          writeJson(res, 400, { message: "userEmail is required." });
          return;
        }
        const hierarchy = readHierarchyData(hierarchyFile);
        const localCtx = resolveUserContext(hierarchy.employees, userEmail);
        const managerId = localCtx?.managerScope?.managerId || String(data.managerId || "").trim() || null;
        const userName = localCtx?.user?.name || userEmail;
        const entry = submitSummary(weeklySummariesFile, { weekKey, userEmail, userName, managerId, summaryText });
        writeJson(res, 200, { success: true, weekKey, submittedAt: entry.submittedAt });
      })
      .catch((err) => {
        writeJson(res, 500, { message: err.message || "Failed to read body." });
      });
    return;
  }

  if (pathname === "/api/weekly-summary" && req.method === "GET") {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const weekKey = requestUrl.searchParams.get("weekKey") || getWeekKey(new Date());
    const managerId = requestUrl.searchParams.get("managerId") || "";
    const userEmail = requestUrl.searchParams.get("userEmail") || "";

    if (userEmail && !managerId) {
      const my = getMySummary(weeklySummariesFile, userEmail, weekKey);
      writeJson(res, 200, { weekKey, summaryText: my ? my.summaryText : null, submittedAt: my ? my.submittedAt : null });
      return;
    }

    if (!managerId) {
      writeJson(res, 400, { message: "managerId is required to fetch team weekly summaries." });
      return;
    }

    const hierarchy = readHierarchyData(hierarchyFile);
    const details = getReportees(hierarchy.employees, managerId, true);
    if (!details.manager) {
      writeJson(res, 404, { message: "Manager not found for the given managerId." });
      return;
    }

    const submittedForManager = getSummariesForManager(weeklySummariesFile, managerId, weekKey);
    const sameWeekNoManager = readSummaries(weeklySummariesFile).filter((s) => s.weekKey === weekKey && !String(s.managerId || "").trim());
    const submitted = submittedForManager.concat(sameWeekNoManager);
    const reportees = mapReporteesToSummaries(details.reportees, submitted).map(({ reportee: r, summary: s }) => ({
      userEmail: (s && s.userEmail) || r.email,
      userName: r.name,
      summaryText: s ? s.summaryText : null,
      submittedAt: s ? s.submittedAt : null
    }));

    writeJson(res, 200, { weekKey, reportees });
    return;
  }

  if (pathname === "/api/streak-badges" && req.method === "GET") {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const userEmail = String(requestUrl.searchParams.get("userEmail") || req.headers["x-user-email"] || "")
      .trim()
      .toLowerCase();
    if (!userEmail) {
      writeJson(res, 400, { message: "userEmail is required." });
      return;
    }

    const hierarchy = readHierarchyData(hierarchyFile);
    const localContext = resolveUserContext(hierarchy.employees, userEmail);
    const employeeRecord = hierarchy.employees.find((e) => String(e.id || "") === String(localContext?.user?.id || "")) || null;
    const identity = buildUserIdentityCandidates(userEmail, localContext, employeeRecord);

    const summaries = readSummaries(weeklySummariesFile);
    const summaryStreak = computeSummaryStreak(summaries, identity);

    const rawData = readRawTeamData(rawDataFile);
    const executionStreak = computeExecutionStreak(rawData.records || [], identity);

    const badges = [
      {
        id: "completion-5x80",
        title: "5 Weeks Above 80% Completion",
        description: "Keep weekly execution above 80% for five consecutive weeks.",
        target: 5,
        streak: executionStreak,
        earned: executionStreak >= 5
      },
      {
        id: "summary-4x",
        title: "4 Weekly Summaries In A Row",
        description: "Submit your weekly summary for four consecutive weeks.",
        target: 4,
        streak: summaryStreak,
        earned: summaryStreak >= 4
      }
    ];

    writeJson(res, 200, {
      userEmail,
      badges,
      metrics: {
        executionStreak,
        summaryStreak
      }
    });
    return;
  }

  if (pathname.startsWith("/api/weekly-summary/reminder") && req.method === "GET") {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const managerId = requestUrl.searchParams.get("managerId") || "";
    const weekKey = requestUrl.searchParams.get("weekKey") || getWeekKey(new Date());
    if (!managerId) {
      writeJson(res, 400, { message: "managerId is required." });
      return;
    }
    const hierarchy = readHierarchyData(hierarchyFile);
    const details = getReportees(hierarchy.employees, managerId, true);
    if (!details.manager) {
      writeJson(res, 404, { message: "Manager not found." });
      return;
    }
    const submittedForManager = getSummariesForManager(weeklySummariesFile, managerId, weekKey);
    const sameWeekNoManager = readSummaries(weeklySummariesFile).filter((s) => s.weekKey === weekKey && !String(s.managerId || "").trim());
    const submitted = submittedForManager.concat(sameWeekNoManager);
    const nonSubmitters = mapReporteesToSummaries(details.reportees, submitted)
      .filter((item) => !item.summary)
      .map((item) => item.reportee);
    writeJson(res, 200, { weekKey, managerId, nonSubmitters: nonSubmitters.map((r) => ({ email: r.email, name: r.name })), count: nonSubmitters.length });
    return;
  }

  if (pathname.startsWith("/api/weekly-summary/rollup") && req.method === "GET") {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const managerId = requestUrl.searchParams.get("managerId") || "";
    const weekKey = requestUrl.searchParams.get("weekKey") || getWeekKey(new Date());
    if (!managerId) {
      writeJson(res, 400, { message: "managerId is required." });
      return;
    }
    const hierarchy = readHierarchyData(hierarchyFile);
    const details = getReportees(hierarchy.employees, managerId, true);
    if (!details.manager) {
      writeJson(res, 404, { message: "Manager not found." });
      return;
    }
    const submittedForManager = getSummariesForManager(weeklySummariesFile, managerId, weekKey);
    const sameWeekNoManager = readSummaries(weeklySummariesFile).filter((s) => s.weekKey === weekKey && !String(s.managerId || "").trim());
    const submitted = submittedForManager.concat(sameWeekNoManager);
    const mapped = mapReporteesToSummaries(details.reportees, submitted);
    const items = mapped.map(({ reportee: r, summary: s }) => ({
      name: r.name || r.email || r.id,
      email: (s && s.userEmail) || r.email,
      summaryText: s ? s.summaryText : null,
      submittedAt: s ? s.submittedAt : null
    }));
    const paragraph = getRollupParagraph(weeklySummariesFile, managerId, weekKey, details.reportees);
    // Notify each reportee that the manager viewed the roll-up
    const managerName = details.manager.name || details.manager.email || managerId;
    const deliveredTo = new Set();
    const skippedUsers = [];
    const notifItems = [];

    mapped.forEach(({ reportee: r, summary: s }) => {
      const recipientCandidates = new Set();
      const addCandidate = (value) => {
        const email = String(value || "").trim().toLowerCase();
        if (email && email.includes("@")) recipientCandidates.add(email);
      };

      addCandidate(s && s.userEmail);
      addCandidate(r && r.email);
      addCandidate(r && r.jiraAssignee);
      if (Array.isArray(r && r.aliases)) {
        r.aliases.forEach(addCandidate);
      }
      const fallbackAllowedEmail = resolveAllowedEmailForIdentity(
        s && s.userEmail,
        s && s.userName,
        r && r.email,
        r && r.id,
        r && r.name,
        r && r.jiraAssignee,
        r && r.aliases
      );
      addCandidate(fallbackAllowedEmail);

      if (recipientCandidates.size === 0) {
        skippedUsers.push(r && (r.name || r.id || "Unknown"));
        return;
      }

      const sentType = s && s.submittedAt ? "rollup" : "rollup-missing";
      const sentTitle = s && s.submittedAt
        ? "Your summary was included in the team roll-up"
        : "Team roll-up generated — no submission from you";
      const sentMessage = s && s.submittedAt
        ? `${managerName} generated the team roll-up for week of ${weekKey}. Your weekly summary was included.`
        : `${managerName} generated the team roll-up for week of ${weekKey}. You had no weekly summary submitted for this week.`;

      recipientCandidates.forEach((userEmail) => {
        const dedupeKey = `${sentType}:${userEmail}`;
        if (deliveredTo.has(dedupeKey)) return;
        deliveredTo.add(dedupeKey);
        notifItems.push({
          userEmail,
          type: sentType,
          title: sentTitle,
          message: sentMessage
        });
      });
    });

    const actorEmail = String(requestUrl.searchParams.get("userEmail") || req.headers["x-user-email"] || "")
      .trim()
      .toLowerCase();
    if (actorEmail) {
      notifItems.push({
        userEmail: actorEmail,
        type: "rollup-sent",
        title: "Team roll-up notifications sent",
        message: `Roll-up for week of ${weekKey} sent to ${deliveredTo.size} recipient(s).${skippedUsers.length ? ` Skipped ${skippedUsers.length} without email: ${skippedUsers.join(", ")}.` : ""}`
      });
    }

    Promise.resolve()
      .then(async () => {
        if (notifItems.length > 0) {
          await createBulkNotifications(notificationsFile, notifItems);
        }
        writeJson(res, 200, {
          weekKey,
          managerId,
          managerName: details.manager.name,
          rollup: paragraph,
          items,
          notificationsCreated: notifItems.length,
          recipientsCovered: deliveredTo.size,
          recipientsSkipped: skippedUsers
        });
      })
      .catch((error) => {
        writeJson(res, 500, { message: error.message || "Failed to create notifications." });
      });
    return;
  }

  if (pathname.startsWith("/api/weekly-summary/export") && req.method === "GET") {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const managerId = requestUrl.searchParams.get("managerId") || "";
    const weekKey = requestUrl.searchParams.get("weekKey") || getWeekKey(new Date());
    if (!managerId) {
      writeJson(res, 400, { message: "managerId is required." });
      return;
    }
    const hierarchy = readHierarchyData(hierarchyFile);
    const details = getReportees(hierarchy.employees, managerId, true);
    if (!details.manager) {
      writeJson(res, 404, { message: "Manager not found." });
      return;
    }
    const submittedForManager = getSummariesForManager(weeklySummariesFile, managerId, weekKey);
    const sameWeekNoManager = readSummaries(weeklySummariesFile).filter((s) => s.weekKey === weekKey && !String(s.managerId || "").trim());
    const submitted = submittedForManager.concat(sameWeekNoManager);
    const reportees = mapReporteesToSummaries(details.reportees, submitted).map(({ reportee: r, summary: s }) => ({
      name: r.name,
      email: (s && s.userEmail) || r.email,
      summaryText: s ? s.summaryText : null,
      submittedAt: s ? s.submittedAt : null
    }));
    const rollup = getRollupParagraph(weeklySummariesFile, managerId, weekKey, details.reportees);
    writeJson(res, 200, { weekKey, managerId, managerName: details.manager.name, reportees, rollup });
    return;
  }

  // GET /api/notifications?userEmail=...
  if (pathname === "/api/notifications" && req.method === "GET") {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const userEmail = (requestUrl.searchParams.get("userEmail") || "").trim().toLowerCase();
    const unreadOnly = requestUrl.searchParams.get("unreadOnly") === "true";
    if (!userEmail) { writeJson(res, 400, { message: "userEmail is required." }); return; }
    Promise.all([
      getForUser(notificationsFile, userEmail, { unreadOnly }),
      getUnreadCount(notificationsFile, userEmail)
    ])
      .then(([notifications, unreadCount]) => {
        writeJson(res, 200, { notifications, unreadCount });
      })
      .catch((error) => {
        writeJson(res, 500, { message: error.message || "Failed to load notifications." });
      });
    return;
  }

  // POST /api/notifications/read  { userEmail, ids? }
  if (pathname === "/api/notifications/read" && req.method === "POST") {
    readBody(req).then((body) => {
      let data;
      try { data = JSON.parse(body || "{}"); } catch { data = {}; }
      const userEmail = String(data.userEmail || "").trim().toLowerCase();
      if (!userEmail) { writeJson(res, 400, { message: "userEmail is required." }); return; }
      const operation = Array.isArray(data.ids) && data.ids.length > 0
        ? markReadById(notificationsFile, userEmail, data.ids)
        : markAllReadForUser(notificationsFile, userEmail);

      Promise.resolve(operation)
        .then(() => writeJson(res, 200, { success: true }))
        .catch((error) => writeJson(res, 500, { message: error.message || "Server error." }));
    }).catch(() => writeJson(res, 500, { message: "Server error." }));
    return;
  }

  sendStaticFile(pathname, res);
});

server.listen(port, host, () => {
  console.log(`Dashboard running at http://${host}:${port}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other process or set PORT to a different number (e.g. PORT=3016 npm start).`);
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});
