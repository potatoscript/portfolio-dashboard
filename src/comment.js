const fetch = require("node-fetch");

module.exports = async function comment(issue, token) {

  const url = `https://api.github.com/repos/${issue.repo}/issues/${issue.number}/comments`;

  const body = {
    body: `⚠️ This issue may miss its deadline.
Please update status or adjust due date.

_automated by dashboard_`
  };

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
};
