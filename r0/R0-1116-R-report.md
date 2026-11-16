# R0-1116-R report

#305 A · #154 A · #306 A

## #305 storeport — EAS projectId 고정 (APPROVE)

diff 1파일(`app.config.ts`) · 체크 완료.

- `EAS_PROJECT_ID` 상수 `5b023fc6-c56a-4846-b187-ba16019e3ca3` 고정 ✅
- 환경변수 우선(`process.env.EAS_PROJECT_ID || "5b023fc6-…"`) ✅
- 웹 `baseUrl` 분기(`if (!isNativeBuild)`) 미변경 유지 ✅
- PLACEHOLDER 조건 분기 제거 — ID 확정됐으므로 올바른 단순화 ✅
- CI: customer-display ✅ · pos-integration ✅ · unit-commerce-core ✅

## #154 fork — Checkout 낙관적 활성화 + Link customer 시트 튐 (APPROVE)

### 옛 금액·이중 이동 경로 없음

`awaitingMutation=true` → `isUpdatingDraftOrder === 0` 시 useEffect navigate.
이 시점은 confirmEdit 완료 직후이므로 카트 상태 확정.
checkout 화면이 마운트 시 draftOrder를 별도 fetch → 옛 금액 노출 경로 없음.
이중 이동: `awaitingMutation=true` 중 재탭 → handleCheckoutPress가 `isUpdatingDraftOrder > 0` 분기에서 setAwaitingMutation(true) 재호출(no-op) · navigate 없음.

### Keyboard.dismiss() 제거

LinkCustomerSheet consent Pressable 1곳만 수정 · 번호 입력 후 확인 등 다른 Keyboard.dismiss() 호출 미변경 → 다른 키보드 닫힘 흐름 영향 없음.

### 로컬 CI 재실행 결과

| 체크 | 결과 |
|------|------|
| assertions (CI) | ✅ pass |
| flow-tests (CI) | ✅ pass |
| lint (CI) | ❌ — `orders.tsx` prettier error(pre-existing · 이 PR diff 외 파일) · `cart.tsx:452` setAwaitingMutation warning(에러 아님 · 취소 경로 처리 의도 패턴) |

lint fail은 이 PR 변경 파일이 아닌 `orders.tsx` prettier 오류 원인 — 블로커 아님.

## #306 storeport — Store Credits 메뉴 숨김 (APPROVE)

diff 1파일(`nav-hide.tsx`) · 체크 완료.

- `a[href="/store-credit-accounts"]` CSS hide 추가만 ✅
- loyalty-plugin 모듈·API·데이터 미변경 ✅
- 직접 URL 접근 가능(nav 링크 숨김 ≠ 라우트 차단) ✅
- 기존 숨김 규칙 미변경 — 다른 메뉴 영향 없음 ✅
- CI: pos-integration ✅ · customer-display ✅ · unit-commerce-core ✅ · e2e-admin-loyalty ✅
