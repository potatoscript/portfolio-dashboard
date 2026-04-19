const fs = require("fs");

// =======================
// 🔧 CONFIG
// =======================

// Use current repo by default
const repos = [process.env.REPO];

// =======================
// 🚀 MAIN
// =======================

async function main() {
  try {
    const issues = JSON.parse(fs.readFileSync("issues.json"));

    console.log("📦 Issues fetched:", issues.length);

    const now = new Date();

    const overdue = [];
    const urgent = [];
    const users = {};

    for (const issue of issues) {
      if (issue.pull_request) continue;

      const body = issue.body || "";

      // ✅ safer parsing
      const match = body.match(/Due Date:\s*(\d{4}-\d{2}-\d{2})/);
      if (!match) continue;

      const due = new Date(match[1]);
      const diff = Math.floor((due - now) / (1000 * 60 * 60 * 24));

      const item = {
        number: issue.number,
        title: issue.title,
        repo: process.env.REPO,
        url: issue.html_url
      };

      const user = issue.assignee?.login || "unassigned";

      if (!users[user]) {
        users[user] = {
          overdue: 0,
          urgent: 0,
          total: 0
        };
      }

      users[user].total++;

      // =======================
      // 📊 CLASSIFICATION
      // =======================

      if (diff < 0) {
        item.daysOverdue = Math.abs(diff);
        overdue.push(item);
        users[user].overdue++;

      } else if (diff <= 3) {
        item.daysLeft = diff;
        urgent.push(item);
        users[user].urgent++;
      }
    }

    // =======================
    // 👤 TEAM LOAD
    // =======================

    const overloadedUsers = Object.entries(users).map(([user, u]) => ({
      user,
      overdue: u.overdue,
      urgent: u.urgent,
      total: u.total,
      score: u.overdue * 2 + u.urgent
    }))
    .sort((a, b) => b.score - a.score);

    // =======================
    // 📤 OUTPUT
    // =======================

    const output = {
      generatedAt: new Date().toISOString(),

      overdueCount: overdue.length,
      urgentCount: urgent.length,

      topOverdue: overdue
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 5),

      urgentItems: urgent
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5),

      overloadedUsers: overloadedUsers.slice(0, 10)
    };

    // =======================
    // 🛡️ SAFE WRITE
    // =======================

    if (!fs.existsSync("docs")) {
      fs.mkdirSync("docs");
    }

    fs.writeFileSync(
      "docs/overdue.json",
      JSON.stringify(output, null, 2)
    );

    console.log("✅ Dashboard JSON updated");

  } catch (err) {
    console.error("❌ ERROR:", err);

    // Always write fallback JSON
    fs.writeFileSync(
      "docs/overdue.json",
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        overdueCount: 0,
        urgentCount: 0,
        topOverdue: [],
        urgentItems: [],
        overloadedUsers: [],
        error: "Failed to generate data"
      }, null, 2)
    );
  }
}

// =======================
// ▶️ RUN
// =======================

main();
