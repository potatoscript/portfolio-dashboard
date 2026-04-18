module.exports = function analyze(issues) {
  const now = new Date();
  const users = {};

  issues.forEach(issue => {
    if (issue.pull_request) return;

    const user = issue.assignee?.login || "none";
    users[user] = users[user] || {
      overdue: 0,
      urgent: 0,
      inactivity: 0,
      total: 0
    };

    const body = issue.body || "";
    const match = body.match(/(\d{4}-\d{2}-\d{2})/);

    if (!match) return;

    const due = new Date(match[1]);
    const diff = Math.floor((due - now) / (1000 * 60 * 60 * 24));

    const updated = new Date(issue.updated_at);
    const inactiveDays = Math.floor((now - updated) / (1000 * 60 * 60 * 24));

    users[user].total++;

    if (diff < 0) users[user].overdue += Math.abs(diff);
    else if (diff <= 3) users[user].urgent++;

    users[user].inactivity += inactiveDays;
  });

  return Object.entries(users).map(([user, u]) => {
    const risk =
      u.overdue * 2 +
      u.urgent +
      u.total * 0.5 +
      u.inactivity * 1.5;

    return {
      user,
      risk: Math.round(risk),
      level:
        risk > 20 ? "HIGH" :
        risk > 10 ? "MEDIUM" : "LOW"
    };
  });
};
