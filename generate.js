const fs = require("fs");

const issues = JSON.parse(fs.readFileSync("issues.json"));
const now = new Date();

const overdue = [];
const urgent = [];
const users = {};

issues.forEach(issue => {
  if (issue.pull_request) return;

  const body = issue.body || "";
  const match = body.match(/(\d{4}-\d{2}-\d{2})/);

  if (!match) return;

  const due = new Date(match[1]);
  const diff = Math.floor((due - now) / (1000 * 60 * 60 * 24));

  const item = {
    number: issue.number,
    title: issue.title,
    repo: "potatoscript/portfolio"
  };

  const user = issue.assignee?.login || "none";
  users[user] = users[user] || { overdue: 0, urgent: 0 };

  if (diff < 0) {
    item.daysOverdue = Math.abs(diff);
    overdue.push(item);
    users[user].overdue++;
  } else if (diff <= 3) {
    item.daysLeft = diff;
    urgent.push(item);
    users[user].urgent++;
  }
});

const output = {
  generatedAt: new Date().toISOString(),
  overdueCount: overdue.length,
  urgentCount: urgent.length,
  topOverdue: overdue.slice(0, 5),
  urgentItems: urgent.slice(0, 5),
  overloadedUsers: Object.entries(users).map(([u,v]) => ({
    user: u,
    overdue: v.overdue,
    urgent: v.urgent,
    score: v.overdue * 2 + v.urgent
  }))
};

fs.writeFileSync("docs/overdue.json", JSON.stringify(output, null, 2));
