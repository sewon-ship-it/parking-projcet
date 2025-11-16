export function checkKoreanRules({ problem, proposal, reason }) {
  const miss = [];
  if (!problem || problem.trim().length < 10)  miss.push("문제상황(10자+)");
  if (!proposal || proposal.trim().length < 10) miss.push("제안하는 내용(10자+)");
  if (!reason || reason.trim().length < 10)    miss.push("제안하는 이유(10자+)");
  return miss;
}

