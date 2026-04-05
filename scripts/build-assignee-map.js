const fs = require("fs");

const access = fs.readFileSync("./src/accessControl.js", "utf-8");
const m = access.match(/TEAM_ACCESS_ALLOWLIST\s*=\s*\[(.*?)\]/s);
const allowEmails = [];
if (m) {
  const body = m[1];
  const re = /"([^"]+)"/g;
  let x;
  while ((x = re.exec(body))) allowEmails.push(x[1].toLowerCase());
}

const hierarchy = require("../data/hierarchy.json").employees;

function compact(v) {
  return String(v || "")
    .toLowerCase()
    .trim()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function compactNoDigits(v) {
  return compact(v).replace(/[0-9]/g, "");
}

const byCompact = new Map();
const byCompactNoDigits = new Map();
for (const e of hierarchy) {
  const keys = [e.email, e.id, e.name, e.jiraAssignee, ...(Array.isArray(e.aliases) ? e.aliases : [])];
  for (const k of keys) {
    const c = compact(k);
    const cnd = compactNoDigits(k);
    if (c && !byCompact.has(c)) byCompact.set(c, e);
    if (cnd && !byCompactNoDigits.has(cnd)) byCompactNoDigits.set(cnd, e);
  }
}

function findEmp(v) {
  const c = compact(v);
  const cnd = compactNoDigits(v);
  return byCompact.get(c) || byCompactNoDigits.get(cnd) || null;
}

const pairs = [];
const missing = [];

for (const loginEmail of allowEmails) {
  const e = findEmp(loginEmail);
  if (!e) {
    missing.push(loginEmail);
    continue;
  }
  const jira = String(e.jiraAssignee || "").trim();
  if (!jira) {
    missing.push(loginEmail);
    continue;
  }
  pairs.push([loginEmail, jira]);
}

for (const e of hierarchy) {
  const jira = String(e.jiraAssignee || "").trim();
  if (!jira) continue;
  const candidates = [e.email, e.id, e.name, ...(Array.isArray(e.aliases) ? e.aliases : [])].filter(Boolean);
  for (const c of candidates) pairs.push([String(c).trim().toLowerCase(), jira]);

  if (
    String(e.employmentType || "").toLowerCase().includes("ext") &&
    e.email &&
    !String(e.email).includes(".ext@")
  ) {
    pairs.push([String(e.email).replace("@", ".ext@").toLowerCase(), jira]);
  }
}

const seen = new Set();
const uniq = [];
for (const [k, v] of pairs) {
  const key = `${k}::${v}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniq.push([k, v]);
  }
}

const mapStr = uniq.map(([k, v]) => `${k}:${v}`).join(";");
console.log(`TOTAL_ENTRIES=${uniq.length}`);
console.log(`MISSING=${missing.length}`);
if (missing.length) console.log(`MISSING_LIST=${missing.join(",")}`);
console.log("MAP_START");
console.log(mapStr);
console.log("MAP_END");
