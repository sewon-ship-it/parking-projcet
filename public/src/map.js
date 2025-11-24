import { getConfig, loadCSV } from "./utils.js";

async function loadKakaoSDK(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      console.log("✅ Kakao SDK 이미 로드됨");
      return resolve();
    }
    
    // API 키 유효성 검사
    if (!apiKey || apiKey.trim() === "") {
      return reject(new Error("❌ Kakao API 키가 비어있습니다"));
    }
    
    console.log("📥 Kakao SDK 스크립트 로드 시작...");
    const script = document.createElement("script");
    const url = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&autoload=false`;
    script.src = url;
    
    script.onload = () => {
      console.log("✅ Kakao SDK 스크립트 로드 완료");
      // 스크립트가 로드되어도 window.kakao가 즉시 생성되지 않을 수 있음
      setTimeout(() => {
        if (window.kakao && window.kakao.maps) {
          resolve();
        } else {
          reject(new Error("❌ Kakao SDK 스크립트는 로드되었지만 window.kakao 객체가 생성되지 않았습니다. API 키를 확인해주세요."));
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error("❌ Kakao SDK 스크립트 로드 실패:", error);
      console.error("URL:", url.substring(0, 50) + "...");
      reject(new Error("❌ Kakao SDK 로드 실패. API 키가 유효한지 확인해주세요."));
    };
    
    document.head.appendChild(script);
  });
}

async function loadKakaoAndInit() {
  try {
    console.log("🗺️ 지도 초기화 시작...");
    const cfg = await getConfig();
    console.log("📋 Config 받음:", cfg);
    const key = cfg.kakaoJsKey;
    if (!key || key.trim() === "") {
      console.error("❌ Kakao API 키가 없습니다!");
      console.error("Netlify 환경 변수에 KAKAO_JS_KEY를 설정해주세요.");
      const container = document.getElementById("map");
      if (container) {
        container.innerHTML = "<div style='padding:20px; text-align:center; color:#d32f2f; background:#ffebee; border-radius:8px;'>⚠️ Kakao API 키가 필요합니다.<br><br>Netlify 대시보드 → Site settings → Environment variables에서<br><b>KAKAO_JS_KEY</b>를 추가해주세요.</div>";
      }
      return;
    }
    console.log("✅ Kakao API 키 확인됨 (길이:", key.length, "), SDK 로드 중...");
    try {
      await loadKakaoSDK(key);
    } catch (sdkError) {
      console.error("❌ Kakao SDK 로드 에러:", sdkError.message);
      const container = document.getElementById("map");
      if (container) {
        container.innerHTML = `<div style='padding:20px; text-align:center; color:#d32f2f; background:#ffebee; border-radius:8px;'>
          <strong>❌ Kakao 지도 SDK 로드 실패</strong><br><br>
          ${sdkError.message}<br><br>
          <small>Netlify 환경 변수에서 KAKAO_JS_KEY가 올바르게 설정되었는지 확인해주세요.</small>
        </div>`;
      }
      return;
    }
    
    if (!window.kakao || !window.kakao.maps) {
      console.error("❌ Kakao SDK 로드 후에도 window.kakao가 없습니다");
      const container = document.getElementById("map");
      if (container) {
        container.innerHTML = "<div style='padding:20px; text-align:center; color:#d32f2f;'>❌ Kakao 지도 SDK를 초기화할 수 없습니다.</div>";
      }
      return;
    }
    console.log("✅ Kakao SDK 로드 완료, 지도 생성 중...");
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
      console.log("✅ 지도 생성 완료, CCTV 데이터 로드 중...");
      const cctvRows = await loadCSV("./data/cctv.csv");
      console.log(`📍 CCTV 마커 ${cctvRows.length}개 추가 중...`);
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
      console.log("✅ 모든 CCTV 마커 추가 완료!");
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

// Step 3가 표시될 때 지도 초기화
let mapInitialized = false;

function initMapWhenStep3Visible() {
  const step3 = document.getElementById("step-3");
  const mapContainer = document.getElementById("map");
  
  if (step3 && !step3.classList.contains("hidden") && mapContainer && !mapInitialized) {
    loadKakaoAndInit();
    mapInitialized = true;
  }
}

// MutationObserver로 Step 3 표시 감지
const observer = new MutationObserver(() => {
  initMapWhenStep3Visible();
});

// 초기 체크
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const step3 = document.getElementById("step-3");
    if (step3) {
      observer.observe(step3, { attributes: true, attributeFilter: ['class'] });
      initMapWhenStep3Visible();
    }
  });
} else {
  const step3 = document.getElementById("step-3");
  if (step3) {
    observer.observe(step3, { attributes: true, attributeFilter: ['class'] });
    initMapWhenStep3Visible();
  }
}

