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
    `<tr>
      <td><a href="${i.url}" target="_blank">#${i.number}</a></td>
      <td>${i.title}</td>
      <td>${i.daysOverdue}</td>
    </tr>`);

  renderTable("urgent", data.urgentItems, i =>
    `<tr>
      <td><a href="${i.url}" target="_blank">#${i.number}</a></td>
      <td>${i.title}</td>
      <td>${i.daysLeft}</td>
    </tr>`);

  renderTable("users", data.overloadedUsers, u =>
    `<tr><td>${u.user}</td><td>${u.overdue}</td><td>${u.urgent}</td></tr>`);

  renderTable("predictions", data.predictions, i =>
    `<tr>
      <td><a href="${i.url}" target="_blank">#${i.number}</a></td>
      <td>${i.title}</td>
      <td><span class="badge badge-danger">High</span></td>
    </tr>`);

  renderCritical(data);   // ⭐ NEW
  renderGantt(data);
}

// =======================
// 🔥 CRITICAL PANEL
// =======================
function renderCritical(data) {
  const el = document.getElementById("critical");
  if (!el) return;

  const tasks = [...(data.timeline || [])];

  // 🧠 smart ranking
  const priority = t => {
    if (t.status === "delayed") return 0;
    if (t.status === "at-risk") return 1;
    return 2;
  };

  const sorted = tasks.sort((a,b) => {
    const p = priority(a) - priority(b);
    if (p !== 0) return p;

    const da = new Date(a.due || a.dueDate || Date.now());
    const db = new Date(b.due || b.dueDate || Date.now());
    return da - db;
  });

  const top = sorted.slice(0,3);

  if (!top.length) {
    el.innerHTML = `<div class="empty">No critical tasks</div>`;
    return;
  }

  el.innerHTML = top.map(t => {
    const delay = predictDelay(t);

    let badge = "badge-ok";
    if (t.status === "delayed") badge = "badge-danger";
    else if (t.status === "at-risk") badge = "badge-warn";

    return `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;">
          <a href="${t.url}" target="_blank">
            #${t.number} ${t.title}
          </a>
          <span class="badge ${badge}">${t.status}</span>
        </div>

        <div style="font-size:12px;color:var(--muted);margin-top:4px;">
          ⏱ Predicted delay: <b>${delay} days</b>
        </div>
      </div>
    `;
  }).join("");
}

// =======================
// 🤖 AI DELAY ESTIMATION
// =======================
function predictDelay(t) {
  const now = new Date();

  const due = new Date(t.due || t.dueDate || now);
  const start = new Date(t.start || t.startDate || now);

  if (isNaN(due)) return 0;

  const diff = Math.floor((now - due)/86400000);

  // already overdue
  if (diff > 0) return diff;

  // estimate based on progress
  const total = (due - start)/86400000;
  const passed = (now - start)/86400000;

  if (total <= 0) return 0;

  const expectedProgress = (passed / total) * 100;
  const gap = expectedProgress - (t.progress || 0);

  if (gap <= 0) return 0;

  return Math.ceil(gap / 10); // simple model
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
// 📅 GANTT (SORTED)
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

  // 🔥 SORTED
  const sorted = [...data.timeline].sort((a, b) => {
    const priority = t =>
      t.status === "delayed" ? 0 :
      t.status === "at-risk" ? 1 : 2;

    const p = priority(a) - priority(b);
    if (p !== 0) return p;

    const da = new Date(a.due || a.dueDate || now);
    const db = new Date(b.due || b.dueDate || now);
    return da - db;
  });

  sorted.forEach(task => {

    const start = new Date(task.start || task.startDate || now);
    const due = new Date(task.due || task.dueDate || now);

    let cls = "ok";
    if (task.status === "delayed") cls = "delayed";
    else if (task.status === "at-risk") cls = "risk";

    el.insertAdjacentHTML("beforeend", `
      <div class="gantt-row">

        <div style="display:flex;justify-content:space-between;">
          <a href="${task.url}" target="_blank">
            #${task.number} ${task.title}
          </a>
          <div>${fmt(start)} → ${fmt(due)}</div>
        </div>

        <div class="gantt-bar">

          <div style="
            position:absolute;
            width:${task.plannedProgress || 100}%;
            height:100%;
            background:#e5e7eb;
            opacity:.5;
          "></div>

          <div class="gantt-fill ${cls}" style="
            width:${task.progress || 0}%;
            position:absolute;
          "></div>

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
    timeline: filter(data.timeline)
  };
}

// =======================
// 🌗 THEME
// =======================
function toggleTheme(){
  document.body.classList.toggle("dark");
}
