import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { loadAllPdfs, findSnippets } from "./pdf-indexer.js";
import dotenv from "dotenv";

let ChatOpenAI = null;
try {
  const mod = await import("@langchain/openai");
  ChatOpenAI = mod.ChatOpenAI;
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일을 명시적으로 server/.env에서 로드
const envPath = path.join(__dirname, ".env");
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.warn("⚠️ .env 파일 로드 실패:", envResult.error.message);
  console.warn("📁 예상 경로:", envPath);
} else {
  console.log("✅ .env 파일 로드 성공:", envPath);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const SERVER_PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const KAKAO_JS_KEY = process.env.KAKAO_JS_KEY;

const PDF_DIR = path.join(__dirname, "data");
let pdfStore = [];
(async () => {
  pdfStore = await loadAllPdfs(PDF_DIR);
  console.log("📄 PDF indexed:", pdfStore.map(d => d.fname));
})();

// Static: serve public and src from project root
app.use("/", express.static(path.join(__dirname, "..", "public")));
app.use("/src", express.static(path.join(__dirname, "..", "src")));

// Client config for keys
app.get("/config", (req, res) => {
  try {
    const config = {
      kakaoJsKey: KAKAO_JS_KEY || "",
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || "",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.FIREBASE_APP_ID || "",
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || ""
      }
    };
    console.log("📤 /config 응답:", {
      hasKakaoKey: !!config.kakaoJsKey,
      hasFirebaseProjectId: !!config.firebase.projectId
    });
    res.json(config);
  } catch (error) {
    console.error("❌ /config 오류:", error);
    console.error("❌ 오류 스택:", error.stack);
    res.status(500).json({
      error: "설정 로드 실패",
      message: error.message,
      kakaoJsKey: "",
      firebase: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
        measurementId: ""
      }
    });
  }
});

// PDF 파일 목록 제공 (참고 문헌)
app.get("/api/pdfs", (req, res) => {
  try {
    const names = (pdfStore || []).map(d => d.fname);
    res.json(names);
  } catch {
    res.json([]);
  }
});

function checkRules({ problem, proposal, reason }) {
  const miss = [];
  if (!problem || problem.trim().length < 10) miss.push("문제상황(10자+)");
  if (!proposal || proposal.trim().length < 10) miss.push("제안하는 내용(10자+)");
  if (!reason || reason.trim().length < 10) miss.push("제안하는 이유(10자+)");
  return miss;
}

app.post("/api/ai/feedback", async (req, res) => {
  try {
    const { problem, proposal, reason, mode } = req.body ?? {};
    const missing = checkRules({ problem, proposal, reason });

    const query = `${problem} ${proposal} ${reason} 불법주정차 주차 단속 CCTV 공고 안내 민원`;
    const snippets = findSnippets(pdfStore, query, 3);

    const system =
      (mode === "cause")
        ? `너는 초등 4학년 사회 수업의 피드백 교사야.
학생의 '문제의 원인' 분석만 확인해 주고, 해결방안 요구는 하지 마.
원인 판단이 구체적인지, 근거가 있는지, 데이터(그래프/지도)를 어떻게 보면 좋은지 쉬운 말로 3~5문장으로 조언해줘.`
        : `너는 초등 4학년 과제 피드백 교사야.
다음 학생 제안이 '문제상황/제안하는 내용/제안하는 이유' 조건을 충족했는지 체크하고,
PDF 스니펫을 참고해 내용적 보완점을 제시해줘. 불필요한 어려운 용어는 피하고, 4~6문장으로 짧게.`;

    const user = `학생 입력:
[문제상황] ${problem}
[제안내용] ${proposal}
[이유] ${reason}

참고 스니펫:
${snippets.map((s, i) => `(${i + 1}) ${s.text}\n<${s.fname}>`).join("\n\n")}

부족한 조건: ${missing.length ? missing.join(", ") : "없음"} 
충족/미충족 여부 + 간단한 개선 팁을 포함.`;

    let aiText = "";

    if (OPENAI_API_KEY) {
      if (ChatOpenAI) {
        const llm = new ChatOpenAI({
          apiKey: OPENAI_API_KEY,
          model: "gpt-4o-mini",
          temperature: 0.4
        });
        const messages = [
          { role: "system", content: system },
          { role: "user", content: user }
        ];
        const result = await llm.invoke(messages);
        aiText = result?.content ?? "";
      } else {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.4,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user }
            ]
          })
        });
        const data = await resp.json();
        aiText = data?.choices?.[0]?.message?.content ?? "";
      }
    } else {
      aiText = "❌ 서버에 OPENAI_API_KEY가 설정되지 않았어요. .env 파일을 확인하세요.";
    }

    res.json({ ok: true, missing, snippets, feedback: aiText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "AI feedback failed." });
  }
});

app.listen(SERVER_PORT, () =>
  console.log(`✅ Server running on port ${SERVER_PORT}`)
);