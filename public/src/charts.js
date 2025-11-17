import { loadCSV } from "./utils.js";

// Chart 인스턴스 저장 (중복 생성 방지)
let yearChart = null;
let monthChart = null;

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
  if (ctxY) {
    // 기존 차트 파괴
    if (yearChart) yearChart.destroy();
    yearChart = new Chart(ctxY, {
      type: "bar",
      data: {
        labels: Object.keys(byYear),
        datasets: [{ label: "연도별 단속 건수", data: Object.values(byYear) }]
      },
      options: { responsive: true }
    });
  }

  const months = Object.keys(byMonth).map(Number).sort((a,b)=>a-b).map(String);
  const ctxM = document.getElementById("barMonth");
  if (ctxM) {
    // 기존 차트 파괴
    if (monthChart) monthChart.destroy();
    monthChart = new Chart(ctxM, {
      type: "bar",
      data: {
        labels: months,
        datasets: [{ label: "월별 단속 건수(전체)", data: months.map(m=>byMonth[m]) }]
      },
      options: { responsive: true }
    });
  }

  const simBtn = document.getElementById("btnSimulate");
  const sel = document.getElementById("policySelect");
  const projCtx = document.getElementById("projChart");
  const simSummary = document.getElementById("simSummary");
  const btnFromProposal = document.getElementById("btnSimulateFromProposal");
  let projChart = null;
  if (simBtn && sel && projCtx) {
    function drawWithRate(rate, labelPrefix="정책 후") {
      const base = months.map(m => byMonth[m]);
      const projected = base.map(v => Math.max(0, Math.round(v * (1 - rate))));
      const data = {
        labels: months,
        datasets: [
          { label: "정책 전", data: base, backgroundColor: "rgba(99,102,241,.5)" },
          { label: `${labelPrefix} (-${Math.round(rate*100)}%)`, data: projected, backgroundColor: "rgba(34,197,94,.5)" }
        ]
      };
      if (projChart) projChart.destroy();
      projChart = new Chart(projCtx, { type: "bar", data, options: { responsive: true } });
      if (simSummary) {
        const sum = (arr) => arr.reduce((a,b)=>a+b,0);
        const baseTotal = sum(base);
        const projTotal = sum(projected);
        const diff = baseTotal - projTotal;
        // 가장 많이 줄어드는 상위 3개월 표시
        const deltas = months.map((m,i)=>({ m, d: base[i]-projected[i] }))
                             .sort((a,b)=>b.d-a.d).slice(0,3);
        simSummary.textContent =
          `예상 총 감소: ${diff.toLocaleString()}건 (연간 ${Math.round(rate*100)}% 가정)\n`+
          `예측 총 건수: ${projTotal.toLocaleString()}건 (기준 ${baseTotal.toLocaleString()}건)\n`+
          `감소가 큰 달: ${deltas.map(x=>`${x.m}월(${x.d})`).join(", ")}`;
      }
    }
    simBtn.onclick = () => drawWithRate(Number(sel.value || 0), "정책 후");
    if (btnFromProposal) {
      btnFromProposal.onclick = () => {
        const txt = (document.getElementById("proposal")?.value || "").toLowerCase();
        // 간단 키워드 기반 가중치
        let rate = 0;
        if (txt.includes("cctv")) rate += 0.10;
        if (txt.includes("표지") || txt.includes("안내")) rate += 0.05;
        if (txt.includes("시간제") || txt.includes("등하교")) rate += 0.15;
        if (txt.includes("공영") || txt.includes("공용") || txt.includes("주차장")) rate += 0.12;
        if (txt.includes("캠페인")) rate += 0.05;
        rate = Math.min(0.30, Math.max(0.05, rate || 0.05)); // 5%~30% 범위
        drawWithRate(rate, "나의 제안 적용");
      };
    }
  }
}

export async function initCharts() {
  await renderCharts();
}

// DOMContentLoaded 시에만 실행 (중복 방지)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCharts);
} else {
  initCharts();
}

