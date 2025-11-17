// src/firebase.js
import { getConfig } from "./utils.js";

let app, db;

export async function initFirebase() {
  const cfg = await getConfig();
  if (!cfg.firebase || !cfg.firebase.projectId || cfg.firebase.projectId.trim() === "") {
    console.warn("⚠️ Firebase 설정이 없습니다. 투표 기능을 사용하려면 .env 파일에 Firebase 설정을 추가하세요.");
    console.warn("firebaseConfig =", cfg.firebase);
    // Firebase가 없어도 앱이 동작하도록 더미 객체 반환
    return null;
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
  const firebase = await initFirebase();
  if (!firebase) {
    // Firebase가 없을 때 UI에 메시지 표시
    if (ulEl) ulEl.innerHTML = "<li style='color: #666;'>⚠️ Firebase 설정이 필요합니다. server/.env 파일에 Firebase 설정을 추가하세요.</li>";
    if (submitMsgEl) submitMsgEl.textContent = "Firebase 설정이 없어 투표 기능을 사용할 수 없습니다.";
    return { db: null };
  }
  const { db, collection, addDoc, onSnapshot, updateDoc, doc, increment, serverTimestamp, query, orderBy } = firebase;

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
  const firebase = await initFirebase();
  if (!firebase) return { title: "Firebase 설정 필요" };
  
  const { db, collection, query, orderBy } = firebase;
  const { getDocs, limit } = await import("https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js");

  const q = query(collection(db, "proposals"), orderBy("votes", "desc"), limit(1));
  const snap = await getDocs(q);
  let top = null;
  snap.forEach((d) => (top = { id: d.id, ...d.data() }));
  return top || { title: "제안 없음" };
}

