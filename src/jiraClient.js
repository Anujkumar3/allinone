const http = require("http");
const https = require("https");

function getJiraConfig() {
  return {
    baseUrl: process.env.JIRA_BASE_URL || "",
    email: process.env.JIRA_EMAIL || "",
    apiToken: process.env.JIRA_API_TOKEN || "",
    jql: process.env.JIRA_JQL || "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC",
    personalJql: process.env.JIRA_PERSONAL_JQL || "statusCategory != Done ORDER BY updated DESC",
    personalAllowedStatuses: process.env.JIRA_PERSONAL_ALLOWED_STATUSES || "New,In Progress,To Do",
    personalAllowedTypes: process.env.JIRA_PERSONAL_ISSUE_TYPES || "Bug,Sub-task,Story,Task",
    maxResults: Number(process.env.JIRA_MAX_RESULTS || 8),
    teamJql: process.env.JIRA_TEAM_JQL || "assignee is not EMPTY AND statusCategory != Done ORDER BY priority DESC, updated DESC",
    teamMaxResults: Number(process.env.JIRA_TEAM_MAX_RESULTS || 50),
    assigneeField: process.env.JIRA_ASSIGNEE_FIELD || "assignee",
    allowSelfSigned: String(process.env.JIRA_ALLOW_SELF_SIGNED || "false").toLowerCase() === "true"
  };
}

function parseAssigneeMap() {
  const mapStr = String(process.env.JIRA_PERSONAL_ASSIGNEE_MAP || "").trim();
  const mapObj = {};
  if (!mapStr) return mapObj;
  mapStr.split(";").forEach((pair) => {
    const [email, jiraKey] = pair.split(":").map((s) => String(s).trim());
    if (email && jiraKey) {
      mapObj[email.toLowerCase()] = jiraKey;
    }
  });
  return mapObj;
}

function escapeJqlValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function appendFilterToJql(baseJql, filterClause) {
  const jql = String(baseJql || "").trim();
  const clause = String(filterClause || "").trim();
  if (!clause) return jql;
  if (!jql) return clause;

  const match = /\sorder\s+by\s/i.exec(jql);
  if (!match || match.index < 0) {
    return `(${jql}) AND (${clause})`;
  }

  const main = jql.slice(0, match.index).trim();
  const orderBy = jql.slice(match.index).trim();
  return `(${main}) AND (${clause}) ${orderBy}`;
}

function requestJson(url, headers, allowSelfSigned) {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const options = {
      method: "GET",
      headers,
      agent: isHttps ? new https.Agent({ rejectUnauthorized: !allowSelfSigned }) : undefined
    };

    const req = transport.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Jira request failed with status ${res.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("Invalid JSON from Jira response"));
        }
      });
    });

    req.on("error", (error) => reject(error));
    req.end();
  });
}

function normalizeIssue(issue, baseUrl) {
  const browseUrl = new URL(baseUrl);
  browseUrl.pathname = `/browse/${issue.key}`;
  browseUrl.search = "";

  const assignee = issue.fields?.assignee || null;

  return {
    key: issue.key,
    summary: issue.fields?.summary || "(No summary)",
    status: issue.fields?.status?.name || "Unknown",
    issueType: issue.fields?.issuetype?.name || "Task",
    priority: issue.fields?.priority?.name || "-",
    assignee: assignee?.displayName || assignee?.name || assignee?.emailAddress || "Unassigned",
    assigneeName: assignee?.displayName || assignee?.name || "",
    assigneeEmail: assignee?.emailAddress || "",
    assigneeAccountId: assignee?.accountId || "",
    created: issue.fields?.created || "",
    updated: issue.fields?.updated || "",
    dueDate: issue.fields?.duedate || "",
    labels: Array.isArray(issue.fields?.labels) ? issue.fields.labels : [],
    url: browseUrl.toString()
  };
}

function toDayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonday(date = new Date()) {
  const d = toDayStart(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getMonthStart(date = new Date()) {
  const d = toDayStart(date);
  d.setDate(1);
  return d;
}

function daysBetween(start, end) {
  const ms = toDayStart(end).getTime() - toDayStart(start).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function parseAllowedStatuses(input) {
  return String(input || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function filterIssuesByAllowedStatuses(issues, allowedStatuses) {
  if (!Array.isArray(issues) || !issues.length) return [];
  if (!Array.isArray(allowedStatuses) || !allowedStatuses.length) return issues;
  return issues.filter((issue) => {
    const status = String(issue && issue.status ? issue.status : "").trim().toLowerCase();
    return allowedStatuses.includes(status);
  });
}

function filterIssuesByAllowedTypes(issues, allowedTypes) {
  if (!Array.isArray(issues) || !issues.length) return [];
  if (!Array.isArray(allowedTypes) || !allowedTypes.length) return issues;
  return issues.filter((issue) => {
    const type = String(issue && issue.issueType ? issue.issueType : "").trim().toLowerCase();
    return allowedTypes.includes(type);
  });
}

function filterIssuesByAssignees(issues, assignees) {
  if (!Array.isArray(issues) || !issues.length) return [];
  if (!Array.isArray(assignees) || !assignees.length) return issues;

  const assigneeMap = parseAssigneeMap();
  const mappedAssignees = assignees.map((a) => assigneeMap[String(a).toLowerCase()] || a);

  const exact = new Set();
  const localParts = new Set();
  mappedAssignees.forEach((value) => {
    const key = normalizeAssigneeKey(value);
    if (!key) return;
    exact.add(key);
    const local = assigneeLocalPart(key);
    if (local) localParts.add(local);
  });

  return issues.filter((issue) => {
    const candidates = [
      issue?.assignee,
      issue?.assigneeName,
      issue?.assigneeEmail,
      issue?.assigneeAccountId
    ];

    return candidates.some((raw) => {
      const assigneeKey = normalizeAssigneeKey(raw);
      if (!assigneeKey) return false;
      if (exact.has(assigneeKey)) return true;
      const local = assigneeLocalPart(assigneeKey);
      return local ? localParts.has(local) : false;
    });
  });
}

async function queryJira(config, queryOptions = {}) {
  if (!config.baseUrl || !config.email || !config.apiToken) {
    return {
      configured: false,
      issues: [],
      message: "Jira credentials are not configured on the server yet."
    };
  }

  const basicAuthHeader = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  const authSchemes = [
    { name: "basic", value: `Basic ${basicAuthHeader}` },
    { name: "bearer", value: `Bearer ${config.apiToken}` }
  ];
  const params = new URLSearchParams({
    jql: queryOptions.jql || config.jql,
    maxResults: String(queryOptions.maxResults || config.maxResults),
    fields: "summary,status,issuetype,priority,assignee,created,updated,duedate,labels"
  });
  if (Number.isFinite(Number(queryOptions.startAt)) && Number(queryOptions.startAt) > 0) {
    params.set("startAt", String(Number(queryOptions.startAt)));
  }

  const searchPaths = ["/rest/api/3/search", "/rest/api/2/search"];
  let lastError = null;

  for (const searchPath of searchPaths) {
    for (const auth of authSchemes) {
      try {
        const url = new URL(config.baseUrl);
        url.pathname = searchPath;
        url.search = params.toString();

        const data = await requestJson(
          url,
          {
            Authorization: auth.value,
            Accept: "application/json"
          },
          config.allowSelfSigned
        );

        const issues = Array.isArray(data.issues)
          ? data.issues.map((issue) => normalizeIssue(issue, config.baseUrl))
          : [];

        return {
          configured: true,
          issues,
          total: Number(data.total || issues.length),
          startAt: Number(data.startAt || queryOptions.startAt || 0),
          maxResults: Number(data.maxResults || queryOptions.maxResults || config.maxResults),
          authScheme: auth.name
        };
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error("Unable to fetch Jira issues");
}

async function fetchJiraIssues(options = {}) {
  const config = getJiraConfig();
  const assignees = Array.isArray(options.assignees)
    ? options.assignees.filter((value) => typeof value === "string" && value.trim())
    : [];

  let jql = config.jql;
  if (assignees.length > 0) {
    const jqlList = assignees.map((assignee) => `"${escapeJqlValue(assignee)}"`).join(",");
    const assigneeFilter = `${config.assigneeField} in (${jqlList})`;
    jql = appendFilterToJql(config.personalJql, assigneeFilter);
  }

  let payload = null;
  let usedScopedFallback = false;
  let usedTeamFallback = false;
  let lastError = null;
  const maxResults = Number(options.maxResults || config.maxResults);

  async function tryQuery(jqlCandidate) {
    try {
      const result = await queryJira(config, { jql: jqlCandidate, maxResults });
      lastError = null;
      return result;
    } catch (error) {
      lastError = error;
      return null;
    }
  }

  payload = await tryQuery(jql);

  if (!payload && assignees.length > 0) {
    // Jira Cloud can reject assignee filters when identifier formats differ (accountId vs email/username).
    // Retry with progressively broader JQLs and filter locally.
    payload = await tryQuery(config.personalJql);
    if (payload) usedScopedFallback = true;

    if (!payload) {
      payload = await tryQuery(config.teamJql);
      if (payload) {
        usedScopedFallback = true;
        usedTeamFallback = true;
      }
    }

    if (!payload) {
      payload = await tryQuery("statusCategory != Done ORDER BY updated DESC");
      if (payload) {
        usedScopedFallback = true;
        usedTeamFallback = true;
      }
    }
  }

  if (!payload) {
    // Keep API stable even when Jira rejects all JQL variants.
    return {
      configured: true,
      issues: [],
      total: 0,
      message: lastError ? String(lastError.message || "Unable to fetch Jira issues") : "Unable to fetch Jira issues",
      scopeFallback: usedScopedFallback,
      scopeFallbackUnfiltered: false,
      allowedFilterFallback: false,
      teamFallback: usedTeamFallback
    };
  }

  if (assignees.length > 0 && payload && payload.configured && Array.isArray(payload.issues) && payload.issues.length === 0) {
    // Some Jira setups return 0 for personal JQL under service auth. Use team JQL and filter locally.
    const teamPayload = await tryQuery(config.teamJql);
    if (teamPayload) {
      payload = teamPayload;
      usedTeamFallback = true;
    }
  }

  if (assignees.length > 0 && payload && payload.configured) {
    const allowedStatuses = parseAllowedStatuses(config.personalAllowedStatuses);
    const allowedTypes = parseAllowedStatuses(config.personalAllowedTypes);
    let allowedIssues = filterIssuesByAllowedStatuses(payload.issues, allowedStatuses);
    allowedIssues = filterIssuesByAllowedTypes(allowedIssues, allowedTypes);

    const allowedFilterFallback = allowedIssues.length === 0 && Array.isArray(payload.issues) && payload.issues.length > 0;
    if (allowedFilterFallback) {
      allowedIssues = Array.isArray(payload.issues) ? payload.issues : [];
    }

    let filteredIssues = allowedIssues;
    if (usedScopedFallback) {
      filteredIssues = filterIssuesByAssignees(filteredIssues, assignees);
    }

    if (usedTeamFallback) {
      filteredIssues = filterIssuesByAssignees(filteredIssues, assignees);
    }

    const scopeFallbackUnfiltered = usedScopedFallback && filteredIssues.length === 0 && allowedIssues.length > 0;
    if (scopeFallbackUnfiltered) {
      filteredIssues = allowedIssues;
    }

    return {
      ...payload,
      issues: filteredIssues,
      total: filteredIssues.length,
      scopeFallback: usedScopedFallback,
      scopeFallbackUnfiltered,
      allowedFilterFallback,
      teamFallback: usedTeamFallback
    };
  }

  return payload;
}

function isDoneStatus(status) {
  return /done|resolve|resolved|closed|integrated|blocked|parked|proposed/i.test(status || "");
}

function isAllowedTeamStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return /^to\s*do$|^in\s*progress$|^new$/.test(s);
}

function isInProgressStatus(status) {
  return /progress|review|testing|qa|develop/i.test(status || "");
}

function isBlockedStatus(status) {
  return /blocked|impediment|on hold|waiting/i.test(status || "");
}

function normalizeAssigneeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function assigneeLocalPart(value) {
  const key = normalizeAssigneeKey(value);
  const at = key.indexOf("@");
  return at > 0 ? key.slice(0, at) : key;
}

function buildAssigneeResolver(assigneeRoster = []) {
  const byKey = new Map();
  const roster = Array.isArray(assigneeRoster) ? assigneeRoster : [];

  roster.forEach((person) => {
    const canonical = String(person?.name || person?.jiraAssignee || person?.email || person?.id || "").trim();
    if (!canonical) return;
    const candidates = [
      person?.name,
      person?.jiraAssignee,
      person?.email,
      person?.id,
      assigneeLocalPart(person?.jiraAssignee),
      assigneeLocalPart(person?.email)
    ]
      .map((v) => normalizeAssigneeKey(v))
      .filter(Boolean);

    candidates.forEach((key) => {
      if (!byKey.has(key)) byKey.set(key, canonical);
    });
  });

  return function resolveAssignee(rawAssignee) {
    const key = normalizeAssigneeKey(rawAssignee);
    if (!key) return String(rawAssignee || "Unassigned");
    if (byKey.has(key)) return byKey.get(key);
    const local = assigneeLocalPart(key);
    if (local && byKey.has(local)) return byKey.get(local);
    return String(rawAssignee || "Unassigned");
  };
}

function computeTeamSummary(issues, assigneeRoster = []) {
  const now = new Date();
  const weekStart = getMonday(now);
  const monthStart = getMonthStart(now);
  const totals = {
    open: 0,
    inProgress: 0,
    blocked: 0,
    overdue: 0,
    done: 0
  };

  const byAssignee = new Map();
  const overdueAgingBuckets = {
    d0to3: 0,
    d4to7: 0,
    d8to14: 0,
    d15plus: 0
  };
  const periodStats = {
    weekly: { opened: 0, closed: 0 },
    monthly: { opened: 0, closed: 0 }
  };
  const blockedChainAlerts = [];
  const milestoneWarnings = [];
  let unplannedWorkCount = 0;
  const issueTypeCounts = {};
  let bugCount = 0;
  const resolveAssignee = buildAssigneeResolver(assigneeRoster);

  const roster = Array.isArray(assigneeRoster) ? assigneeRoster : [];
  roster.forEach((person) => {
    const label = String(person?.name || person?.jiraAssignee || person?.email || person?.id || "").trim();
    if (!label || byAssignee.has(label)) return;
    byAssignee.set(label, {
      assignee: label,
      total: 0,
      done: 0,
      inProgress: 0,
      blocked: 0,
      overdue: 0,
      tickets: []
    });
  });

  issues.forEach((issue) => {
    const status = issue.status || "Unknown";
    const assignee = resolveAssignee(issue.assignee || "Unassigned");
    const done = isDoneStatus(status);
    const inProgress = isInProgressStatus(status);
    const blocked = isBlockedStatus(status);
    const dueDate = issue.dueDate ? new Date(issue.dueDate) : null;
    const createdAt = issue.created ? new Date(issue.created) : null;
    const agingReferenceDate = dueDate || createdAt;
    const overdue = Boolean(dueDate && !done && dueDate < now);
    const updatedAt = issue.updated ? new Date(issue.updated) : null;
    const labels = Array.isArray(issue.labels) ? issue.labels.map((l) => String(l).toLowerCase()) : [];
    const isUnplanned = labels.some((l) => /hotfix|unplanned|support|incident/.test(l));
    const issueType = String(issue.issueType || "Task").trim();
    const issueTypeKey = issueType.toLowerCase();

    issueTypeCounts[issueType] = (issueTypeCounts[issueType] || 0) + 1;
    if (/bug/.test(issueTypeKey)) bugCount += 1;

    if (createdAt && createdAt >= weekStart) periodStats.weekly.opened += 1;
    if (createdAt && createdAt >= monthStart) periodStats.monthly.opened += 1;
    if (done && updatedAt && updatedAt >= weekStart) periodStats.weekly.closed += 1;
    if (done && updatedAt && updatedAt >= monthStart) periodStats.monthly.closed += 1;
    if (isUnplanned) unplannedWorkCount += 1;

    if (done) totals.done += 1;
    else totals.open += 1;
    if (inProgress) totals.inProgress += 1;
    if (blocked) totals.blocked += 1;
    if (overdue) totals.overdue += 1;

    if (!done && agingReferenceDate) {
      const age = daysBetween(agingReferenceDate, now);
      if (age <= 3) overdueAgingBuckets.d0to3 += 1;
      else if (age <= 7) overdueAgingBuckets.d4to7 += 1;
      else if (age <= 14) overdueAgingBuckets.d8to14 += 1;
      else overdueAgingBuckets.d15plus += 1;
    }

    if (!done && dueDate) {
      const daysToDue = Math.ceil((toDayStart(dueDate).getTime() - toDayStart(now).getTime()) / (24 * 60 * 60 * 1000));
      if (daysToDue >= 0 && daysToDue <= 7) {
        milestoneWarnings.push({
          key: issue.key,
          assignee,
          dueDate: issue.dueDate,
          daysToDue,
          summary: issue.summary
        });
      }
    }

    if (blocked) {
      const chainMatch = String(issue.summary || "").match(/(?:blocked\s+by|depends\s+on)\s+([A-Z]+-\d+)/i);
      if (chainMatch) {
        blockedChainAlerts.push({
          key: issue.key,
          assignee,
          dependencyKey: chainMatch[1],
          summary: issue.summary
        });
      }
    }

    if (!byAssignee.has(assignee)) {
      byAssignee.set(assignee, {
        assignee,
        total: 0,
        done: 0,
        inProgress: 0,
        blocked: 0,
        overdue: 0,
        tickets: []
      });
    }

    const row = byAssignee.get(assignee);
    row.total += 1;
    if (done) row.done += 1;
    if (inProgress) row.inProgress += 1;
    if (blocked) row.blocked += 1;
    if (overdue) row.overdue += 1;
    row.tickets.push({
      key: issue.key,
      summary: issue.summary,
      status: issue.status,
      priority: issue.priority,
      issueType: issue.issueType,
      dueDate: issue.dueDate,
      url: issue.url
    });
  });

  const workload = Array.from(byAssignee.values())
    .map((item) => ({
      ...item,
      completionRate: item.total ? Math.round((item.done / item.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total || a.assignee.localeCompare(b.assignee));

  const risks = [];
  const attritionRisk = [];
  const workloadRebalancing = [];
  const oneOnOnePrep = [];
  workload.forEach((person) => {
    if (person.total >= 8) {
      risks.push({
        assignee: person.assignee,
        level: "high",
        message: `${person.total} active items assigned. Consider load balancing.`
      });
    }
    if (person.blocked >= 2) {
      risks.push({
        assignee: person.assignee,
        level: "medium",
        message: `${person.blocked} blocked items need escalation.`
      });
    }
    if (person.overdue >= 1) {
      risks.push({
        assignee: person.assignee,
        level: "medium",
        message: `${person.overdue} overdue items require attention.`
      });
    }

    const riskScore = person.total * 8 + person.blocked * 20 + person.overdue * 15;
    if (riskScore >= 60) {
      attritionRisk.push({
        assignee: person.assignee,
        riskScore,
        reason: "Sustained high queue + blockers/overdues"
      });
    }

    oneOnOnePrep.push({
      assignee: person.assignee,
      agenda: [
        `${person.total} active items`,
        `${person.blocked} blocked`,
        `${person.overdue} overdue`,
        `${person.completionRate}% completion`
      ]
    });
  });

  if (workload.length >= 2) {
    const overloaded = workload.filter((p) => p.total >= 8 || p.blocked >= 2).slice(0, 3);
    const underutilized = [...workload].reverse().filter((p) => p.total <= 3).slice(0, 3);
    overloaded.forEach((o, idx) => {
      const u = underutilized[idx % Math.max(1, underutilized.length)];
      if (u && o.assignee !== u.assignee) {
        workloadRebalancing.push({
          from: o.assignee,
          to: u.assignee,
          recommendation: `Consider reassigning 1-2 items from ${o.assignee} to ${u.assignee}.`
        });
      }
    });
  }

  const trendDays = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendDays.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      value: 0
    });
  }

  const trendMap = new Map(trendDays.map((row) => [row.key, row]));
  issues.forEach((issue) => {
    const updatedDate = issue.updated ? new Date(issue.updated).toISOString().slice(0, 10) : "";
    const hit = trendMap.get(updatedDate);
    if (hit) hit.value += 1;
  });

  const completionRate = totals.open + totals.done
    ? Math.round((totals.done / (totals.open + totals.done)) * 100)
    : 0;

  const teamHealthScore = Math.max(0, Math.min(100,
    Math.round(
      completionRate * 0.55 +
      (100 - Math.min(100, totals.overdue * 8)) * 0.25 +
      (100 - Math.min(100, totals.blocked * 10)) * 0.20
    )
  ));

  const burnoutRadar = workload
    .filter((p) => p.total >= 8 || p.blocked >= 2 || p.overdue >= 2)
    .map((p) => ({
      assignee: p.assignee,
      reason: `Load=${p.total}, blocked=${p.blocked}, overdue=${p.overdue}`
    }))
    .slice(0, 8);

  return {
    totals,
    completionRate,
    workload,
    risks: risks.slice(0, 8),
    trend: trendDays,
    periodStats,
    overdueAgingBuckets,
    milestoneWarnings: milestoneWarnings.slice(0, 10),
    blockedChainAlerts: blockedChainAlerts.slice(0, 10),
    attritionRisk: attritionRisk.slice(0, 10),
    workloadRebalancing: workloadRebalancing.slice(0, 5),
    oneOnOnePrep: oneOnOnePrep.slice(0, 10),
    issueTypeCounts,
    bugCount,
    unplannedWork: {
      count: unplannedWorkCount,
      percentage: issues.length ? Math.round((unplannedWorkCount / issues.length) * 100) : 0
    },
    teamAvailabilityCheck: {
      note: "Based on current workload only. Calendar integration can improve this suggestion.",
      bestCandidates: [...workload].reverse().filter((p) => p.total <= 3).slice(0, 3).map((p) => p.assignee)
    },
    teamHealthScore,
    burnoutRadar
  };
}

async function fetchTeamSummary(options = {}) {
  const config = getJiraConfig();
  let teamJql = config.teamJql;

  const assignees = Array.isArray(options.assignees)
    ? options.assignees.filter((value) => typeof value === "string" && value.trim())
    : [];
  const assigneeRoster = Array.isArray(options.assigneeRoster) ? options.assigneeRoster : [];
  const fetchAll = options.fetchAll !== false;

  if (assignees.length > 0) {
    const jqlList = assignees.map((assignee) => `"${escapeJqlValue(assignee)}"`).join(",");
    const assigneeFilter = `${config.assigneeField} in (${jqlList})`;
    teamJql = appendFilterToJql(teamJql, assigneeFilter);
  }

  const pageSize = Math.max(50, Math.min(200, Number(options.maxResults || config.teamMaxResults || 100)));

  let payload;
  let usedScopedFallback = false;
  try {
    payload = await queryJira(config, {
      jql: teamJql,
      maxResults: pageSize,
      startAt: 0
    });
  } catch (error) {
    if (!assignees.length || !/status\s+400/i.test(String(error && error.message ? error.message : ""))) {
      throw error;
    }

    payload = await queryJira(config, {
      jql: config.teamJql,
      maxResults: pageSize,
      startAt: 0
    });
    usedScopedFallback = true;
  }

  if (!payload.configured) {
    return payload;
  }

  let allIssues = Array.isArray(payload.issues) ? [...payload.issues] : [];
  const total = Number(payload.total || allIssues.length);

  if (fetchAll && total > allIssues.length) {
    let startAt = Number(payload.startAt || 0) + Number(payload.maxResults || pageSize);
    let guard = 0;
    while (startAt < total && guard < 50) {
      const page = await queryJira(config, {
        jql: usedScopedFallback ? config.teamJql : teamJql,
        maxResults: pageSize,
        startAt
      });
      const pageIssues = Array.isArray(page.issues) ? page.issues : [];
      if (!pageIssues.length) break;
      allIssues.push(...pageIssues);
      startAt += Number(page.maxResults || pageSize);
      guard += 1;
    }
  }

  const uniq = new Map();
  allIssues.forEach((issue) => {
    const key = String(issue?.key || "");
    if (key && !uniq.has(key)) uniq.set(key, issue);
  });
  allIssues = Array.from(uniq.values());

  if (usedScopedFallback && assignees.length > 0) {
    allIssues = filterIssuesByAssignees(allIssues, assignees);
  }

  const activeIssues = allIssues.filter((issue) => isAllowedTeamStatus(issue?.status));

  const summary = computeTeamSummary(allIssues, assigneeRoster);
  const activeSummary = computeTeamSummary(activeIssues, assigneeRoster);

  // Keep KPI cards accurate from full team data while workload/risk lists stay focused on active queue.
  summary.workload = activeSummary.workload;
  summary.risks = activeSummary.risks;
  summary.workloadRebalancing = activeSummary.workloadRebalancing;
  summary.oneOnOnePrep = activeSummary.oneOnOnePrep;
  summary.teamAvailabilityCheck = activeSummary.teamAvailabilityCheck;
  summary.burnoutRadar = activeSummary.burnoutRadar;

  return {
    configured: true,
    summary,
    total: allIssues.length,
    activeTotal: activeIssues.length,
    scopedAssignees: assignees.length,
    scopeFallback: usedScopedFallback
  };
}

module.exports = {
  fetchJiraIssues,
  fetchTeamSummary
};
