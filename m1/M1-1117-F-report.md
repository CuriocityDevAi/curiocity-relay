# M1-1117-F — 시작 화면 영수증 인쇄 애니메이션

VERDICT: 완료. Playwright 4/4 통과(기존 2 + splash 2). PR #162 feat/m2-1116-ak에 추가 커밋.

## 기술 선택

- `react-native-reanimated` useSharedValue + withTiming + withDelay. 새 라이브러리 없음.
- `react-native-svg` Svg/Path/Polygon으로 영수증 + M 렌더.
- `scheduleOnRN` (react-native-worklets) — reanimated 콜백에서 setState 호출 (runOnJS 대신, 기존 codebase 패턴 일치).
- React Strict Mode 이중 마운트 버그: module-level `_coldStartHandled` 플래그 제거 → `useState(true)` 항상 오버레이 노출.
- `pointerEvents="none"` — zIndex:9999 오버레이가 기존 E2E 클릭 테스트 간섭 차단.

## PR 본문 3줄 요약

앱 켜면 노란 영수증이 프린터 막대 아래로 부드럽게 내려오고 → MEROS 글자가 살짝 떠오르며 등장 → 로그인/첫 화면으로 페이드아웃.
cubic-bezier(.22,.61,.36,1) 1.5s 슬라이드 + t=1.55s 0.6s ease-out 텍스트. 총 ~2.15s.
Reduce Motion: 최종 상태 즉시 표시. 새 라이브러리 없음.

## TS 에러 델타

0 (변경 없음)
