# M3-1117-F 리포트

**판정**: ② 완전 구현 · ① 서버 보강 필요(M0) — `toPosCustomer` 에 `loyalty_consent_at` 필드 추가 필요.

## ④ 원인 한 줄

`orders.tsx:338` (구) — `useOrders`가 `sdk.admin.order.list()` 를 `+customer.phone` 없이 호출, Medusa 기본 응답은 `customer.phone` 미포함 → 번호전용 연결 손님(email=null, phone=undefined) 이 `null || undefined || 'Unknown Customer'` 를 거쳐 "Unknown Customer" 표시. 연결 자체는 성공(`customer_id` 주문에 정상 세팅됨).

## ① 동의 기록 조사 (서버 보강 필요)

- 저장 위치: `customer.metadata.loyalty_consent = true` · `loyalty_consent_at = ISO 날짜`  
  서버 `lib/link-customer-order.ts:72-83` (기존 손님 동의) · `:96-99` (신규 손님 동의)
- 반환 여부: `GET /admin/pos/customers/search` → `toPosCustomer()` (`src/api/admin/pos/customers/route.ts:37-65`) 에 `loyalty_consent_at` **미포함**.
- **M0 보강 필요**: `toPosCustomer` 반환 타입에 `loyalty_consent_at: string | null` 추가 → 클라이언트가 체크 없이 Link 활성화 가능.

## ② 구현 내용

| 파일 | 변경 |
|------|------|
| `api/hooks/orders.ts` | `sdk.admin.order.list()` 에 `fields: '+customer.phone'` 추가 → 번호전용 손님 phone 반환 |
| `lib/pos-order-adapter.ts` | search 어댑터: `customer.email = masked` → `customer.phone = masked` |
| `lib/format-order-customer.ts` | 신규 — `formatOrderCustomer(customer)` 순수 함수 (E.164·마스킹 둘 다 처리) |
| `app/(tabs)/orders.tsx` | `customerName` → `formatOrderCustomer(item.customer)` 1줄 교체 |
| `__tests__/m3-1117-b-orders-search.test.ts` | 어댑터 테스트: `customer.email` → `customer.phone` |
| `__tests__/m3-1117-f-format-order-customer.test.ts` | 신규 — 카드 3종 단위 테스트 11개 |
| `e2e/flows/11-orders-channel-label.spec.ts` | 신규 — Playwright 카드 3종 E2E 테스트 |

## 검증 로그

```
✓ vitest run (42 files, 515 tests) — 전체 통과
✓ E2E Flow 11 미연결 → POS (Unknown Customer)
✓ E2E Flow 11 번호만 → POS (0813-****-2048)
✓ E2E Flow 11 이름+번호 → POS (Kyu Lee · 0813-****-2048)
✓ E2E Flow 10 (M3-1117-E 회귀 없음)
```

스크린샷: `e2e/screenshots/11-orders-unlinked.png` · `11-orders-phone-only.png` · `11-orders-named.png`

## 이연 순증감

이연 없음. ① = 신규 M0 발생(서버 필드 1개 추가 필요). ② 클라이언트 완전 처리.
