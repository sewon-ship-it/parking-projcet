export async function getConfig() {
  try {
    const res = await fetch("/config");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`Expected JSON but got ${contentType}`);
    }
    return await res.json();
  } catch (error) {
    console.error("❌ getConfig 실패:", error);
    // Express 서버가 실행되지 않은 경우 기본값 반환
    return {
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
    };
  }
}

export async function loadCSV(url) {
  const text = await fetch(url).then(r=>r.text());
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data)
    });
  });
}

export function groupBy(arr, key) {
  return arr.reduce((acc, row) => {
    const k = row[key];
    acc[k] = acc[k] || [];
    acc[k].push(row);
    return acc;
  }, {});
}

export function downloadCanvasPNG(canvas, anchorEl) {
  anchorEl.href = canvas.toDataURL("image/png");
}

