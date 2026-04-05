#!/usr/bin/env node
/**
 * Friday reminder: list reportees who have not submitted weekly summary for the current week.
 * Run via cron (e.g. Friday 4pm): node scripts/friday-reminder.js
 * Outputs JSON to stdout; optionally set REMINDER_OUTPUT_FILE to write to a file.
 * Optional SMTP (REMINDER_SMTP_*): send one email per manager with non-submitters list.
 */

const path = require("path");
const fs = require("fs");

const { hierarchyFile, weeklySummariesFile } = require(path.join(__dirname, "..", "src", "config.js"));
const { readHierarchyData, getManagers, getReportees } = require(path.join(__dirname, "..", "src", "hierarchyStore.js"));
const { getWeekKey, getNonSubmitters } = require(path.join(__dirname, "..", "src", "weeklySummaryStore.js"));

function run() {
  const hierarchy = readHierarchyData(hierarchyFile);
  const managers = getManagers(hierarchy.employees);
  const weekKey = getWeekKey(new Date());

  const result = {
    weekKey,
    generatedAt: new Date().toISOString(),
    managers: []
  };

  managers.forEach((manager) => {
    const details = getReportees(hierarchy.employees, manager.id, true);
    const nonSubmitters = getNonSubmitters(weeklySummariesFile, manager.id, weekKey, details.reportees);
    result.managers.push({
      managerId: manager.id,
      managerName: manager.name,
      managerEmail: manager.email,
      reporteeCount: details.reportees.length,
      nonSubmitterCount: nonSubmitters.length,
      nonSubmitters: nonSubmitters.map((r) => ({ name: r.name, email: r.email }))
    });
  });

  const out = JSON.stringify(result, null, 2);
  const outputFile = process.env.REMINDER_OUTPUT_FILE;
  if (outputFile) {
    fs.writeFileSync(outputFile, out, "utf8");
    console.error("Wrote reminder list to " + outputFile);
  }
  console.log(out);
}

run();
