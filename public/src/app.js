import { renderCharts } from "./charts.js";
import { requestFeedback } from "./ai.js";
import { bindProposalList } from "./firebase.js";
import { downloadCanvasPNG } from "./utils.js";
import { makeAward, bindPosterBadgeButtons } from "./poster.js";

// 단계 관리
let currentStep = 1;
const totalSteps = 6;

function updateProgressIndicator() {
  document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
    const stepNum = index + 1;
    const circle = indicator.querySelector('.step-circle');
    const line = indicator.nextElementSibling;
    
    if (stepNum < currentStep) {
      // 완료된 단계
      circle.classList.remove('bg-gray-300', 'text-gray-600');
      circle.classList.add('bg-green-500', 'text-white');
      if (line) {
        line.classList.remove('bg-gray-200');
        line.classList.add('bg-green-500');
      }
    } else if (stepNum === currentStep) {
      // 현재 단계
      circle.classList.remove('bg-gray-300', 'text-gray-600', 'bg-green-500');
      circle.classList.add('bg-indigo-600', 'text-white');
      if (line) {
        line.classList.remove('bg-green-500');
        line.classList.add('bg-gray-200');
      }
    } else {
      // 아직 안 한 단계
      circle.classList.remove('bg-indigo-600', 'bg-green-500', 'text-white');
      circle.classList.add('bg-gray-300', 'text-gray-600');
      if (line) {
        line.classList.remove('bg-green-500');
        line.classList.add('bg-gray-200');
      }
    }
  });
}

function showStep(stepNum) {
  // 모든 단계 숨기기
  document.querySelectorAll('.step-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  
  // 현재 단계 보이기
  const stepPanel = document.getElementById(`step-${stepNum}`);
  if (stepPanel) {
    stepPanel.classList.remove('hidden');
    currentStep = stepNum;
    updateProgressIndicator();
    
    // Step 3에서 지도 초기화
    if (stepNum === 3) {
      // 지도는 map.js에서 자동으로 초기화됨
      // mapPlaceholder 숨기기
      const placeholder = document.getElementById('mapPlaceholder');
      if (placeholder) {
        placeholder.classList.add('hidden');
      }
    }
  }
}

function goToNextStep() {
  if (currentStep < totalSteps) {
    showStep(currentStep + 1);
    // 스크롤을 상단으로
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// 초기화
async function init() {
  // Step 1 표시
  showStep(1);
  
  // 차트 렌더링
  renderCharts();
  
  // Firebase 초기화
  const ul = document.getElementById("proposalList");
  const titleInput = document.getElementById("myTitle");
  const submitMsg = document.getElementById("submitMsg");
  await bindProposalList(ul, titleInput, submitMsg);
  
  // 제안 본문을 입력하면 제목 입력칸에 자동 반영
  const proposalEl = document.getElementById("proposal");
  if (proposalEl) {
    proposalEl.addEventListener("input", () => {
      const v = proposalEl.value.trim();
      if (v && titleInput) titleInput.value = v.slice(0, 40);
    });
  }
  
  // Step 1: 퀴즈 체크
  const btnCheckQuiz = document.getElementById("btnCheckQuiz");
  if (btnCheckQuiz) {
    btnCheckQuiz.onclick = () => {
      const q1 = document.querySelector('input[name="q1"]:checked')?.value;
      const q2 = document.querySelector('input[name="q2"]:checked')?.value;
      const q1Result = document.getElementById("q1Result");
      const q2Result = document.getElementById("q2Result");
      
      if (q1Result) {
        q1Result.textContent = (q1 === "2016") 
          ? "✅ 정답! 잘 찾았어요." 
          : "❌ 다시 생각해보기! 그래프의 막대를 비교해 보세요.";
        q1Result.className = (q1 === "2016") ? "text-sm mt-2 text-green-600 font-medium" : "text-sm mt-2 text-red-600";
      }
      
      if (q2Result) {
        q2Result.textContent = (q2 === "3") 
          ? "✅ 정답! 잘 찾았어요." 
          : "❌ 다시 생각해보기! 어떤 달이 더 높나요?";
        q2Result.className = (q2 === "3") ? "text-sm mt-2 text-green-600 font-medium" : "text-sm mt-2 text-red-600";
      }
      
      // 두 문제 모두 맞췄으면 다음 단계 버튼 표시
      if (q1 === "2016" && q2 === "3") {
        const btnNext = document.getElementById("btnNextToStep2");
        if (btnNext) {
          btnNext.classList.remove("hidden");
          btnNext.onclick = () => goToNextStep();
        }
      }
    };
  }
  
  // Step 2: 원인 제출
  const btnCauseSubmit = document.getElementById("btnCauseSubmit");
  if (btnCauseSubmit) {
    btnCauseSubmit.onclick = async () => {
      const cause = document.getElementById("cause")?.value.trim();
      const problem = cause || "학교 주변에서 불법 주정차가 왜 생기는지 궁금해요.";
      const proposal = "원인을 정리해 보고 해결 아이디어의 방향을 생각해요.";
      const reason = "이렇게 정리하면 다음 단계에서 더 좋은 제안을 만들 수 있어요.";
      
      const r = await requestFeedback({ problem, proposal, reason, mode: "cause" });
      const feedbackEl = document.getElementById("causeFeedback");
      if (feedbackEl) {
        feedbackEl.textContent = r.feedback || "(피드백 없음)";
      }
      
      // 피드백을 받으면 다음 단계 버튼 표시
      if (r.feedback) {
        const btnNext = document.getElementById("btnNextToStep3");
        if (btnNext) {
          btnNext.classList.remove("hidden");
          btnNext.onclick = () => goToNextStep();
        }
      }
    };
  }
  
  // Step 3: 해결 방안 제안
  const btnCheck = document.getElementById("btnCheck");
  if (btnCheck) {
    btnCheck.onclick = async () => {
      const problem = document.getElementById("problem")?.value;
      const proposal = document.getElementById("proposal")?.value;
      const reason = document.getElementById("reason")?.value;
      
      const r = await requestFeedback({ problem, proposal, reason });
      const box = document.getElementById("checkResult");
      if (box) {
        if (r.missing?.length) {
          box.textContent = "❌ 부족한 항목: " + r.missing.join(", ");
          box.className = "mt-4 p-4 bg-red-50 rounded-lg border border-red-200 min-h-[40px] text-sm text-red-700";
        } else {
          box.textContent = "✅ 모든 조건 충족! 👍";
          box.className = "mt-4 p-4 bg-green-50 rounded-lg border border-green-200 min-h-[40px] text-sm text-green-700";
        }
      }
      
      const aiFeedback = document.getElementById("aiFeedback");
      if (aiFeedback) {
        aiFeedback.textContent = r.feedback || "(피드백 없음)";
      }
      
      // 참고 문헌 목록
      const refList = document.getElementById("referenceList");
      if (refList) {
        refList.innerHTML = "";
        try {
          const refs = await fetch("/api/pdfs").then(r => r.json());
          (refs || []).forEach(name => {
            const li = document.createElement("li");
            li.textContent = name;
            li.className = "p-2 bg-white rounded border border-blue-200 mb-1";
            refList.appendChild(li);
          });
        } catch {}
      }
      
      // 조건을 모두 충족하면 다음 단계 버튼 표시
      if (!r.missing?.length && r.feedback) {
        const btnNext = document.getElementById("btnNextToStep4");
        if (btnNext) {
          btnNext.classList.remove("hidden");
          btnNext.onclick = () => goToNextStep();
        }
      }
    };
  }
  
  // Step 4: 제안 등록은 Firebase에서 처리됨
  
  // Step 5: 임명장 만들기
  const btnMakeAward = document.getElementById("btnMakeAward");
  if (btnMakeAward) {
    btnMakeAward.onclick = async () => {
      await makeAward(document.getElementById("awardCanvas"), document.getElementById("awardDownload"));
    };
  }
  
  bindPosterBadgeButtons();
  
  // Step 6: 예측 제출 → AI 피드백
  const btnSubmitPrediction = document.getElementById("btnSubmitPrediction");
  if (btnSubmitPrediction) {
    btnSubmitPrediction.onclick = async () => {
      const rateLabel = document.getElementById("policySelect")?.selectedOptions[0]?.textContent;
      const explain = document.getElementById("predictExplain")?.value.trim();
      const problem = "우리 지역의 불법 주정차 민원을 줄이고 싶어요.";
      const proposal = `선택한 정책: ${rateLabel}`;
      const reason = explain || "정책을 적용하면 사람들이 규칙을 더 잘 지키고 혼잡이 줄 거예요.";
      
      const r = await requestFeedback({ problem, proposal, reason });
      const simFeedback = document.getElementById("simFeedback");
      if (simFeedback) {
        simFeedback.textContent = r.feedback || "(피드백 없음)";
      }
    };
  }
  
  // 나의 제안으로 예측
  const btnSimulateFromProposal = document.getElementById("btnSimulateFromProposal");
  if (btnSimulateFromProposal) {
    btnSimulateFromProposal.onclick = () => {
      // charts.js에서 처리됨
    };
  }
}

init();
