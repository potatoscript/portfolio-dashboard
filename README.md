# 🚀 Portfolio Dashboard

**GitHub Projects + Automation + AI Monitoring**

A fully automated **Project Health Dashboard** built on top of GitHub:

* 📅 Timeline management via GitHub Projects (v2)
* ⚙️ CI/CD automation via GitHub Actions
* 🌐 Static dashboard via GitHub Pages
* 🤖 AI-like risk prediction (rule-based)
* 🔄 Continuous sync between planning and execution

---

# 🧠 System Overview

```text
GitHub Project (Source of Truth)
        ↓
GitHub Actions (Scheduled Sync)
        ↓
GraphQL API (project.json)
        ↓
generate.js (Processing Engine)
        ↓
docs/overdue.json
        ↓
Dashboard (GitHub Pages)
```

### 🔑 Core Principle

> **GitHub Project = Reality**
> **Dashboard = Reflection**

---

# 📊 What This System Does

Automatically:

✅ Tracks project issues
✅ Reads structured fields:

* Due Date
* Start Date
* Status
* Priority

✅ Detects:

* Overdue tasks
* Urgent deadlines
* Inactive work

✅ Generates:

* 📄 JSON data (`overdue.json`)
* 📊 Charts & tables (via `index.html`)
* 👤 Team workload insights

✅ Advanced features:

* 🤖 Risk prediction (deadline failure)
* 💬 Auto-comments on overdue issues
* 🔔 Slack / LINE alerts (optional)
* 📈 Timeline health tracking

---

# 📅 Project Timeline Setup (CRITICAL)

You are not just tracking issues—you are building a **timeline-driven execution system**.

---

## ✅ STEP 1 — Create GitHub Project (v2)

Go to:

```
GitHub → Projects → New Project
```

⚠️ MUST use **Project V2** (not classic)

---

## 🔹 Required Fields

| Field Name | Type          | Purpose           |
| ---------- | ------------- | ----------------- |
| Due Date   | Date          | Deadline tracking |
| Start Date | Date          | Execution start   |
| Status     | Single Select | Workflow state    |
| Priority   | Single Select | Risk weighting    |

---

## 🎯 Result: “Gantt-lite” Timeline

```text
Task A → Start: Apr 20 → Due: Apr 25
Task B → Start: Apr 22 → Due: Apr 28
```

---

## ⚠️ Important

* You MUST manually add issues into the project
* No items = empty dashboard

---

# ⚙️ Automation (GitHub Actions)

---

## ✅ STEP 2 — Workflow Schedule

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: "0 * * * *"  # every hour
```

---

## 🧠 What Happens

```text
Every hour:
→ Fetch project data (GraphQL)
→ Process metrics (generate.js)
→ Update dashboard JSON
→ Deploy via GitHub Pages
```

---

## ⚠️ Important Truth

GitHub Projects **DO NOT push updates**

👉 Your system uses:

```text
Polling (pull-based sync)
```

---

# 🧠 Data Processing Logic (`generate.js`)

---

## 📅 Timeline Intelligence

### Progress Calculation

```javascript
progress = (time passed / total duration) * 100
```

---

### Schedule Health

```javascript
if (overdue) → delayed
if (progress high but time left large) → slow-progress
else → on-track
```

---

## 🤖 AI Risk Prediction

Simple but effective scoring:

```text
Overdue → +3
Near deadline → +2
Inactive (>3 days) → +2
```

---

### Prediction Rule

```text
risk >= 4 → ⚠️ Likely to miss deadline
```

---

# 📊 Dashboard Features

* 📈 Status overview chart
* 🏆 Top overdue issues
* 🔥 Urgent tasks
* 👤 Team workload ranking
* 🤖 Risk prediction panel
* ⏱ Timeline health view

---

# 📁 Project Structure

```
portfolio-dashboard/
├── .github/workflows/
│   └── update.yml
├── docs/
│   ├── index.html
│   └── overdue.json
├── generate.js
└── README.md
```

---

# 🌐 GitHub Pages Setup

```
Settings → Pages
Source: Deploy from branch
Branch: main
Folder: /docs
```

Access your dashboard:

```
https://<your-username>.github.io/portfolio-dashboard/
```

---

# 🔑 GitHub Token Setup

Go to:

```
Settings → Developer Settings → Personal Access Token
```

---

## Required Permissions

```
repo
project
read:org
```

Save in:

```
Repo → Settings → Secrets → Actions

GH_TOKEN = your_token
```

---

# 🚨 Real-World Issues & Fixes (IMPORTANT)

---

## ❌ Issue 1 — `project.json not found`

**Cause**

```
Trying to read issues.json
```

**Fix**

```
Use GraphQL project API
```

---

## ❌ Issue 2 — No project found

**Cause**

```
Using repository.projectsV2
```

**Fix**

```
Use viewer.projectsV2
```

---

## ❌ Issue 3 — GraphQL 400 error

**Cause**

```
Broken JSON in curl
```

**Fix**

```
Use HEREDOC or proper escaping
```

---

## ❌ Issue 4 — UNION error

Error:

```
Selections can't be made directly on unions
```

---

### ✅ Fix

```graphql
field {
  ... on ProjectV2FieldCommon {
    name
  }
}
```

---

## ❌ Issue 5 — Empty Dashboard

**Cause**

```
No issues inside project
```

**Fix**

```
Add issues manually
```

---

## ❌ Issue 6 — project.json missing in repo

**Important**

```
project.json is NOT stored in repo
```

👉 It is generated **inside GitHub Actions runtime only**

---

# 🧩 Troubleshooting Checklist

If dashboard shows no data:

* ✅ Project has items
* ✅ Issues have Due Date
* ✅ Token has `project` permission
* ✅ GraphQL query is valid
* ✅ Action logs show successful fetch
* ✅ `generate.js` runs without error

---

# 🔄 System Behavior (End-to-End)

---

## 👨‍💻 You Update

Inside GitHub Project:

* Due Date
* Start Date
* Status
* Priority

---

## 🤖 System Runs

```text
Cron → Fetch → Process → Update JSON
```

---

## 📊 Dashboard Updates

Always reflects:

```text
Real-time project state
```

---

# 🚀 Future Enhancements

* 🔥 Multi-repo aggregation
* 🔥 Slack / LINE alerts
* 🔥 Gantt chart UI
* 🔥 Burn-down charts
* 🔥 ML-based prediction
* 🔥 Auto task assignment
* 🔥 Team productivity scoring

---

