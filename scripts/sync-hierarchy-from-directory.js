/**
 * Sync hierarchy from Nokia Directory into data/hierarchy.json.
 * Fetches from https://directory.int.net.nokia.com/index.php by default.
 *
 * Usage:
 *   npm run sync-hierarchy
 *   node scripts/sync-hierarchy-from-directory.js
 *   node scripts/sync-hierarchy-from-directory.js --file path/to/export.json
 *
 * Environment (optional):
 *   DIRECTORY_URL     - Default: https://directory.int.net.nokia.com/index.php
 *   DIRECTORY_USER    - Basic auth user (if required)
 *   DIRECTORY_PASSWORD - Basic auth password / token
 *   DIRECTORY_INSECURE - Set to "true" to allow self-signed TLS (internal)
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const projectRoot = path.join(__dirname, "..");
const defaultHierarchyPath = path.join(projectRoot, "data", "hierarchy.json");

const DEFAULT_DIRECTORY_URL = "https://directory.int.net.nokia.com/index.php";

// --- Config from env ---
const DIRECTORY_URL = process.env.DIRECTORY_URL || DEFAULT_DIRECTORY_URL;
const DIRECTORY_USER = process.env.DIRECTORY_USER || "";
const DIRECTORY_PASSWORD = process.env.DIRECTORY_PASSWORD || "";
const DIRECTORY_INSECURE = String(process.env.DIRECTORY_INSECURE || "false").toLowerCase() === "true";

// --- Normalize directory person -> dashboard employee ---
function toId(nameOrEmail) {
  if (!nameOrEmail) return "";
  return String(nameOrEmail)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\./g, "-")
    .replace(/_/g, "-")
    .slice(0, 80) || "emp";
}

/**
 * Map a directory record to dashboard employee shape.
 * Supports both API-style records and Nokia Directory profile fields:
 *   Email, Business Title, Team, Division, Business Group, Responsible, Responsible ID, NokiaID, Name
 */
function mapDirectoryRecordToEmployee(record, index) {
  const email = record.email || record.mail || record.Email || "";
  const name = record.name || record.displayName || record.Name || record.Email || "(Unknown)";
  const id = record.id || record.NokiaID ? `n${record.NokiaID}` : toId(email || name) || `emp-${index}`;
  const managerId = record.managerId != null ? record.managerId : null;
  const responsibleName = record.Responsible || record.managerName || record.responsibleName;
  const role = (record.role || "employee").toLowerCase();
  const title = record.title || record.jobTitle || record["Business Title"] || null;
  const orgUnit = record.orgUnit || record.department || record.Team || record.Division || record["Business Group"] || null;
  const level = record.level || record.Level || (record.Team && record.Team.match(/\(L\d+\)/)?.[0]) || null;

  return {
    id,
    name: String(name).trim(),
    email: String(email).trim(),
    jiraAssignee: record.jiraAssignee ?? email ?? id,
    role: role === "manager" ? "manager" : "employee",
    title,
    orgUnit,
    level,
    managerId,
    _responsibleName: responsibleName ? String(responsibleName).trim() : null
  };
}

/**
 * Resolve _responsibleName (manager name) to managerId using current employee list.
 * Builds name -> id and email -> id maps, then sets managerId where possible.
 */
function resolveManagerIds(employees) {
  const byName = new Map();
  const byEmail = new Map();
  employees.forEach((emp) => {
    byName.set(emp.name.toLowerCase().trim(), emp.id);
    if (emp.email) byEmail.set(emp.email.toLowerCase().trim(), emp.id);
  });

  return employees.map((emp) => {
    const { _responsibleName, ...rest } = emp;
    let managerId = rest.managerId;
    if (!managerId && _responsibleName) {
      const key = _responsibleName.toLowerCase().trim();
      managerId = byName.get(key) || byEmail.get(key) || null;
    }
    return { ...rest, managerId };
  });
}

/**
 * Try to extract JSON from HTML (e.g. <script type="application/json"> or window.__DATA__ = ...).
 * Returns null if no JSON found.
 */
function extractJsonFromHtml(html) {
  const str = String(html);
  // <script type="application/json">...</script>
  const scriptJson = str.match(/<script[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (scriptJson) {
    try {
      return JSON.parse(scriptJson[1].trim());
    } catch (_) {}
  }
  // window.something = { ... }; or var data = [ ... ];
  const assignments = str.match(/(?:window|var)\s+\w+\s*=\s*(\{[\s\S]*?\});?\s*(?:\n|$)/g);
  if (assignments) {
    for (const m of assignments) {
      const inner = m.replace(/^(?:window|var)\s+\w+\s*=\s*/, "").replace(/;\s*$/, "");
      try {
        return JSON.parse(inner);
      } catch (_) {}
    }
  }
  return null;
}

/**
 * Normalize directory API response to { employees: [...] } in dashboard format.
 * Accepts: JSON (object with list, or array), or HTML with embedded JSON.
 * Also accepts Nokia Directory profile-style fields (Email, Business Title, Team, Responsible).
 */
function normalizeDirectoryResponse(body) {
  let data = null;
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        data = JSON.parse(body);
      } catch (_) {}
    }
    if (data == null) data = extractJsonFromHtml(body);
  } else {
    data = body;
  }
  if (data == null) throw new Error("Could not parse directory response as JSON or HTML with JSON.");
  let list = Array.isArray(data)
    ? data
    : data.employees || data.data || data.results || data.people || [];
  if (!Array.isArray(list)) list = [];
  let employees = list.map((record, i) => mapDirectoryRecordToEmployee(record, i));
  employees = resolveManagerIds(employees);
  return { employees };
}

/**
 * Fetch hierarchy from DIRECTORY_URL (GET).
 * Accepts JSON or HTML (with embedded JSON). Uses Basic auth if DIRECTORY_USER is set.
 */
function fetchFromDirectory() {
  return new Promise((resolve, reject) => {
    const url = new URL(DIRECTORY_URL);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const options = {
      method: "GET",
      headers: { Accept: "application/json, text/html; q=0.9" },
      agent: isHttps && DIRECTORY_INSECURE ? new https.Agent({ rejectUnauthorized: false }) : undefined
    };
    if (DIRECTORY_USER) {
      const auth = Buffer.from(`${DIRECTORY_USER}:${DIRECTORY_PASSWORD}`).toString("base64");
      options.headers.Authorization = `Basic ${auth}`;
    }

    const req = transport.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Directory returned ${res.statusCode}`));
          return;
        }
        try {
          resolve(normalizeDirectoryResponse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Load and normalize from a local JSON file (e.g. export from directory UI or API).
 */
function loadFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  return normalizeDirectoryResponse(data);
}

function main() {
  const fileArg = process.argv.indexOf("--file");
  const outArg = process.argv.indexOf("--out");
  const outputPath = outArg >= 0 && process.argv[outArg + 1]
    ? path.resolve(process.argv[outArg + 1])
    : defaultHierarchyPath;

  let promise;

  if (fileArg >= 0 && process.argv[fileArg + 1]) {
    const inputPath = path.resolve(process.argv[fileArg + 1]);
    if (!fs.existsSync(inputPath)) {
      console.error("File not found:", inputPath);
      process.exit(1);
    }
    console.log("Reading from file:", inputPath);
    promise = Promise.resolve(loadFromFile(inputPath));
  } else {
    console.log("Fetching from directory:", DIRECTORY_URL);
    promise = fetchFromDirectory();
  }

  promise
    .then((hierarchy) => {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(hierarchy, null, 2), "utf8");
      console.log("Wrote", hierarchy.employees.length, "employees to", outputPath);
    })
    .catch((err) => {
      console.error("Sync failed:", err.message);
      process.exit(1);
    });
}

main();
