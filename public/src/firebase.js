// src/firebase.js
import { getConfig } from "./utils.js";

let app, db;

export async function initFirebase() {
  const cfg = await getConfig();
  if (!cfg.firebase || !cfg.firebase.projectId) {
    console.error("[❌ Firebase 오류] firebaseConfig 에 projectId 가 없습니다.");
    console.error("firebaseConfig =", cfg.firebase);
    throw new Error("Firebase 설정이 올바르지 않습니다. (.env 또는 config.json 확인)");
  }

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js");
  const {
    getFirestore, collection, addDoc, onSnapshot,
    updateDoc, doc, increment, serverTimestamp,
    query, orderBy
  } = await import("https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js");

  if (!app) {
    app = initializeApp(cfg.firebase);
    db = getFirestore(app);
    console.log("✅ Firebase 초기화 완료:", cfg.firebase.projectId);
  }

  return {
    db, collection, addDoc, onSnapshot, updateDoc, doc,
    increment, serverTimestamp, query, orderBy
  };
}

export async function bindProposalList(ulEl, myTitleInput, submitMsgEl) {
  const { db, collection, addDoc, onSnapshot, updateDoc, doc, increment, serverTimestamp, query, orderBy } =
    await initFirebase();

  const col = collection(db, "proposals");
  const q = query(col, orderBy("votes", "desc"));

  document.getElementById("btnSubmitProposal").onclick = async () => {
    const title = myTitleInput.value.trim();
    if (!title) {
      submitMsgEl.textContent = "제목을 입력해주세요.";
      return;
    }
    await addDoc(col, { title, votes: 0, creativity: 0, feasible: 0, impact: 0, createdAt: serverTimestamp() });
    submitMsgEl.textContent = "제안이 등록되었어요!";
    myTitleInput.value = "";
  };

  onSnapshot(q, (snap) => {
    ulEl.innerHTML = "";
    snap.forEach((d) => {
      const item = d.data();
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="row">
          <b>${item.title}</b>
          <span>득표: ${item.votes || 0}</span>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn-main">종합 투표</button>
          <button class="btn-mini" data-type="creativity">창의성+1 (${item.creativity||0})</button>
          <button class="btn-mini" data-type="feasible">실현가능성+1 (${item.feasible||0})</button>
          <button class="btn-mini" data-type="impact">효과성+1 (${item.impact||0})</button>
        </div>
      `;
      li.querySelector(".btn-main").onclick = async () => {
        await updateDoc(doc(db, "proposals", d.id), {
          votes: increment(1)
        });
      };
      li.querySelectorAll(".btn-mini").forEach(btn => {
        btn.onclick = async () => {
          const t = btn.dataset.type;
          await updateDoc(doc(db, "proposals", d.id), { [t]: increment(1) });
        };
      });
      ulEl.appendChild(li);
    });
  });

  // 카테고리별 1등 표시
  const winners = { creativity: "winCreativity", feasible: "winFeasible", impact: "winImpact" };
  const { limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js");
  for (const [field, elId] of Object.entries(winners)) {
    const topQ = query(col, orderBy(field, "desc"), limit(1));
    onSnapshot(topQ, (snap) => {
      let top = "-";
      snap.forEach((d) => { top = d.data()?.title || "-"; });
      const el = document.getElementById(elId);
      if (el) el.textContent = top;
    });
  }

  return { db };
}

export async function getTopProposal() {
  const { db, collection, query, orderBy } = await initFirebase();
  const { getDocs, limit } = await import("https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js");

  const q = query(collection(db, "proposals"), orderBy("votes", "desc"), limit(1));
  const snap = await getDocs(q);
  let top = null;
  snap.forEach((d) => (top = { id: d.id, ...d.data() }));
  return top;
}

