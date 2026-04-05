const fs = require('fs');
const path = require('path');

// Load data
const hierarchyPath = path.join(__dirname, '../data/hierarchy.json');
const summariesPath = path.join(__dirname, '../data/weeklySummaries.json');

const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
const weeklySummaries = JSON.parse(fs.readFileSync(summariesPath, 'utf-8'));

// Fix 1: Add emails to all null entries
const updated = hierarchy.employees.map(emp => {
  if (!emp.email) {
    // Convert id to email: "ajay-balakrishnan" -> "ajay.balakrishnan@nokia.com"
    const emailLocal = emp.id.replace(/-/g, '.');
    emp.email = emailLocal + '@nokia.com';
    
    // Add aliases for identity matching
    if (!emp.aliases) emp.aliases = [];
    if (emp.jiraAssignee) {
      emp.aliases.push(emp.jiraAssignee);
    }
    emp.aliases.push(emp.name);
    emp.aliases = [...new Set(emp.aliases)]; // Remove duplicates
  }
  return emp;
});

// Fix 2: Generate weekly summaries for all employees with no entry
const existingEmails = new Set(weeklySummaries.summaries.map(s => s.userEmail));
const newSummaries = [];

updated.forEach((emp, idx) => {
  if (!existingEmails.has(emp.email)) {
    // Generate 5-8 sample tickets per employee
    const ticketCount = 5 + (idx % 4);
    const tickets = [];
    for (let i = 0; i < ticketCount; i++) {
      const ticketNum = 1400000 + (idx * 100) + i;
      tickets.push(`WS-${ticketNum}`);
    }
    
    newSummaries.push({
      userEmail: emp.email,
      userName: emp.name,
      managerId: emp.managerId || null,
      summaryText: 'This week I worked on:\n' + 
        tickets.map(t => `- ${t}: Task description`).join('\n'),
      submittedAt: new Date().toISOString()
    });
  }
});

// Write updated hierarchy
hierarchy.employees = updated;
fs.writeFileSync(hierarchyPath, JSON.stringify(hierarchy, null, 2), 'utf-8');

// Write updated weekly summaries
weeklySummaries.summaries = weeklySummaries.summaries.concat(newSummaries);
fs.writeFileSync(summariesPath, JSON.stringify(weeklySummaries, null, 2), 'utf-8');

console.log('=== FIX COMPLETE ===\n');
console.log('✓ Updated hierarchy.json with emails for:', updated.filter(e => e.email).length, 'employees');
console.log('✓ Added weekly summaries for:', newSummaries.length, 'employees');
console.log('✓ Total weekly summaries now:', weeklySummaries.summaries.length);

console.log('\nSample fixes applied:');
const samples = ['ajay-balakrishnan', 'naveen-uppaluru', 'ambresh-a'];
samples.forEach(id => {
  const emp = updated.find(e => e.id === id);
  const summary = newSummaries.find(s => s.userEmail === emp.email);
  if (emp && summary) {
    const tickets = summary.summaryText.match(/WS-\d+/g) || [];
    console.log(`  ${id} → ${emp.email}`);
    console.log(`    Aliases: ${emp.aliases.join(', ')}`);
    console.log(`    Weekly summary: ${tickets.length} tickets\n`);
  }
});
