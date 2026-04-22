# 🚀 Portfolio Dashboard (GitHub Project + AI Monitoring)

A fully automated **Project Health Dashboard** powered by:

* GitHub Projects (v2)
* GitHub Actions (CI/CD)
* GitHub Pages (static dashboard)
* AI-like risk prediction (rule-based)
* Auto issue monitoring & alerts

---

# 📊 What This Project Does

This system automatically:

✅ Tracks issues from GitHub Projects
✅ Reads **Due Date / Status / Priority**
✅ Detects:

* Overdue issues
* Urgent issues
* Inactive tasks

✅ Generates:

* `docs/overdue.json` (dashboard data)
* Charts + tables (via `index.html`)
* Team workload analysis

✅ Optional:

* Auto comment on overdue issues
* Slack / LINE alerts
* AI risk prediction

---

# 🏗️ Architecture

```
GitHub Project (Issues + Fields)
        ↓
GitHub Actions (cron job)
        ↓
GraphQL API → project.json
        ↓
generate.js → overdue.json
        ↓
GitHub Pages → Dashboard UI
```

---

# ⚙️ Setup Guide (Step-by-Step)

---

## 1️⃣ Create Repository

Example:

```
portfolio-dashboard
```

---

## 2️⃣ Enable GitHub Pages

Settings → Pages

```
Source: Deploy from branch
Branch: main
Folder: /docs
```

Access:

```
https://<your-username>.github.io/portfolio-dashboard/
```

---

## 3️⃣ Create GitHub Project (CRITICAL)

Go to:

GitHub → Projects → New Project (Beta)

---

## 🔑 Add REQUIRED fields

| Field Name | Type          |
| ---------- | ------------- |
| Status     | Single Select |
| Due Date   | Date          |
| Start Date | Date          |
| Priority   | Single Select |

---

## ⚠️ IMPORTANT

* MUST be **Project v2**
* MUST add issues into project manually or via UI
* Without items → dashboard = empty

---

## 4️⃣ Add Issues to Project

### Method A (UI)

* Open issue
* Right sidebar → Projects → Add

### Method B (Project view)

* Click **+ Add item**

---

## 5️⃣ Create GitHub Token

Go to:

Settings → Developer settings → Personal Access Token

---

### Required permissions:

```
repo
project
read:org
```

---

## Save in repo:

```
Settings → Secrets → Actions

GH_TOKEN = your_token
```

---

## 6️⃣ GitHub Actions (YAML)

Key responsibilities:

* Fetch project data via GraphQL
* Generate dashboard JSON
* Commit updates

---

## 🔥 CRITICAL FIXES (from real issues encountered)

---

### ❌ Problem 1: `project.json not found`

**Cause**

```
Using issues.json instead of project.json
```

**Fix**

```
Use GraphQL project API
```

---

### ❌ Problem 2: No project found

**Cause**

```
Wrong query: repository.projectsV2
```

**Fix**

```
Use viewer.projectsV2
```

---

### ❌ Problem 3: JSON parsing error (400)

**Cause**

```
Broken inline JSON in curl
```

**Fix**

```
Use HEREDOC (query.json)
```

---

### ❌ Problem 4: GraphQL UNION error

Error:

```
Selections can't be made directly on unions
```

**Cause**

```
field { name } is invalid
```

---

### ✅ Fix (IMPORTANT)

Use fragment:

```
field {
  ... on ProjectV2FieldCommon {
    name
  }
}
```

---

### ❌ Problem 5: Empty dashboard

**Cause**

```
No issues inside project
```

**Fix**

```
Add issues manually
```

---

# 🧠 AI Prediction Logic (Built-in)

Simple but effective:

```
risk =
  overdue → +3
  due soon → +2
  inactive → +2
```

---

### Prediction:

```
risk >= 4 → ⚠️ Likely to miss deadline
```

---

# 🔄 Automation (GitHub Actions)

Runs every hour:

```
cron: "0 * * * *"
```

---

### Flow:

1. Fetch project data
2. Process via `generate.js`
3. Output JSON
4. Commit to repo
5. GitHub Pages auto-updates

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

# 📊 Dashboard Features

* Status chart
* Overdue ranking
* Urgent issues
* Team workload
* AI prediction
* Timeline health

---

# 🚨 Things You MUST Remember (Hard Lessons)

---

## 1. Project Type Matters

```
Use: viewer.projectsV2
NOT: repository.projectsV2
```

---

## 2. GraphQL is Strict

* Union types require fragments
* JSON must be valid

---

## 3. GitHub Actions ≠ Local Files

```
project.json is TEMPORARY
```

It does NOT exist in repo.

---

## 4. Data comes ONLY from Project

```
No project items = empty dashboard
```

---

## 5. Token Permissions are Critical

Missing:

```
project
```

→ Everything breaks silently

---

# 🚀 Future Enhancements

* 🔥 Multi-repo aggregation
* 🔥 Slack / LINE notifications
* 🔥 Gantt timeline chart
* 🔥 Real ML prediction model
* 🔥 Auto assign tasks
* 🔥 Productivity scoring

---

# 🧩 Troubleshooting Checklist

If dashboard is empty:

✅ Project has items
✅ Issues have Due Date
✅ Token has project permission
✅ GraphQL query valid
✅ generate.js runs successfully

---

# 🎯 Final Notes

This project is not just a dashboard.

It is a **mini project management system powered by GitHub**:

* Replace Jira / Linear (lightweight)
* Fully automated
* Developer-friendly
* Extensible with AI

---

# 💡 Philosophy

> “If it's not tracked, it will be late.
> If it's not automated, it will be ignored.”

---

# 👨‍💻 Author

Built as a **leadership + engineering system**
to manage teams, deadlines, and delivery health.

---

