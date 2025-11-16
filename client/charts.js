import { loadCSV } from "./utils.js";

export async function renderCharts() {
  const rows = await loadCSV("/data/illegal_parking.csv");
  const byYear = {};
  const byMonth = {};

  for (const r of rows) {
    const y = String(r.year || r.연도).trim();
    const m = String(r.month || r.월).trim();
    const c = Number(r.count || r.건수 || 0);
    if (!y || !m || !isFinite(c)) continue;
    byYear[y] = (byYear[y] || 0) + c;
    byMonth[m] = (byMonth[m] || 0) + c;
  }

  const ctxY = document.getElementById("barYear");
  new Chart(ctxY, {
    type: "bar",
    data: {
      labels: Object.keys(byYear),
      datasets: [{ label: "연도별 단속 건수", data: Object.values(byYear) }]
    },
    options: { responsive: true }
  });

  const months = Object.keys(byMonth).map(Number).sort((a,b)=>a-b).map(String);
  const ctxM = document.getElementById("barMonth");
  new Chart(ctxM, {
    type: "bar",
    data: {
      labels: months,
      datasets: [{ label: "월별 단속 건수(전체)", data: months.map(m=>byMonth[m]) }]
    },
    options: { responsive: true }
  });

  const simBtn = document.getElementById("btnSimulate");
  const sel = document.getElementById("policySelect");
  const projCtx = document.getElementById("projChart");
  let projChart = null;
  if (simBtn && sel && projCtx) {
    simBtn.onclick = () => {
      const rate = Number(sel.value || 0);
      const base = months.map(m => byMonth[m]);
      const projected = base.map(v => Math.max(0, Math.round(v * (1 - rate))));
      const data = {
        labels: months,
        datasets: [
          { label: "정책 전", data: base, backgroundColor: "rgba(99,102,241,.5)" },
          { label: `정책 후 (-${Math.round(rate*100)}%)`, data: projected, backgroundColor: "rgba(34,197,94,.5)" }
        ]
      };
      if (projChart) projChart.destroy();
      projChart = new Chart(projCtx, { type: "bar", data, options: { responsive: true } });
    };
  }
}

export async function initCharts() {
  await renderCharts();
}

initCharts();

