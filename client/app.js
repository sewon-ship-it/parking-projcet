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
    const list = document.getElementById("snippetList");
    list.innerHTML = "";
    (r.snippets||[]).forEach(s=>{
      const li = document.createElement("li");
      li.textContent = `${s.text.slice(0,120)}...  <${s.fname}>`;
      list.appendChild(li);
    });
  };
  document.getElementById("btnMakeAward").onclick = async () => {
    await makeAward(document.getElementById("awardCanvas"), document.getElementById("awardDownload"));
  };
  bindPosterBadgeButtons();
}

init();

