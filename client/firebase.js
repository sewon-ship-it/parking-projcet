// client/firebase.js
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
    await addDoc(col, { title, votes: 0, createdAt: serverTimestamp() });
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
        <button>투표하기</button>
      `;
      li.querySelector("button").onclick = async () => {
        await updateDoc(doc(db, "proposals", d.id), {
          votes: increment(1)
        });
      };
      ulEl.appendChild(li);
    });
  });

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

