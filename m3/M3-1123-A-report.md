# M3-1123-A · POS 다중 손님 R2+R4 — 1차 구현 리포트

판정: PARTIAL (구현·테스트·lint·tsc PASS · Playwright 스크린샷 미실행 · 실기 회귀 미검증)

## PR
- https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/228
- 브랜치: `feat/M3-1123-A-sell-chips`
- base: `master`

## 커밋
- `4ec1052` feat(pos): M3-1123-A — Sell 탭 · 다중 손님 주문 칩 · 카트 패널/시트

## 변경 파일
### 신규 (8 파일)
- `app/(tabs)/sell.tsx` — Sell 화면 (가로/세로 레이아웃 전환).
- `components/cart/CartPanel.tsx` — 카트 리스트/요약/결제 패널 (가로·세로 공용).
- `components/cart/CartBottomBar.tsx` — 세로 하단 바.
- `components/cart/CartSheet.tsx` — 세로 모드 Modal + Animated.View slide-up.
- `components/order-chips/OrderChips.tsx` — 주문 칩 줄.
- `components/order-chips/OrderChipDetail.tsx` — 노란/no_phone 칩 상세 모달.
- `components/order-chips/types.ts` — 순수 로직 (buildOrderChips, formatElapsed).
- `__tests__/m3-1123-a-order-chips.test.ts` — 단위 테스트.

### 수정 (4 파일)
- `app/(tabs)/_layout.tsx` — 3 탭(sell · orders · settings) + products/cart/scan 숨김.
- `app/(tabs)/cart.tsx` — Redirect → Sell (레거시 라우트 호환).
- `api/hooks/draft-orders.tsx` — 다중 draft 훅 (useDraftOrderList · useSetActiveDraft · useCreateNewDraft · useCancelWaitingDraftOrder). 활성 ID 는 기존 SecureStore 단일 슬롯 유지.
- `hooks/usePosScreenAutoEmit.ts` — 다중 카트 전환 시 자동 emit 동작 명시 코멘트 (로직 변경 없음).

### 미변경
- `components/cd-preview/**` — 지침에 따라 미변경.

## 검증 결과
- **단위 테스트**: `npx vitest run __tests__/m3-1123-a-order-chips.test.ts` → **12/12 PASS**.
  - `buildOrderChips`: 빈 입력 · active+waiting · 최대 4 개+overflow · phone_entry · no_phone · elapsedMs · active 없이 waiting-only · 총 8 케이스.
  - `formatElapsed`: 0:00 · 0:12 · 1:05 · 10:00 · 4 케이스.
- **전체 테스트**: 1507/1507 passed (16 failed 파일은 모두 pre-existing — `m0-1121-a-logo-print` 및 e2e worktree residue).
- **TypeScript**: `npx tsc --noEmit` → 28 errors (전부 pre-existing · master 기준 29 → 28 로 **1 감소** · 내 변경으로 추가 0).
- **Lint**: 내 파일 0 errors · 2 pre-existing warnings (CartPanel setState-in-effect · 원본 cart.tsx 에서 유지된 패턴).

## Playwright 스크린샷
- 미실행 — 사유: `npx expo export -p web` 가 **pre-existing** `upng-js` 모듈 해석 실패 (M0-1121-A/B 영수증 로고 인쇄 커밋 이후 web 환경에서 import 실패). 내 변경과 무관.
- 수동 iPad/iPhone 스크린샷 수집은 Kyu 복귀 후 실기 검증 단계에서 가능.

## Kyu 실기 항목 (§5 기준)
### 완료
- [x] 탭 3 개 — Sell · Orders · Settings.
- [x] Sell 화면 가로 모드 — 왼쪽 그리드 + 오른쪽 400px 카트 패널 + 패널 상단 OrderChips.
- [x] Sell 화면 세로 모드 — 상단 OrderChips + 그리드 + 하단 CartBottomBar → CartSheet.
- [x] OrderChips 5 종 (active · waiting · phone_entry · no_phone · new_order) · 4+"+N" 제한.
- [x] active 칩 굵은 테두리 · waiting 회색+경과 시간 · phone_entry 노란 · no_phone 흰+Text · new_order 점선.
- [x] waiting 길게 누르기 → Cancel Prompt.
- [x] [+New order] → 현재 draft 를 waiting 으로 보존 + 새 draft 생성 + 활성 전환.
- [x] waiting 칩 탭 → setActiveDraft 전환 · 카트 패널 자동 전환 (invalidate → useCurrentDraftOrder 재조회).
- [x] 상품 그리드 바코드 버튼 (검색창 옆 ScanBarcode) → `/scan` push.
- [x] Checkout 버튼 → "Pay" rename.
- [x] Hold 버튼 없음 · Next customer 버튼 없음.
- [x] D1 토큰 사용 (raw hex 금지) · 영문 문구 · Button `h-14` 기준.
- [x] cd-preview 미변경.

### 미완 · 후속 작업 필요
- [ ] 앱 재시작 시 서버 register_session 기준 open draft 목록 복원. 현재는 in-memory 만 — 재시작 시 waiting 사라짐.
- [ ] phone_entry 칩 상태 CD snapshot 실연결. 현재는 `hasPhone=undefined` 로 waiting 폴백.
- [ ] OrderChipDetail 의 "Ask on display" 버튼 CD ask 동작 실연결.
- [ ] Playwright 스크린샷 (web export 수리 후).
- [ ] 실기 회귀 (결제·나눠결제·QR·영수증·Hand over) — Kyu 수동 검증.

## 참고
- 작업 시간: ~45 분 (브랜치 생성 → 검증 → PR → 리포트).
- 커밋 1 건 · 변경 12 파일 · 약 +1300 / -8 라인.
