const fs = require("fs");

function readHierarchyData(hierarchyFile) {
  try {
    const raw = fs.readFileSync(hierarchyFile, "utf8");
    const parsed = JSON.parse(raw);
    const employees = Array.isArray(parsed.employees) ? parsed.employees : [];
    return { employees };
  } catch {
    return { employees: [] };
  }
}

function createIndices(employees) {
  const byId = new Map();
  const reportsByManager = new Map();

  employees.forEach((person) => {
    byId.set(person.id, person);
    const managerId = person.managerId || null;
    if (!reportsByManager.has(managerId)) {
      reportsByManager.set(managerId, []);
    }
    reportsByManager.get(managerId).push(person);
  });

  return { byId, reportsByManager };
}

function normalizeLookup(input) {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return "";
  const at = s.indexOf("@");
  if (at <= 0) return s;
  const local = s.slice(0, at).replace(/_/g, ".");
  return local + s.slice(at);
}

function emailLocalPart(input) {
  const s = normalizeLookup(input);
  const at = s.indexOf("@");
  return at > 0 ? s.slice(0, at) : s;
}

function compactIdentity(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function compactNoDigits(input) {
  return compactIdentity(input).replace(/[0-9]/g, "");
}

function getManagers(employees) {
  return employees
    .filter((person) => String(person.role || "").toLowerCase() === "manager")
    .map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      role: person.role,
      level: person.level || null,
      title: person.title || null,
      orgUnit: person.orgUnit || null
    }));
}

function getReportees(employees, managerId, includeIndirect = true) {
  const { byId, reportsByManager } = createIndices(employees);
  const manager = byId.get(managerId);
  if (!manager) {
    return { manager: null, reportees: [] };
  }

  const reportees = [];
  const queue = (reportsByManager.get(managerId) || []).map((person) => ({ person, depth: 1 }));

  while (queue.length > 0) {
    const { person, depth } = queue.shift();
    reportees.push({
      id: person.id,
      name: person.name,
      email: person.email,
      jiraAssignee: person.jiraAssignee || person.email || person.id,
      aliases: Array.isArray(person.aliases) ? person.aliases : [],
      role: person.role || "employee",
      level: person.level || null,
      title: person.title || null,
      orgUnit: person.orgUnit || null,
      managerId: person.managerId || null,
      depth
    });

    if (includeIndirect) {
      const children = reportsByManager.get(person.id) || [];
      children.forEach((child) => queue.push({ person: child, depth: depth + 1 }));
    }
  }

  return {
    manager,
    reportees
  };
}

function findUserByEmail(employees, email) {
  const lookup = normalizeLookup(email);
  const lookupLocal = emailLocalPart(lookup);
  const lookupCompact = compactIdentity(email);
  const lookupCompactNoDigits = compactNoDigits(email);
  if (!lookup) return null;

  return employees.find((person) => {
    const personEmail = normalizeLookup(person.email);
    const personEmailLocal = emailLocalPart(person.email);
    const personId = normalizeLookup(person.id);
    const personName = normalizeLookup(person.name).replace(/\s+/g, "");
    const personAssignee = normalizeLookup(person.jiraAssignee);
    const personAssigneeLocal = emailLocalPart(person.jiraAssignee);
    const personCompactCandidates = [
      person.email,
      person.id,
      person.name,
      person.jiraAssignee
    ];
    const aliases = Array.isArray(person.aliases)
      ? person.aliases.map((item) => normalizeLookup(item))
      : [];

    const compactMatch = personCompactCandidates.some((value) => compactIdentity(value) === lookupCompact);
    const compactNoDigitsMatch = personCompactCandidates.some((value) => compactNoDigits(value) === lookupCompactNoDigits);
    const aliasCompactMatch = Array.isArray(person.aliases)
      ? person.aliases.some((value) => compactIdentity(value) === lookupCompact || compactNoDigits(value) === lookupCompactNoDigits)
      : false;

    return (
      personEmail === lookup ||
      personEmailLocal === lookup ||
      personEmail === lookupLocal ||
      personEmailLocal === lookupLocal ||
      personId === lookup ||
      personName === lookup.replace(/\s+/g, "") ||
      personAssignee === lookup ||
      personAssigneeLocal === lookup ||
      aliases.includes(lookup) ||
      aliases.includes(lookupLocal) ||
      compactMatch ||
      compactNoDigitsMatch ||
      aliasCompactMatch
    );
  }) || null;
}

function findNearestManager(employees, user) {
  if (!user) return null;
  const { byId } = createIndices(employees);

  if (String(user.role || "").toLowerCase() === "manager") {
    return user;
  }

  let cursor = user;
  while (cursor && cursor.managerId) {
    const parent = byId.get(cursor.managerId);
    if (!parent) break;
    if (String(parent.role || "").toLowerCase() === "manager") {
      return parent;
    }
    cursor = parent;
  }

  return null;
}

function resolveUserContext(employees, email) {
  const user = findUserByEmail(employees, email);
  if (!user) return null;

  const manager = findNearestManager(employees, user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      jiraAssignee: user.jiraAssignee || user.email || user.id,
      aliases: Array.isArray(user.aliases) ? user.aliases : [],
      role: user.role || "employee",
      level: user.level || null,
      title: user.title || null,
      orgUnit: user.orgUnit || null
    },
    managerScope: manager
      ? {
          managerId: manager.id,
          managerName: manager.name,
          managerEmail: manager.email,
          managerLevel: manager.level || null,
          managerTitle: manager.title || null,
          managerOrgUnit: manager.orgUnit || null,
          isManagerUser: manager.id === user.id
        }
      : null
  };
}

function toId(str) {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .slice(0, 80) || "manager";
}

function emailToUserId(email) {
  const local = String(email || "").trim().split("@")[0];
  if (!local) return toId(email);
  return toId(local);
}

/**
 * Derive role from job title for login/dashboard.
 * Manager: title contains "manager", "director", "head of", "president", "ceo" (e.g. Technical Manager, Senior Director Engineering).
 * Engineer/employee: Engineer, Technical Specialist, Senior Technical Specialist, Principal Engineer, etc. → employee.
 */
function deriveRoleFromTitle(title) {
  const t = String(title || "").trim().toLowerCase();
  if (!t) return "employee";
  if (/\bmanager\b|director|head of|president|\bceo\b/i.test(t)) return "manager";
  return "employee";
}

/**
 * Build auth context from a directory profile (no local hierarchy).
 * Used when /api/auth/context fetches from directory.int.net.nokia.com.
 * Role is derived from profile.title (manager vs engineer/technical specialist).
 */
function resolveUserContextFromDirectoryProfile(profile) {
  if (!profile || !profile.email) return null;
  const userId = profile.nokiaId ? `n${profile.nokiaId}` : emailToUserId(profile.email);
  const managerId = profile.responsibleId
    ? `n${profile.responsibleId}`
    : profile.responsible
      ? toId(profile.responsible)
      : null;
  const role = deriveRoleFromTitle(profile.title);
  return {
    user: {
      id: userId,
      name: profile.name || profile.email,
      email: profile.email,
      role,
      level: profile.level || null,
      title: profile.title || null,
      orgUnit: profile.orgUnit || null
    },
    managerScope: profile.responsible
      ? {
          managerId,
          managerName: profile.responsible,
          managerEmail: null,
          managerLevel: null,
          managerTitle: null,
          managerOrgUnit: null,
          isManagerUser: false
        }
      : null
  };
}

/**
 * Build minimal auth context from email only (when directory is unreachable).
 * No manager scope; user can still use the app.
 */
function resolveUserContextFromEmail(email) {
  const e = String(email || "").trim();
  if (!e) return null;
  const nameFromEmail = e.split("@")[0].replace(/[._]/g, " ").trim() || e;
  return {
    user: {
      id: emailToUserId(e),
      name: nameFromEmail,
      email: e,
      role: "employee",
      level: null,
      title: null,
      orgUnit: null
    },
    managerScope: null
  };
}

module.exports = {
  readHierarchyData,
  getManagers,
  getReportees,
  resolveUserContext,
  resolveUserContextFromDirectoryProfile,
  resolveUserContextFromEmail
};
