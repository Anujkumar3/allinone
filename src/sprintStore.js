const fs = require("fs");
const path = require("path");

function normalizeDate(value) {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function readSprintWindow(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      startDate: normalizeDate(parsed.startDate),
      endDate: normalizeDate(parsed.endDate),
      updatedAt: String(parsed.updatedAt || ""),
      updatedBy: String(parsed.updatedBy || "")
    };
  } catch {
    return {
      startDate: "",
      endDate: "",
      updatedAt: "",
      updatedBy: ""
    };
  }
}

function writeSprintWindow(filePath, payload) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function setSprintWindow(filePath, { startDate, endDate, updatedBy }) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end) {
    throw new Error("startDate and endDate are required in YYYY-MM-DD format.");
  }
  if (start > end) {
    throw new Error("startDate cannot be after endDate.");
  }

  const next = {
    startDate: start,
    endDate: end,
    updatedAt: new Date().toISOString(),
    updatedBy: String(updatedBy || "")
  };
  writeSprintWindow(filePath, next);
  return next;
}

module.exports = {
  readSprintWindow,
  setSprintWindow
};
