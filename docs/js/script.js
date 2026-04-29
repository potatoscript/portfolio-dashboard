let RAW = {};

fetch("overdue.json")
.then(r => r.json())
.then(data => {
  RAW = data;
  initFilters(data);
  render();
})
.catch(err => {
  console.error("❌ Failed to load data:", err);
});

// =======================
// 🎯 RENDER
// =======================
function render() {
  const data = applyFilters(RAW);

  document.getElementById("updated").innerText =
    "Last updated: " + new Date(RAW.generatedAt).toLocaleString();

  kpi("kpiOverdue", data.overdueCount);
  kpi("kpiUrgent", data.urgentCount);
  kpi("kpiRisk", data.predictions?.length);
  kpi("kpiTotal", (data.overdueCount||0)+(data.urgentCount||0));

  renderChart(data);

  renderTable("overdue", data.topOverdue, i =>
    `<tr><td>#${i.number}</td><td>${i.title}</td><td>${i.daysOverdue}</td></tr>`);

  renderTable("urgent", data.urgentItems, i =>
    `<tr><td>#${i.number}</td><td>${i.title}</td><td>${i.daysLeft}</td></tr>`);

  renderTable("users", data.overloadedUsers, u =>
    `<tr><td>${u.user}</td><td>${u.overdue}</td><td>${u.urgent}</td></tr>`);

  renderTable("predictions", data.predictions, i =>
    `<tr><td>#${i.number}</td><td>${i.title}</td><td><span class="badge badge-danger">High</span></td></tr>`);

  renderGantt(data);
}

// =======================
// 📊 CHART
// =======================
function renderChart(data) {
  new Chart(document.getElementById("statusChart"), {
    type:"doughnut",
    data:{
      labels:["Overdue","Urgent"],
      datasets:[{
        data:[data.overdueCount||0,data.urgentCount||0]
      }]
    }
  });
}

// =======================
// 📅 GANTT (FINAL VERSION)
// =======================
function renderGantt(data) {
  const el = document.getElementById("gantt");
  el.innerHTML = "";

  if (!data.timeline || !data.timeline.length) {
    el.innerHTML = "<p class='empty'>No timeline data</p>";
    return;
  }

  const now = new Date();

  const fmt = d => {
    if (!d || isNaN(d.getTime())) return "N/A";
    return d.toISOString().slice(5, 10);
  };

  // =====================
  // 🧠 PRIORITY SORT
  // =====================
  const sorted = [...data.timeline].sort((a, b) => {

    const getPriority = (t) => {
      if (t.status === "delayed") return 0;
      if (t.status === "at-risk") return 1;
      return 2;
    };

    const pa = getPriority(a);
    const pb = getPriority(b);

    if (pa !== pb) return pa - pb;

    const dueA = new Date(a.due || Date.now());
    const dueB = new Date(b.due || Date.now());

    return dueA - dueB;
  });

  // =====================
  // 🏷️ GROUPING HEADER
  // =====================
  let lastGroup = "";

  sorted.forEach(task => {

    // =====================
    // GROUP LABEL
    // =====================
    if (task.status !== lastGroup) {
      const label =
        task.status === "delayed" ? "🚨 Overdue (Immediate Attention)" :
        task.status === "at-risk" ? "⚠️ At Risk (Due Soon)" :
        "✅ On Track";

      el.insertAdjacentHTML("beforeend", `
        <div style="
          margin:15px 0 5px;
          font-size:13px;
          font-weight:bold;
          color:var(--muted);
        ">${label}</div>
      `);

      lastGroup = task.status;
    }

    // =====================
    // DATE SAFE
    // =====================
    const start = new Date(task.start || Date.now());
    const due = new Date(task.due || Date.now());

    const diff = Math.floor((due - now) / 86400000);

    // =====================
    // STATUS TEXT
    // =====================
    let statusText = "";
    let color = "#10b981";

    if (diff < 0) {
      statusText = `Overdue by ${Math.abs(diff)} days`;
      color = "#ef4444";
    } else if (diff <= 3) {
      statusText = `Due in ${diff} days`;
      color = "#f59e0b";
    } else {
      statusText = `On track (${diff} days left)`;
      color = "#10b981";
    }

    // =====================
    // PROGRESS
    // =====================
    let progress = task.progress ?? (
      diff < 0 ? 100 :
      diff <= 3 ? 60 : 30
    );

    // =====================
    // RENDER CARD
    // =====================
    el.insertAdjacentHTML("beforeend", `
      <div class="gantt-row" style="
        padding:10px;
        border:1px solid var(--border);
        border-radius:10px;
        margin-bottom:10px;
        background:var(--card);
      ">

        <div style="font-weight:600;">
          #${task.number} ${task.title}
        </div>

        <div style="font-size:12px; color:${color}; margin:4px 0;">
          ${statusText}
        </div>

        <div style="
          height:8px;
          background:#e5e7eb;
          border-radius:4px;
          overflow:hidden;
        ">
          <div style="
            width:${progress}%;
            background:${color};
            height:100%;
          "></div>
        </div>

        <div style="
          display:flex;
          justify-content:space-between;
          font-size:11px;
          color:gray;
          margin-top:4px;
        ">
          <div>${fmt(start)} → ${fmt(due)}</div>
          <div>${progress}%</div>
        </div>

      </div>
    `);
  });
}

// =======================
// 🧰 HELPERS
// =======================
function renderTable(id, arr, fn) {
  const el = document.getElementById(id);
  el.innerHTML = arr?.length ? arr.map(fn).join("") :
    `<tr><td colspan="3" class="empty">No data available</td></tr>`;
}

function kpi(id,val){
  document.getElementById(id).innerText = val || 0;
}

// =======================
// 🔍 FILTERS
// =======================
function initFilters(data){
  const repos=[...new Set([...data.topOverdue,...data.urgentItems].map(i=>i.repo))];
  const users=[...new Set(data.overloadedUsers.map(u=>u.user))];

  fillSelect("repoFilter",repos);
  fillSelect("userFilter",users);

  document.querySelectorAll("select").forEach(s=>{
    s.addEventListener("change",render);
  });
}

function fillSelect(id,list){
  const el=document.getElementById(id);
  el.innerHTML=`<option value="">All</option>`+
    list.map(i=>`<option>${i}</option>`).join("");
}

function applyFilters(data){
  const repo=document.getElementById("repoFilter").value;
  const user=document.getElementById("userFilter").value;

  const filter = arr => arr?.filter(i =>
    (!repo || i.repo===repo) &&
    (!user || i.user===user)
  );

  return {
    ...data,
    topOverdue: filter(data.topOverdue),
    urgentItems: filter(data.urgentItems),
    timeline: filter(data.timeline) // ✅ IMPORTANT
  };
}

// =======================
// 🌗 THEME
// =======================
function toggleTheme(){
  document.body.classList.toggle("dark");
}
