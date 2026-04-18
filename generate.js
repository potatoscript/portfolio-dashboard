const fs = require("fs");

// 👇 wrap everything
async function main() {

  const issues = JSON.parse(fs.readFileSync("issues.json"));
  const now = new Date();

  const overdue = [];
  const urgent = [];

  for (const issue of issues) {

    if (issue.pull_request) continue;

    const body = issue.body || "";
    const match = body.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) continue;

    const due = new Date(match[1]);
    const diff = Math.floor((due - now) / (1000 * 60 * 60 * 24));

    const item = {
      number: issue.number,
      title: issue.title,
      repo: process.env.REPO
    };

    if (diff < 0) {
      item.daysOverdue = Math.abs(diff);
      overdue.push(item);

      // ✅ NOW this works
      // await comment(issue, process.env.GH_TOKEN);
    } else if (diff <= 3) {
      item.daysLeft = diff;
      urgent.push(item);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    overdueCount: overdue.length,
    urgentCount: urgent.length,
    topOverdue: overdue,
    urgentItems: urgent,
    overloadedUsers: []
  };

  fs.writeFileSync("docs/overdue.json", JSON.stringify(output, null, 2));

  console.log("✅ JSON GENERATED");
}

// 👇 run it
main();
