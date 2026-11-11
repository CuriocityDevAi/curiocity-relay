# M1-1105-AP Report

## AO 커밋 재사용

- AO 브랜치(`fix/m1-1105-ao-checkout-polish`)에 커밋 없음(원격 미push 상태) — 모든 변경은 작업 트리에만 있었음.
- 스테이징된 신규 파일 3개(`__tests__/cash-quick-buttons.test.ts`, `lib/cash-quick-buttons.ts`, `scripts/m1-1105-ao-playwright.mjs`)와 수정된 파일 11개를 AP에서 커밋으로 통합.

## 경로 제목 화면 목록

| 화면 | 파일 | 조치 |
|------|------|------|
| checkout/success/[orderId] | `app/checkout/success/[orderId].tsx` | `Order #<displayId>` (로딩 중 `''`) ✅ 고침 |
| checkout/tender-cash/[draftOrderId] | `app/checkout/tender-cash/[draftOrderId].tsx` | `Order #<displayId>` (로딩 중 `''`) ✅ 고침 |
| checkout/delivery/[draftOrderId] | `app/checkout/delivery/[draftOrderId].tsx` | `"Delivery"` (고정 · 경로 패턴 없음) ✅ 이미 양호 |
| orders/[orderId] | `app/orders/[orderId].tsx` | `headerShown: false` — 모달 화면, 헤더 없음 ✅ 무관 |
| 기타 설정/register 화면 | 각 화면 | `headerShown: false` — 헤더 없음 ✅ 무관 |

## 폭 측정값 (Playwright 실측)

| 뷰포트 | success 영수증 | orders detail 영수증 | diff |
|--------|---------------|---------------------|------|
| iPad landscape 1194×834 | 420px | 420px | **0.0px** ✅ |
| iPad portrait 834×1194 | 420px | 420px | **0.0px** ✅ |

## 단위 테스트 (cashQuickButtons)

| 케이스 | 기대값 | 결과 |
|--------|--------|------|
| 68,200 | `{a: null, b: 100000}` | ✅ |
| 99,000 | `{a: null, b: 100000}` | ✅ |
| 120,000 | `{a: 150000, b: 200000}` | ✅ |
| 150,000 | `{a: null, b: 200000}` | ✅ |
| 100,000 | `{a: null, b: null}` | ✅ |
| 멱등 (68,200 × 2회) | 동일 결과 | ✅ |

**6/6 passed**

## 스샷 경로

- `screenshots-m1-1105-ao/01-success-ipad-landscape-receipt-width.png`
- `screenshots-m1-1105-ao/02-success-ipad-portrait-receipt-width.png`
- `screenshots-m1-1105-ao/03-cash-68200-buttons.png`
- `screenshots-m1-1105-ao/04-cash-120000-buttons.png`

## PR 번호

**PR #85**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/85

## run-all 결과

**총 57개 · 54 PASS · 3 FAIL**

- 3개 실패(`m3-1105-ad/ae/d-assertions`) = M3 PR #84 진행 중 사전 실패 · 내 변경과 무관(master 기준 동일 실패 확인)
- `m3-1105-m-preorder-playwright.mjs`: total=200,000이면 cashQuickButtons 버튼 둘 다 숨김 → 타임아웃 회귀 → `.catch(() => null)` 패턴으로 수정 → 28/28 PASS

## 이연 순증감

- 신규 이연 없음
- 기존 사전 실패 3건(M3) 유지
