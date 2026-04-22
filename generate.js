const fs = require("fs");
const fetch = global.fetch || require("node-fetch");

// =======================
// 🔧 CONFIG
// =======================

const REPO = process.env.REPO;
const TOKEN = process.env.GH_TOKEN;

// =======================
// 💬 COMMENT
// =======================

async function comment(issue, message) {
  if (!TOKEN) return;

  try {
    const res = await fetch(
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

    if (!res.ok) {
      console.error("❌ Comment failed:", issue.number);
    }
  } catch (err) {
    console.error("❌ Comment error:", err);
  }
}

// =======================
// 🧠 AI RISK
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

    // 🔥 SAFE ACCESS
    const project =
      raw?.data?.viewer?.projectsV2?.nodes?.[0];

    if (!project) {
      throw new Error("No project found in project.json");
    }

    const items = project.items.nodes;

    console.log("📦 Project items:", items.length);

    const now = new Date();

    const overdue = [];
    const urgent = [];
    const predictions = [];
    const users = {};

    for (const node of items) {
      const issue = node.content;
      if (!issue) continue;

      if (issue.pull_request) continue;

      const fields = node.fieldValues.nodes;

      // =======================
      // 📅 GET DUE DATE (FROM PROJECT FIELD)
      // =======================

      const dueField = fields.find(
        (f) => f.field?.name === "Due Date"
      );

      if (!dueField || !dueField.date) continue;

      const due = new Date(dueField.date);
      const diff = Math.floor((due - now) / 86400000);

      const item = {
        number: issue.number,
        title: issue.title,
        repo: REPO,
        url: issue.url,
      };

      // =======================
      // 🤖 AI LOGIC
      // =======================

      const updated = new Date(
        issue.updatedAt || issue.createdAt
      );

      const inactiveDays = Math.floor(
        (now - updated) / 86400000
      );

      const risk = calculateRisk(diff, inactiveDays);

      item.risk = risk;

      if (risk >= 4) {
        item.prediction = "⚠️ Likely to miss deadline";
        predictions.push(item);
      }

      // =======================
      // 👤 USER
      // =======================

      const user =
        issue.assignees?.nodes?.[0]?.login || "unassigned";

      if (!users[user]) {
        users[user] = {
          overdue: 0,
          urgent: 0,
          total: 0,
        };
      }

      users[user].total++;

      // =======================
      // 📊 CLASSIFY
      // =======================

      if (diff < 0) {
        item.daysOverdue = Math.abs(diff);
        overdue.push(item);
        users[user].overdue++;

        // 🔥 anti-spam (only 1st day)
        if (item.daysOverdue === 1) {
          await comment(
            issue,
            `⚠️ This issue is overdue. Please take action.`
          );
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
        score: u.overdue * 2 + u.urgent,
      }))
      .sort((a, b) => b.score - a.score);

    // =======================
    // 📊 TIMELINE
    // =======================

    const timeline = [...overdue, ...urgent].map((i) => {
      let status = "on-track";

      if (i.daysOverdue) status = "delayed";
      else if (i.daysLeft <= 2) status = "at-risk";

      return {
        number: i.number,
        title: i.title,
        status,
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

      timeline: timeline.slice(0, 10),
    };

    // =======================
    // 🛡️ WRITE FILE
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
