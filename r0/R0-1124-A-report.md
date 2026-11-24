R0-1124-A-report
판정: **APPROVE** — 5번 스크롤 별도 수정 조건부 머지 가능

스캔 진짜 원인: `router.push('/scan')` → `scan.tsx` useEffect `Camera.requestCameraPermissionsAsync()` throw → sell 화면 복귀 → React Query **refetchOnWindowFocus** 발동 (PanGesture 가설 불가 — 스캔 버튼은 `ListHeaderComponent` 밖 독립 `View`에 위치).

5번 스크롤 원인: 미확정 — `app/(tabs)/sell.tsx` FlashList에 `style={{ flex: 1 }}` 없음(sell.tsx:238 근방)이 native iOS에서 contentSize=0 평가 가능성; 웹 E2E에서 재현 불가(FlashList RecyclerListView 경로), 실기 재현 필요. **별도 수정 필요.**

---

## E2E 실행 로그

```
Branch: origin/fix/M3-1124-A-sell-header-tap (detached)
Build: npx expo export -p web → dist/ 성공
Test: npx playwright test e2e/flows/M3-1124-A-sell-header-tap.spec.ts

Running 6 tests using 1 worker
  ✓  1 [chromium] 헤더 탭 분리 · 미리보기 · ... 없음 — phone-portrait       (4.6s)
  ✓  2 [chromium] 스캔 버튼 — 클릭 후 에러 없음 — phone-portrait             (4.3s)
  ✓  3 [chromium] 헤더 탭 분리 · 미리보기 · ... 없음 — ipad-landscape        (4.4s)
  ✓  4 [chromium] 스캔 버튼 — 클릭 후 에러 없음 — ipad-landscape             (4.3s)
  ✓  5 [chromium] 헤더 탭 분리 · 미리보기 · ... 없음 — ipad-portrait          (4.4s)
  ✓  6 [chromium] 스캔 버튼 — 클릭 후 에러 없음 — ipad-portrait               (4.3s)
  6 passed (28.2s)
```

## 스크린샷

스크린샷: `e2e/screenshots/M3-1124-A-sell-header-tap-{phone-portrait,ipad-landscape,ipad-portrait}.png`

- **phone-portrait**: SellTopBar(매장 버튼 테두리+⌄ · Connected · Eye) → OrderChips(#1) → 검색+스캔 → 상품 없음 → CartBottomBar ✓
- **ipad-landscape**: 좌(검색+스캔+상품목록) · 우(CartPanel) 2열 ✓
- **ipad-portrait**: phone과 동일 세로 레이아웃 ✓

## 일반 체크 결과

| 항목 | 결과 |
|------|------|
| 파일 주인 범위 (4파일) | ✓ 적합 |
| 색 하드코딩 | ✓ 없음 |
| 버튼 높이 (BUTTON_H) | ✓ 사용 |
| 새 TS 에러 (PR 도입) | ✓ 0건 |
| RN 번들 (Camera guard 전용) | ✓ 안전 |
| scan.tsx try-catch | ✓ 추가 |

## PR 코멘트

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/246#issuecomment-7121689506
