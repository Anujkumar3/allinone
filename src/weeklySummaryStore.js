/**
 * Store and retrieve weekly summaries (employee → manager).
 * Data: array of { weekKey, userEmail, userName, managerId, summaryText, submittedAt }.
 */

const fs = require("fs");
const path = require("path");

function normalizeIdentity(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return "";
  return s.replace(/[_\s]+/g, ".");
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function localPart(value) {
  const s = normalizeIdentity(value);
  const at = s.indexOf("@");
  return at > 0 ? s.slice(0, at) : s;
}

function addIdentityVariants(set, value) {
  const normalized = normalizeIdentity(value);
  if (!normalized) return;
  set.add(normalized);

  const local = localPart(normalized);
  if (!local) return;
  set.add(local);

  const parts = local.split(".").filter(Boolean);
  if (parts.length > 0) {
    const noExt = parts.filter((p) => p !== "ext").join(".");
    if (noExt) set.add(noExt);
    const noNumbers = parts.filter((p) => !/^\d+$/.test(p)).join(".");
    if (noNumbers) set.add(noNumbers);
    const slim = parts.filter((p) => p !== "ext" && !/^\d+$/.test(p)).join(".");
    if (slim) set.add(slim);
  }
}

function dottedName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function buildReporteeKeys(reportee) {
  const keys = new Set();
  const add = (value) => addIdentityVariants(keys, value);
  add(reportee?.email);
  add(reportee?.jiraAssignee);
  add(reportee?.id);
  if (Array.isArray(reportee?.aliases)) {
    reportee.aliases.forEach(add);
  }
  const dotted = dottedName(reportee?.name);
  if (dotted) addIdentityVariants(keys, dotted);
  const nameKey = normalizeName(reportee?.name);
  if (nameKey) keys.add(nameKey);
  return keys;
}

function buildSummaryKeys(summary) {
  const keys = new Set();
  const add = (value) => addIdentityVariants(keys, value);
  add(summary?.userEmail);
  add(summary?.userName);
  const dotted = dottedName(summary?.userName);
  if (dotted) addIdentityVariants(keys, dotted);
  const nameKey = normalizeName(summary?.userName);
  if (nameKey) keys.add(nameKey);
  return keys;
}

function findSummaryForReportee(reportee, summaries, usedIndexes = new Set()) {
  const reporteeKeys = buildReporteeKeys(reportee);
  if (reporteeKeys.size === 0) return null;

  for (let i = 0; i < summaries.length; i += 1) {
    if (usedIndexes.has(i)) continue;
    const summaryKeys = buildSummaryKeys(summaries[i]);
    for (const key of summaryKeys) {
      if (reporteeKeys.has(key)) {
        usedIndexes.add(i);
        return summaries[i];
      }
    }
  }
  return null;
}

function mapReporteesToSummaries(reportees, summaries) {
  const usedIndexes = new Set();
  return (reportees || []).map((reportee) => {
    const summary = findSummaryForReportee(reportee, summaries || [], usedIndexes);
    return { reportee, summary };
  });
}

function readSummaries(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    const summaries = Array.isArray(data.summaries) ? data.summaries : [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const filtered = summaries.filter((entry) => {
      const submittedAt = entry && entry.submittedAt ? new Date(entry.submittedAt) : null;
      return submittedAt && !Number.isNaN(submittedAt.getTime()) ? submittedAt >= ninetyDaysAgo : true;
    });
    if (filtered.length !== summaries.length) {
      writeSummaries(filePath, filtered);
    }
    return filtered;
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

function writeSummaries(filePath, summaries) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ summaries }, null, 2), "utf8");
}

/** Returns Monday of the week for the given date as YYYY-MM-DD (week key). */
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

function submitSummary(filePath, { weekKey, userEmail, userName, managerId, summaryText }) {
  const summaries = readSummaries(filePath);
  const submittedAt = new Date().toISOString();
  const entry = { weekKey, userEmail, userName: userName || userEmail, managerId: managerId || "", summaryText: String(summaryText || "").trim(), submittedAt };
  const rest = summaries.filter((s) => !(s.weekKey === weekKey && String(s.userEmail).toLowerCase() === String(userEmail).toLowerCase()));
  rest.push(entry);
  writeSummaries(filePath, rest);
  return entry;
}

function getSummariesForManager(filePath, managerId, weekKey) {
  const summaries = readSummaries(filePath);
  return summaries.filter(
    (s) => s.weekKey === weekKey && String(s.managerId) === String(managerId)
  );
}

function getMySummary(filePath, userEmail, weekKey) {
  const summaries = readSummaries(filePath);
  const email = String(userEmail || "").toLowerCase();
  return summaries.find(
    (s) => s.weekKey === weekKey && String(s.userEmail).toLowerCase() === email
  ) || null;
}

/** Get list of reportees who have not submitted for the week (for manager reminder). */
function getNonSubmitters(filePath, managerId, weekKey, reportees) {
  const submitted = getSummariesForManager(filePath, managerId, weekKey);
  return mapReporteesToSummaries(reportees, submitted)
    .filter((item) => !item.summary)
    .map((item) => item.reportee);
}

/** Build a one-paragraph roll-up from reportees' summaries for the week. */
function getRollupParagraph(filePath, managerId, weekKey, reporteesWithNames) {
  const summaries = readSummaries(filePath).filter(
    (s) => s.weekKey === weekKey && String(s.managerId) === String(managerId)
  );
  const lines = [];
  mapReporteesToSummaries(reporteesWithNames, summaries).forEach(({ reportee: r, summary: s }) => {
    const name = r.name || r.email || r.id || "Unknown";
    const text = s && s.summaryText ? s.summaryText.trim().replace(/\n+/g, " ").slice(0, 200) : "No submission.";
    lines.push(`${name}: ${text}`);
  });
  return lines.join(" ");
}

module.exports = {
  getWeekKey,
  readSummaries,
  submitSummary,
  getSummariesForManager,
  getMySummary,
  getNonSubmitters,
  getRollupParagraph,
  mapReporteesToSummaries
};
