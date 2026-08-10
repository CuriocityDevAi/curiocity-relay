# M0-0729-AN · Z 매출 집계 결함 fix (β 2/3 · UI)

**일자**: 2026-08-10 · **허브**: M0 storeport · **라운드**: AN (AM PASS 후 즉일 결함 수복)

---

## 배경 (Kyu 실측 08-10)

AM 실기 관통 ①~⑩ PASS. 그러나 Z Report 집계 결함 신고:

- 세션 open 후 POS 현금 판매 → **Order #13** (IDR 350,000 · 2026-08-10) 생성 확진
- Z Report 결과:
  - 총매출: **Rp 0** · 주문 수: **0**
  - 결제수단별: **`(no payments)`**
  - 시재 대조: 현금매출 **+Rp 0** · 예상 서랍 **400,000** = 500k(개점) − 100k(수금) — 판매 미반영

---

## AN-1 뿌리 실측 (3중 결함)

| # | 층 | 결함 | 실측 근거 |
|---|-----|------|-----------|
| A | 앱 (fork) | POS Checkout Complete 시 order.metadata.register_session_id 미편입 | Order #13 metadata 결측 |
| B | 앱 (fork) | POS Checkout Complete 시 sale 타입 cash_movement 미생성 | movements 에 sale 결측 |
| C | 백엔드 (commerce-core) | payment_collection 결측 시 by_payment_method 폴백 부재 | Z 텍스트 `(no payments)` |

**정합 정리**:

- 백엔드 subscriber `register-session-order-attribution.ts` 는 `order.placed` 이벤트에 등록되어 있지만 **미발화** (AK 이연 · 이번 라운드는 앱측 직접 편입으로 우회 · subscriber 뿌리 규명은 별건)
- draft-order convert 경로는 Medusa v2 기본 동작상 payment_collection 을 만들지 않음 → by_payment_method 는 근본적으로 비어있음

---

## AN-2 fix 착지 (앱 + 백엔드 병행)

### 앱 fix

- **[agilo-medusa-pos-fork]_PR#3** · branch `feat/m0-0729-an-checkout-attribution`
- `api/hooks/draft-orders.tsx` `useCompleteDraftOrder` 로직 확장:
  - 열린 세션 조회 (stock_location 기준) → draft_order.metadata 편입 → convert → complete → sale cash_movement 즉시 POST
  - 세션 없으면 no-op (하위 호환 · Register 미도입 매장 무영향)
- 검증: TS 0 · lint 0

### 백엔드 fix

- **[storeport]_PR#68** · branch `feat/m0-0729-an-payment-method-fallback`
- `apps/commerce-core/src/api/admin/register-sessions/_helpers.ts`:
  - `by_payment_method` 산출 후 폴백: payment_collection 결측이고 cash_movement(sale) 합계>0 시 `by_payment_method.cash` 에 반영
- 검증: TS 0
- Railway 배포: `06ab7b0c` **SUCCESS** (2026-08-10 16:23) · `/health` 200 확진

### 원장

- **[storeport]_PR#69** · `docs/plans/P1a-3-register-report-round4.md` (Kyu 재실기 §3 · 뿌리 실측 표 · fix diff 요약)

---

## Kyu 재실기 요지 (기존 12 단계 + AN 확진)

**전제**: fork `feat/m0-0729-an-checkout-attribution` (be5b079 이상) · 백엔드 `06ab7b0c` SUCCESS

**결정적 확진 스텝** (기존 12 단계 중):

- 스텝 7 (Checkout Complete) 직후 → 마감 화면 진입 시 **Expected > 0** 확인 (= gross 반영)
- 스텝 11 (Z Report) → **총매출 · 주문 수 · `- cash: Rp X` 라인** 모두 표기 확인 · `(no payments)` 미표시

**게이트**: X Report gross > 0 확인 시 AN 관통 성공.

---

## 이연 순증감

- **해소**: +3 (metadata 미편입 · cash_movement 미생성 · by_payment_method 폴백 결측)
- **신설**: +1 (fulfillment 정책 미정의 — 심문 별도 게시 `M0-0729-AN-inquiry.md`)
- **유지**: 6 (subscriber 발화 뿌리 · payment_collection 자동 생성 · Z closed_at · Anchor Tauri CI · Maestro CLI · 매장 상품명 e2e)
- **총 이연 순증감**: **-2** (감소)

---

## 회부

- **fix PR (앱)**: [agilo-medusa-pos-fork]_PR#3 · commit `be5b079`
- **fix PR (백엔드)**: [storeport]_PR#68 · commit `ba4ec2f`
- **원장 PR**: [storeport]_PR#69 · `docs/m0-0729-an-checkout-attribution`
- **relay 심문 (별도)**: `m0/M0-0729-AN-inquiry.md` (fulfillment 정책 3옵션)
- **다음 게이트**: Kyu §Kyu 재실기 통과 + fulfillment 심문 회신 → AO (β 3/3 · X/Z 사장 뷰) 착수

---

*M0-0729-AN · 2026-08-10*
