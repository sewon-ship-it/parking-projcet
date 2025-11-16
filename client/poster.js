import { downloadCanvasPNG } from "./utils.js";
import { getTopProposal } from "./firebase.js";

export function drawAward(canvas, winnerTitle) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fdf8e1";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 12;
  ctx.strokeRect(20,20,canvas.width-40,canvas.height-40);
  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 48px Pretendard, system-ui";
  ctx.fillText("임 명 장", 360, 120);
  ctx.font = "28px Pretendard, system-ui";
  const lines = [
    "귀하는 우리 지역 문제 해결을 위한 뛰어난 제안을 하여",
    "학생 투표 결과 가장 높은 지지를 받았기에,",
    "가상의 동작구청장에 임명합니다.",
    "",
    `수상 제안: ${winnerTitle}`
  ];
  let y = 200;
  for (const l of lines) { ctx.fillText(l, 100, y); y += 48; }
  ctx.beginPath(); ctx.arc(760, 470, 60, 0, Math.PI*2); ctx.closePath();
  ctx.fillStyle = "#ef4444"; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 22px system-ui";
  ctx.fillText("동작구", 730, 465);
  ctx.fillText("교육청", 730, 495);
}

export async function makeAward(canvas, anchor) {
  const top = await getTopProposal();
  const title = top?.title || "상위 제안 없음";
  drawAward(canvas, title);
  downloadCanvasPNG(canvas, anchor);
}

export function drawPoster(canvas, headline, bullets) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ecfeff"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0,0,canvas.width,120);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px system-ui";
  ctx.fillText("공고문", 40, 80);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 42px system-ui";
  ctx.fillText(headline, 40, 200);
  ctx.font = "28px system-ui";
  let y = 260;
  for (const b of bullets) { ctx.fillText("• " + b, 60, y); y += 44; }
  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(0, canvas.height-120, canvas.width, 120);
  ctx.fillStyle = "#fff";
  ctx.font = "24px system-ui";
  ctx.fillText("문의: 동작구 민원콜센터 120 | 안전주차 캠페인 함께해요", 40, canvas.height-70);
}

export function makeBadge(canvas, type) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  const label = (type==="creativity")?"창의성 1등": (type==="feasible")?"실현가능성 1등":"효과성 1등";
  const color = (type==="creativity")?"#a855f7": (type==="feasible")?"#22c55e":"#f59e0b";
  ctx.beginPath(); ctx.arc(250, 250, 200, 0, Math.PI*2); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(label, 250, 255);
}

export function bindPosterBadgeButtons() {
  document.getElementById("btnMakePoster").onclick = async () => {
    const canvas = document.getElementById("posterCanvas");
    const top = await getTopProposal();
    const headline = top?.title ? `[공고] ${top.title}` : "동작구 불법주정차 개선 공고";
    const bullets = [
      "학교 주변 시간제 주차구역 시범 운영",
      "CCTV 및 안내 표지 정비·확대",
      "주민 참여 캠페인과 민원 신속 대응"
    ];
    drawPoster(canvas, headline, bullets);
    downloadCanvasPNG(canvas, document.getElementById("posterDownload"));
  };
  document.querySelectorAll(".badge-actions button").forEach(btn=>{
    btn.onclick = () => {
      const type = btn.dataset.type;
      const canvas = document.getElementById("badgeCanvas");
      makeBadge(canvas, type);
      downloadCanvasPNG(canvas, document.getElementById("badgeDownload"));
    };
  });
}

