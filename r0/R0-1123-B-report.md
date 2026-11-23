#228: CHANGES

브랜치: `feat/M3-1123-A-sell-chips` @ `4ec1052`  
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/228  
검증일: 2026-11-23

---

## 실행 로그

### vitest
```
Test Files  1 passed (1)   ← M3-1123-A 전용
Tests       12 passed (12) ← buildOrderChips 8/8 · formatElapsed 4/4
```
(전체 실행 시 16 fail = 모두 .claude/worktrees/ 경로 pre-existing 워크트리 아티팩트)

### tsc --noEmit
pre-existing 에러 그대로 · M3 추가 에러 0건  
(PR body "28 errors · 내 변경으로 추가 0, 1 감소" 확인됨)

### eslint (PR 변경 파일만)
0 new errors · pre-existing warnings 그대로  
- `draft-orders.tsx:7` AdminAddDraftOrderItems unused — pre-existing
- `CartPanel.tsx:468` setState-in-effect — cart.tsx 에서 추출된 pre-existing

### expo export -p web (Playwright 사전 빌드)
실패 — `upng-js` 모듈 미설치 (pre-existing · M0-1121-A/B 이슈)

---

## 스크린샷

미취득 — web export 실패로 Playwright 미실행.  
스크린샷 경로: 없음.

---

## REQ 체크 결과

| # | REQ | 판정 |
|---|-----|------|
| 1 | 탭 3개(Sell·Orders·Settings) · Cart/Scan href:null · 바코드→scan→선택카트 | ✅ |
| 2 | 가로 카트 패널 400px · 세로 CartBottomBar→CartSheet | ✅ (코드 확인 · 시각검증 미완) |
| 3 | 칩: active 굵은테두리 · waiting 경과시간 · +New order · 길게눌러 버리기 · Hold없음 · Next customer없음 | ✅ |
| 3 | phone_entry(노란) → waiting 폴백 | ⚠️ CD snapshot 미연결 — PR body 명시 후속 |
| 3 | no_phone 2분 후 빠짐 | ❌ **CHANGES C2** — paidAt 필드 없음 |
| 4 | 카트 여러 개 + 재시작 대기 카트 복원 | ❌ **CHANGES C1** — in-memory 전용 |
| 5 | 기존 결제·나눠결제·QR·영수증·Hand over 회귀 0 · Pay→뒤로=Sell | ✅ (코드 확인 · 실기 미검증) |
| 6 | raw hex 0 · 앱 문구 영어 | ✅ |

---

## CHANGES 목록

**C1** `api/hooks/draft-orders.tsx:46` — 대기 카트 재시작 복원 미구현  
waiting 목록 in-memory 전용 → 재시작 시 소멸. 계획서 §3.R2 명시 항목.  
수정: 앱 초기화 시 register_session 기준 서버에서 open draft 목록 조회 후 `_draftOrderList` 복원.

**C2** `components/order-chips/types.ts:14` — no_phone 2분 타이머 미구현  
`OrderChipInput` 에 `paidAt` 없음 → `paid_at + 2min` 자동 제거 불가.  
수정: `paidAt?: number` 필드 추가 + `buildOrderChips` 에서 2분 경과 시 칩 제외.

**C3** `components/order-chips/OrderChipDetail.tsx:52` — Enter phone here instead 버그  
`router.push('/customer-lookup')` 에 setActiveDraft 없음 → 활성 카트가 다를 경우 엉뚱한 주문에 고객 연결.  
수정: setActiveDraft(orderId) 호출 후 navigate.

---

## Kyu 실기 필수 항목

- 세로(폰) Sell 화면 전체 흐름: 상품 담기 → CartBottomBar → 시트 → Checkout
- 가로(태블릿) 카트 패널 · 칩 전환 시각 확인
- 기존 결제·나눠결제·QR·영수증·Hand over 회귀 확인
- 바코드 스캔 → 선택 카트에 담기는지 실기
