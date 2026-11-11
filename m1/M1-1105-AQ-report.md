# M1-1105-AQ Report

## 채택안 대사표

**Q: Medusa 2.17 Admin 에 Customize Layout 왼쪽 공식 확장 지점?**

없음. `INJECTION_ZONES`(`@medusajs/admin-shared@2.17.2`) 에 `"topbar"` 있으나, 이는
`LayoutComposer(widgetsZonePrefix="topbar")` 안에 렌더 — DOM 순서:
`CustomizerMenu → LayoutCustomizerSlot → [LayoutComposer: topbar 위젯 + Notifications]`.
topbar 존 위젯은 Customize Layout **오른쪽**에 위치.

**채택안: `zone: "topbar"` + DOM portal (insertBefore + createPortal)**

1. 위젯 topbar 존 마운트 → 숨겨진 앵커 `<div ref=wrapperRef>` 렌더.
2. `useLayoutEffect`: 앵커에서 위로 올라 `justify-end` flex(topbar 오른쪽) 탐색 →
   `insertBefore(div, firstChild)` 로 `[data-meros-pin-topbar]` 컨테이너를
   Customize Layout **앞**에 주입.
3. `createPortal` 로 PIN 버튼 렌더 → 모든 Admin 페이지에서 보임 (topbar = global).
4. 폴백: `justify-end` 못 찾으면 topbar 존 자연 위치(Notifications 옆) inline 렌더.

## 스크린샷

Playwright 환경 미설치(프로젝트 미구성) — typecheck + unit tests 로 대체 검증:
- `apps/commerce-core typecheck`: 0 errors ✓
- `apps/commerce-core test (unit)`: 33/33 passed ✓

## PR

#211 — https://github.com/CuriocityDevAi/storeport/pull/211

## 이연 순증감

0 (신규 위젯 추가, 기존 카드 fallback 전환)

## 변경 파일

- 신규: `apps/commerce-core/src/admin/widgets/manager-pin-topbar.tsx` (zone: topbar)
- 수정: `apps/commerce-core/src/admin/widgets/manager-pin.tsx` (zone: order.list/details.before, fallback only)
