export async function getConfig() {
  // 먼저 /config를 시도 (rewrite 규칙이 있으면 작동)
  let res = await fetch("/config").catch(() => null);
  
  // /config가 실패하면 직접 Netlify Function 호출
  if (!res || !res.ok) {
    console.log("⚠️ /config 실패, /.netlify/functions/config 시도 중...");
    res = await fetch("/.netlify/functions/config").catch(() => null);
  }
  
  if (res && res.ok) {
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const config = await res.json();
        console.log("✅ Config 로드 성공:", {
          hasKakaoKey: !!config.kakaoJsKey,
          hasFirebase: !!config.firebase?.projectId
        });
        return config;
      }
    } catch (error) {
      console.error("❌ Config JSON 파싱 실패:", error);
    }
  }
  
  // 모든 시도 실패 시 기본값 반환
  console.warn("⚠️ Config 로드 실패, 기본값 사용");
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

