const path = require("path");

module.exports = {
  host: String(process.env.HOST || "0.0.0.0").trim(),
  port: Number(process.env.PORT || 3000),
  mongoUri: String(process.env.MONGODB_URI || "").trim(),
  mongoDbName: String(process.env.MONGODB_DB || process.env.MONGODB_DATABASE || "allinonw").trim(),
  publicDir: path.join(__dirname, "..", "public"),
  dataFile: path.join(__dirname, "..", "data", "dashboard.json"),
  hierarchyFile: path.join(__dirname, "..", "data", "hierarchy.json"),
  rawDataFile: path.join(__dirname, "..", "data", "teamRawData.json"),
  weeklySummariesFile: path.join(__dirname, "..", "data", "weeklySummaries.json"),
  blockersFile: path.join(__dirname, "..", "data", "blockers.json"),
  notificationsFile: path.join(__dirname, "..", "data", "notifications.json"),
  sprintWindowFile: path.join(__dirname, "..", "data", "sprintWindow.json")
};
