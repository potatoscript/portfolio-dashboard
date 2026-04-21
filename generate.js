const fs = require("fs");
const fetch = global.fetch || require("node-fetch");

// =======================
// 🔧 CONFIG
// =======================

const REPO = process.env.REPO;
const TOKEN = process.env.GH_TOKEN;

// =======================
// 💬 COMMENT (ANTI-SPAM SAFE)
// =======================

async function comment(issue, message) {
  if (!TOKEN) return;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/issues/${issue.number}/comments`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ body: message })
      }
    );

    if (!res.ok) {
      console.error("❌ Comment failed:", issue.number);
    }

  } catch (err) {
    console.error("❌ Comment error:", err);
  }
}

// =======================
// 🧠 AI RISK SCORING
// =======================

function calculateRisk(diff, inactiveDays) {
  return (
    (diff < 0 ? 3 : 0) +                       // overdue
    (diff >= 0 && diff <= 2 ? 2 : 0) +         // near deadline
    (inactiveDays > 3 ? 2 : 0)                 // inactive
  );
}

// =======================
// 📊 CLASSIFICATION
// =======================

function classify(diff, item, issue, userStats, user) {
  if (diff < 0) {
    item.daysOverdue = Math.abs(diff);
    userStats.overdue++;

    // 🔥 Anti-spam: only once (day 1 overdue)
    if (item.daysOverdue === 1) {
      return { type: "overdue", notify: true };
    }

    return { type: "overdue", notify: false };

  } else if (diff <= 3) {
    item.daysLeft = diff;
    userStats.urgent++;
    return { type: "urgent", notify: false };
  }

  return { type: "normal", notify: false };
}

// =======================
// 📅 PARSE DUE DATE
// =======================

function parseDueDate(issue) {
  const body = issue.body || "";
  const match = body.match(/Due Date:\s*(\d{4}-\d{2}-\d{2})/);

  if (!match) return null;

  return new Date(match[1]);
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

      // =======================
      // 📅 DUE DATE
      // =======================
      const due = parseDueDate(issue);
      if (!due) continue;

      const diff = Math.floor((due - now) / 86400000);

      const item = {
        number: issue.number,
        title: issue.title,
        repo: REPO,
        url: issue.html_url
      };

      // =======================
      // 🤖 AI LOGIC
      // =======================

      const updated = new Date(issue.updated_at || issue.created_at);
      const inactiveDays = Math.floor((now - updated) / 86400000);

      const risk = calculateRisk(diff, inactiveDays);

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
        users[user] = { overdue: 0, urgent: 0, total: 0 };
      }

      users[user].total++;

      // =======================
      // 📊 CLASSIFICATION
      // =======================

      const result = classify(diff, item, issue, users[user], user);

      if (result.type === "overdue") {
        overdue.push(item);

        if (result.notify) {
          await comment(issue,
            `⚠️ This issue is overdue. Please take action.`);
        }

      } else if (result.type === "urgent") {
        urgent.push(item);
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
    // 📊 TIMELINE HEALTH (NEW)
    // =======================

    const timeline = [...overdue, ...urgent].map(i => {
      let status = "on-track";

      if (i.daysOverdue) status = "delayed";
      else if (i.daysLeft <= 2) status = "at-risk";

      return {
        number: i.number,
        title: i.title,
        status
      };
    });

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

      predictions: predictions.slice(0, 5),

      timeline: timeline.slice(0, 10)
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
        timeline: [],
        error: "Failed to generate data"
      }, null, 2)
    );
  }
}

// =======================
// ▶️ RUN
// =======================

main();
