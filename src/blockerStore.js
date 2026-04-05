const fs = require("fs");

function readBlockers(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    const records = Array.isArray(parsed.records) ? parsed.records : [];
    return records.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  } catch {
    return [];
  }
}

function writeBlockers(filePath, records) {
  fs.writeFileSync(filePath, JSON.stringify({ records }, null, 2));
}

function createBlocker(filePath, payload) {
  const records = readBlockers(filePath);
  const entry = {
    id: "blk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    type: String(payload.type || "technical"),
    impact: String(payload.impact || "medium"),
    owner: String(payload.owner || "").trim(),
    since: String(payload.since || "").trim(),
    details: String(payload.details || "").trim(),
    createdByEmail: String(payload.createdByEmail || "").trim().toLowerCase(),
    createdByName: String(payload.createdByName || "").trim(),
    managerId: payload.managerId ? String(payload.managerId).trim() : null,
    status: String(payload.status || "open"),
    notifiedAt: payload.notifiedAt || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  records.unshift(entry);
  writeBlockers(filePath, records);
  return entry;
}

function listBlockers(filePath, filters = {}) {
  const records = readBlockers(filePath);
  const userEmail = String(filters.userEmail || "").trim().toLowerCase();
  const managerId = String(filters.managerId || "").trim();
  const includeResolved = Boolean(filters.includeResolved);

  return records.filter((row) => {
    if (!includeResolved && String(row.status || "open").toLowerCase() === "resolved") return false;
    if (userEmail && String(row.createdByEmail || "").toLowerCase() !== userEmail) return false;
    if (managerId && String(row.managerId || "") !== managerId) return false;
    return true;
  });
}

function updateBlockerById(filePath, id, updates = {}) {
  const records = readBlockers(filePath);
  const index = records.findIndex((row) => String(row.id) === String(id));
  if (index < 0) return null;
  const updated = {
    ...records[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  records[index] = updated;
  writeBlockers(filePath, records);
  return updated;
}

function getBlockerById(filePath, id) {
  return readBlockers(filePath).find((row) => String(row.id) === String(id)) || null;
}

module.exports = {
  createBlocker,
  listBlockers,
  updateBlockerById,
  getBlockerById
};
