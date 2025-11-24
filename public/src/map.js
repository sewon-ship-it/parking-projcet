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
    if (!key || key.trim() === "") {
      console.warn("⚠️ Kakao API 키가 없습니다. 지도 기능을 사용하려면 server/.env 파일에 KAKAO_JS_KEY를 추가하세요.");
      const container = document.getElementById("map");
      if (container) {
        container.innerHTML = "<div style='padding:20px; text-align:center; color:#666;'>⚠️ Kakao API 키가 필요합니다.<br>server/.env 파일에 KAKAO_JS_KEY를 추가하세요.</div>";
      }
      return;
    }
    await loadKakaoSDK(key);
    if (!window.kakao || !window.kakao.maps) return;
    window.kakao.maps.load(async () => {
      const container = document.getElementById("map");
      if (!container) return;
      const options = {
        center: new kakao.maps.LatLng(37.504, 126.958),
        level: 6
      };
      const map = new kakao.maps.Map(container, options);
      // 우리학교(중앙대학교사범대학부속초, 서달로135) 강조
      try {
        const schoolPos = new kakao.maps.LatLng(37.5038, 126.9583);
        const schoolMarker = new kakao.maps.Marker({ position: schoolPos, map });
        const sw = new kakao.maps.InfoWindow({ content: `<div style="padding:6px;">🏫 우리학교</div>` });
        sw.open(map, schoolMarker);
        map.setCenter(schoolPos);
      } catch {}
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
      // 설치 위치 찍기 모드
      const chk = document.getElementById("enableSuggest");
      const picked = document.getElementById("pickedPos");
      let suggestMarker = null;
      if (chk && picked) {
        kakao.maps.event.addListener(map, "click", (mouseEvent) => {
          if (!chk.checked) return;
          const latlng = mouseEvent.latLng;
          if (suggestMarker) suggestMarker.setMap(null);
          suggestMarker = new kakao.maps.Marker({ position: latlng, map });
          picked.textContent = `${latlng.getLat().toFixed(5)}, ${latlng.getLng().toFixed(5)}`;
        });
      }
    });
  } catch (e) {
    console.error("❌ 지도 초기화 실패:", e);
  }
}

// DOMContentLoaded 시에만 실행 (중복 방지)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadKakaoAndInit);
} else {
  loadKakaoAndInit();
}

