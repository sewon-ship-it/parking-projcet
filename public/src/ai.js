import { checkKoreanRules } from "./rubric.js";

export async function requestFeedback({ problem, proposal, reason, mode }) {
  const missing = checkKoreanRules({ problem, proposal, reason });
  const resp = await fetch("/api/ai/feedback", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ problem, proposal, reason, mode })
  });
  const data = await resp.json();
  return { ...data, missing };
}

