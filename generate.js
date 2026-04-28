const fs = require("fs");
const fetch = global.fetch || require("node-fetch");

const REPO = process.env.REPO;
const TOKEN = process.env.GH_TOKEN;

// =======================
// 💬 COMMENT (optional)
// =======================
async function comment(issue, message) {
  if (!TOKEN) return;

  try {
    await fetch(
      `https://api.github.com/repos/${REPO}/issues/${issue.number}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: message }),
      }
    );
  } catch (err) {
    console.error("❌ Comment error:", err);
  }
}

// =======================
// 🧠 RISK
// =======================
function calculateRisk(diff, inactiveDays) {
  return (
    (diff < 0 ? 3 : 0) +
    (diff >= 0 && diff <= 2 ? 2 : 0) +
    (inactiveDays > 3 ? 2 : 0)
  );
}

// =======================
// 📊 MAIN
// =======================
async function main() {
  try {
    const raw = JSON.parse(fs.readFileSync("project.json"));

    const project =
      raw?.data?.viewer?.projectsV2?.nodes?.[0];

    if (!project) {
      throw new Error("No project found");
    }

    const items = project.items.nodes;
    console.log("📦 Items:", items.length);

    const now = new Date();

    const overdue = [];
    const urgent = [];
    const predictions = [];
    const users = {};
    const timeline = [];

    for (const node of items) {
      const issue = node.content;
      if (!issue || issue.pull_request) continue;

      const fields = node.fieldValues.nodes;

      // =======================
      // 📅 FIELDS
      // =======================

      const dueField = fields.find(
        (f) => f.field?.name === "Due Date"
      );

      const startField = fields.find(
        (f) => f.field?.name === "Start Date"
      );

      if (!dueField?.date) continue;

      const due = new Date(dueField.date);
      const start = startField?.date
        ? new Date(startField.date)
        : new Date(due.getTime() - 3 * 86400000); // fallback

      const diff = Math.floor((due - now) / 86400000);

      // =======================
      // 👤 USER
      // =======================
      const user =
        issue.assignees?.nodes?.[0]?.login || "unassigned";

      if (!users[user]) {
        users[user] = { overdue: 0, urgent: 0, total: 0 };
      }

      users[user].total++;

      // =======================
      // 📊 PROGRESS
      // =======================
      let progress = 0;

      const total = (due - start) / 86400000;
      const passed = (now - start) / 86400000;

      if (total > 0) {
        progress = Math.min(
          100,
          Math.max(0, Math.round((passed / total) * 100))
        );
      }

      // =======================
      // 🧠 RISK
      // =======================
      const updated = new Date(
        issue.updatedAt || issue.createdAt
      );

      const inactiveDays = Math.floor(
        (now - updated) / 86400000
      );

      const risk = calculateRisk(diff, inactiveDays);

      const item = {
        number: issue.number,
        title: issue.title,
        repo: REPO,
        url: issue.url,
        user,

        start: start.toISOString(),
        due: due.toISOString(),
        progress,
        risk,
      };

      // =======================
      // 🔮 PREDICTION
      // =======================
      if (risk >= 4) {
        item.prediction = "⚠️ Likely to miss deadline";
        predictions.push(item);
      }

      // =======================
      // 📊 CLASSIFY
      // =======================
      let status = "on-track";

      if (diff < 0) {
        item.daysOverdue = Math.abs(diff);
        overdue.push(item);
        users[user].overdue++;
        status = "delayed";

        if (item.daysOverdue === 1) {
          await comment(issue, "⚠️ This issue is overdue.");
        }

      } else if (diff <= 3) {
        item.daysLeft = diff;
        urgent.push(item);
        users[user].urgent++;
        status = "at-risk";
      }

      // =======================
      // 📅 TIMELINE ENTRY
      // =======================
      timeline.push({
        number: item.number,
        title: item.title,
        start: item.start,
        due: item.due,
        progress: item.progress,
        status,
        user,
        repo: item.repo,
      });
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
        score: u.overdue * 2 + u.urgent,
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

      predictions: predictions.slice(0, 5),

      timeline: timeline.slice(0, 20),
    };

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
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          overdueCount: 0,
          urgentCount: 0,
          topOverdue: [],
          urgentItems: [],
          overloadedUsers: [],
          predictions: [],
          timeline: [],
          error: "Failed to generate data",
        },
        null,
        2
      )
    );
  }
}

main();
