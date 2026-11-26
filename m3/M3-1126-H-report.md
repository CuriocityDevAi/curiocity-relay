OK https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/274

V4-2 원인: `tabBarActiveTintColor: TOKEN_INK` (#0E1B18)이 어두운 탭바 배경 위에서 "검정 위 검정" — 11-09 규칙 적용해 `tabBarStyle.backgroundColor=TOKEN_SELECTED(차콜)` + `activeTintColor=TOKEN_ON_SELECTED(흰)`으로 수정.
V4-3 원인: `className="object-cover"` / NativeWind `object-contain` 클래스가 부모 div에만 적용되어 실제 img에 무효 — `resizeMode="contain"` prop 직접 사용 (RNW: `background-size: contain`으로 올바르게 렌더링).

Playwright 4/4 passed — Sell/Orders/Settings 선택 라벨 색≠배경색 · 상품시트 이미지 background-size=contain 어설션. 스크린샷: e2e/screenshots/M3-1126-H-*.png (10장).
