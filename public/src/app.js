import { renderCharts } from "./charts.js";
import { requestFeedback } from "./ai.js";
import { bindProposalList } from "./firebase.js";
import { downloadCanvasPNG } from "./utils.js";
import { makeAward, bindPosterBadgeButtons } from "./poster.js";

async function init() {
  renderCharts();
  const ul = document.getElementById("proposalList");
  const titleInput = document.getElementById("myTitle");
  const submitMsg = document.getElementById("submitMsg");
  await bindProposalList(ul, titleInput, submitMsg);
  // 제안 본문을 입력하면 제목 입력칸에 자동 반영
  const proposalEl = document.getElementById("proposal");
  proposalEl.addEventListener("input", () => {
    const v = proposalEl.value.trim();
    if (v) titleInput.value = v.slice(0, 40);
  });
  // 내용 확인 퀴즈 체크
  document.getElementById("btnCheckQuiz").onclick = () => {
    const q1 = document.querySelector('input[name="q1"]:checked')?.value;
    const q2 = document.querySelector('input[name="q2"]:checked')?.value;
    document.getElementById("q1Result").textContent = (q1 === "2016") ? "정답! 잘 찾았어요." : "다시 생각해보기! 그래프의 막대를 비교해 보세요.";
    document.getElementById("q2Result").textContent = (q2 === "3") ? "정답! 잘 찾았어요." : "다시 생각해보기! 어떤 달이 더 높나요?";
  };
  document.getElementById("btnCheck").onclick = async () => {
    const problem  = document.getElementById("problem").value;
    const proposal = document.getElementById("proposal").value;
    const reason   = document.getElementById("reason").value;
    const r = await requestFeedback({ problem, proposal, reason });
    const box = document.getElementById("checkResult");
    if (r.missing?.length) {
      box.textContent = "부족한 항목: " + r.missing.join(", ");
    } else {
      box.textContent = "모든 조건 충족! 👍";
    }
    document.getElementById("aiFeedback").textContent = r.feedback || "(피드백 없음)";
    // 참고 문헌 목록
    const refList = document.getElementById("referenceList");
    refList.innerHTML = "";
    try {
      const refs = await fetch("/api/pdfs").then(r=>r.json());
      (refs||[]).forEach(name=>{
        const li = document.createElement("li");
        li.textContent = name;
        refList.appendChild(li);
      });
    } catch {}
  };
  document.getElementById("btnMakeAward").onclick = async () => {
    await makeAward(document.getElementById("awardCanvas"), document.getElementById("awardDownload"));
  };
  bindPosterBadgeButtons();
  // 예측 제출 → AI 피드백
  document.getElementById("btnSubmitPrediction").onclick = async () => {
    const rateLabel = document.getElementById("policySelect").selectedOptions[0].textContent;
    const explain = document.getElementById("predictExplain").value.trim();
    // 기존 API 재사용: 문제/제안/이유를 예측 문장으로 구성
    const problem = "우리 지역의 불법 주정차 민원을 줄이고 싶어요.";
    const proposal = `선택한 정책: ${rateLabel}`;
    const reason = explain || "정책을 적용하면 사람들이 규칙을 더 잘 지키고 혼잡이 줄 거예요.";
    const r = await requestFeedback({ problem, proposal, reason });
    document.getElementById("simFeedback").textContent = r.feedback || "(피드백 없음)";
  };
  // 원인 제출 → AI 피드백
  document.getElementById("btnCauseSubmit").onclick = async () => {
    const cause = document.getElementById("cause").value.trim();
    // 초4 친절 톤으로 검토 요청
    const problem = cause || "학교 주변에서 불법 주정차가 왜 생기는지 궁금해요.";
    const proposal = "원인을 정리해 보고 해결 아이디어의 방향을 생각해요.";
    const reason = "이렇게 정리하면 다음 단계에서 더 좋은 제안을 만들 수 있어요.";
    const r = await requestFeedback({ problem, proposal, reason, mode: "cause" });
    document.getElementById("causeFeedback").textContent = r.feedback || "(피드백 없음)";
  };
}

init();

