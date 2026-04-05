const fs = require("fs");

function readRawTeamData(rawDataFile) {
  try {
    const raw = fs.readFileSync(rawDataFile, "utf8");
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed.records) ? parsed.records : [];
    return { records };
  } catch {
    return { records: [] };
  }
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length);
}

function aggregateRawMetrics(records, employeeIds = []) {
  const idSet = new Set(employeeIds);
  const scoped = idSet.size > 0
    ? records.filter((record) => idSet.has(record.employeeId))
    : [...records];

  const attendance = average(scoped.map((record) => record.attendancePct));
  const productivity = average(scoped.map((record) => record.productivityPct));
  const utilization = average(scoped.map((record) => record.utilizationPct));
  const completed = scoped.reduce((sum, record) => sum + Number(record.completedTasks || 0), 0);
  const planned = scoped.reduce((sum, record) => sum + Number(record.plannedTasks || 0), 0);
  const executionRate = planned > 0 ? Math.round((completed / planned) * 100) : 0;

  return {
    attendance,
    productivity,
    utilization,
    executionRate,
    sampleSize: scoped.length
  };
}

module.exports = {
  readRawTeamData,
  aggregateRawMetrics
};
