import { getConfig, loadCSV } from "./utils.js";

async function loadKakaoSDK(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) return resolve();
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    script.onload = resolve;
    script.onerror = () => reject(new Error("❌ Kakao SDK 로드 실패"));
    document.head.appendChild(script);
  });
}

async function loadKakaoAndInit() {
  try {
    const cfg = await getConfig();
    const key = cfg.kakaoJsKey;
    await loadKakaoSDK(key);
    if (!window.kakao || !window.kakao.maps) return;
    window.kakao.maps.load(async () => {
      const container = document.getElementById("map");
      if (!container) return;
      const options = {
        center: new kakao.maps.LatLng(37.496, 126.953),
        level: 6
      };
      const map = new kakao.maps.Map(container, options);
      const cctvRows = await loadCSV("./data/cctv.csv");
      cctvRows.forEach((r) => {
        const lat = Number(r.lat || r.위도);
        const lng = Number(r.lng || r.경도);
        if (!isFinite(lat) || !isFinite(lng)) return;
        const pos = new kakao.maps.LatLng(lat, lng);
        const marker = new kakao.maps.Marker({ position: pos, map });
        const infowindow = new kakao.maps.InfoWindow({
          content: `<div style="padding:6px;">📷 CCTV</div>`
        });
        kakao.maps.event.addListener(marker, "mouseover", () => infowindow.open(map, marker));
        kakao.maps.event.addListener(marker, "mouseout", () => infowindow.close());
      });
    });
  } catch (e) {
    console.error("❌ 지도 초기화 실패:", e);
  }
}

loadKakaoAndInit();

