const fs = require("fs");

// Node fetch safety
const fetch = global.fetch || require("node-fetch");

// =======================
// 🔧 CONFIG
// =======================

const REPO = process.env.REPO;
const TOKEN = process.env.GH_TOKEN;

// =======================
// 💬 COMMENT FUNCTION
// =======================

async function comment(issue, message) {
  if (!TOKEN) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/issues/${issue.number}/comments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body: message })
    });

    if (!res.ok) {
      console.error("❌ Comment failed:", issue.number);
    }

  } catch (err) {
    console.error("❌ Comment error:", err);
  }
}

// =======================
// 🚀 MAIN
// =======================

async function main() {
  try {
    const issues = JSON.parse(fs.readFileSync("issues.json"));

    console.log("📦 Issues:", issues.length);

    const now = new Date();

    const overdue = [];
    const urgent = [];
    const predictions = [];
    const users = {};

    for (const issue of issues) {

      if (issue.pull_request) continue;

      const body = issue.body || "";

      // =======================
      // 📅 PARSE DUE DATE
      // =======================
      const match = body.match(/Due Date:\s*(\d{4}-\d{2}-\d{2})/);
      if (!match) continue;

      const due = new Date(match[1]);
      const diff = Math.floor((due - now) / 86400000);

      const item = {
        number: issue.number,
        title: issue.title,
        repo: REPO,
        url: issue.html_url
      };

      // =======================
      // 🤖 AI RISK SCORING
      // =======================

      const updated = new Date(issue.updated_at || issue.created_at);
      const inactiveDays = Math.floor((now - updated) / 86400000);

      const risk =
        (diff < 0 ? 3 : 0) +
        (diff >= 0 && diff <= 2 ? 2 : 0) +
        (inactiveDays > 3 ? 2 : 0);

      item.risk = risk;

      if (risk >= 4) {
        item.prediction = "⚠️ Likely to miss deadline";
        predictions.push(item);
      }

      // =======================
      // 👤 USER TRACKING
      // =======================

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

        // 🔥 Anti-spam comment (only first day overdue)
        if (item.daysOverdue === 1) {
          await comment(issue,
            `⚠️ This issue is overdue. Please take action.`);
        }

      } else if (diff <= 3) {
        item.daysLeft = diff;
        urgent.push(item);
        users[user].urgent++;
      }
    }

    // =======================
    // 👤 TEAM LOAD
    // =======================

    const overloadedUsers = Object.entries(users)
      .map(([user, u]) => ({
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

      overloadedUsers: overloadedUsers.slice(0, 10),

      predictions: predictions.slice(0, 5)
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

    console.log("✅ Dashboard updated");

  } catch (err) {
    console.error("❌ ERROR:", err);

    fs.writeFileSync(
      "docs/overdue.json",
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        overdueCount: 0,
        urgentCount: 0,
        topOverdue: [],
        urgentItems: [],
        overloadedUsers: [],
        predictions: [],
        error: "Failed to generate data"
      }, null, 2)
    );
  }
}

// =======================
// ▶️ RUN
// =======================

main();
