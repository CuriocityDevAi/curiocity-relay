# M1-1116-P 리포트

① 원인 (b): `order-loyalty.tsx`가 `earnedAmount/item_subtotal_pretax×100`으로 역산 → 세전 90,000 기준 1.10% 표시 (정상 계산: 세후 99,000 × 1% = 990). `loyalty-info` 라우트에 `earn_rate_pct` 추가 → 위젯이 설정 실제값 1% 직접 표시. · ② 원인: Medusa admin `basename="/app"` 빌드 → 실제 href `/app/store-credit-accounts`인데 선택자는 `/store-credit-accounts` 불일치. 세 선택자 전체 `/app/` 접두사 추가. · PR #311

---

## ① 적립률 표시 오류 (1% → 1.10%)

### 진단

**Admin 화면**: `${current.earn_rate_pct}%` 직접 렌더 → 반올림 없음. `earn_rate_pct = 1` 이면 정확히 `1%` 표시. **(a) 화면 반올림 아님.**

**계산 로직** (`receipt-preview.ts`):
```typescript
// earn_base = "paid_non_credit" + earn_on_balance_tender_only = true 경우
earnBase = paidOtherAfterRefund  // 세후 paid amount (PB1 포함)
```
- subtotal(세전) = 90,000
- PB1(10%) = 9,000
- earnBase(세후) = 99,000
- credit_earned = floor(99,000 × 1%) = 990 ✓

**계산 자체는 정상.** 적립 설정은 `earn_rate_pct = 1`이 맞고, 계산 결과 990도 맞음.

**문제**: `order-loyalty.tsx` Admin 위젯의 표시 로직:
```typescript
// 버그: 세전 item_subtotal(90,000) 로 역산
const rate = (earnedAmount / subtotal) * 100
// → 990 / 90,000 * 100 = 1.10%
```
**(b) 계산이 설정이 아닌 역산값(세전 기준 유효세율)을 표시한 것.**

**(c) 감사 로그**: earn_rate 변경 없음 — 설정은 처음부터 1%.

### 수정

- `loyalty-info/route.ts`: `earn_rate_pct` 필드 추가 (loyalty_settings 모듈에서 조회)
- `order-loyalty.tsx`: 역산 `rate` 제거 → `earn_rate_pct`(설정 실제값) 표시
  - 표시: `Rp 990 (1% earn rate · floor)`

---

## ② Store Credits 메뉴 숨김 미작동

### 진단

**배포 여부**: 커밋 `5e4306c` (#306, 07:07 UTC) 이후 `a1b7ccf` 까지 main 에 머지됨. Railway auto-deploy 기준 16:11 WIB(09:11 UTC)에는 이미 배포 완료로 추정.

**선택자 불일치**: Medusa admin 빌드 확인
```javascript
// .medusa/server/public/admin/assets/index-DvNs-cuN.js
createRouter(routes, {basename:"/app"})
```
React Router `basename="/app"` → `Link to="/store-credit-accounts"` → `href="/app/store-credit-accounts"`

기존 선택자 `a[href="/store-credit-accounts"]`는 `/app/store-credit-accounts`와 불일치. `/store-credits`, `/orders` 선택자도 동일하게 불일치 상태였음.

### 수정

`nav-hide.tsx` 세 선택자 모두 `/app/` 접두사 추가:
- `a[href="/app/store-credits"]`
- `a[href="/app/store-credit-accounts"]`
- `a[href="/app/orders"]`

---

## 로컬 Playwright 검증

**미실행(미검증)**: 로컬 Admin 서버 기동(DB + migrate) 없이 Playwright e2e 미실행. 빌드 아티팩트에서 `basename="/app"` 직접 확인으로 선택자 불일치 근거 확보.

---

## PR

**#311** `fix/m1-1116-p` → `main`  
https://github.com/CuriocityDevAi/storeport/pull/311

테스트: 332 passed (unit · vitest · jest) ✓
