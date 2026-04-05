const fs = require("fs");

function readDashboardData(dataFile) {
  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    return {
      quickLinks: [],
      defaultTasks: [],
      testDefaults: {
        pipeline: "PASS",
        unit: "0 / 0",
        integration: "0 flaky",
        lastRun: "Not set"
      }
    };
  }
}

module.exports = {
  readDashboardData
};
