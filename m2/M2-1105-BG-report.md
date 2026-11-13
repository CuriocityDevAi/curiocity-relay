# M2-1105-BG 착지 보고서

## 원인 1줄
서버가 부분 환불에도 `receipt.kind = 'refund'` 를 반환하여 앱이 직접 신뢰 → "REFUND"(빨강) 표기 (M3 환불 경로에서 `partial_refund` 판정 누락 회귀 추정).

## 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `lib/refund-rules.ts` | `resolveRefundKind()` 추가 — refundAmount < orderTotal 이면 'partial_refund' 로 교정 |
| `components/receipt/ReceiptCard.tsx` | 배너 className: `text-danger` 조건 제거 → `text-ink` 고정 (VOID 와 동일) |
| `app/orders/[orderId].tsx` | `effectiveReceipt` 계산 (resolveRefundKind 적용) → ReceiptCard·onShare 양쪽 전달 |
| `__tests__/receipt-refund-kind.test.ts` | 신규 테스트 7개 |

## head SHA
`6270442815192d788b6af0b695bb9d48f647d799`

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/128 (base: master)

## 자기 검증
- vitest 17/17 passed · 0 failed · 신규 assertions 7개 포함
- lint errors 0 (warnings 3건 pre-existing)
- Share PNG = ViewShot 이 effectiveReceipt 로 렌더된 ReceiptCard 캡처 → 화면·Share 동일 문구
- ESC/POS: voidRefundHeader 가 partial_refund 를 이미 처리 · effectiveReceipt 전달 시 자동 반영

## 확인 항목 (Kyu 실기)
- (a) 상품 2개 주문에서 1개만 환불 → 영수증 머리글 **검정 "PARTIAL REFUND"**
- (b) 전체 환불 → 머리글 **검정 "REFUND"**
