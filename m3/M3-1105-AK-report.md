# M3-1105-AK 착지 보고서

**PR**: CuriocityDevAi/agilo-medusa-pos-fork #87 (draft-ready · merge after storeport #212)
**브랜치**: feat/m3-1105-ak-split-tender-ui
**날짜**: 2026-11-11

---

## 구현 완료 항목

### 신규 파일
| 파일 | 역할 |
|------|------|
| `app/checkout/split-tender/[draftOrderId].tsx` | 2단계 split 결제 화면 |
| `__tests__/split-tender.test.ts` | 순수 함수 어설션 40개 |
| `fixtures/m0-1105-aj.*.json` × 10 | 서버 계약 fixture |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `app/checkout/[draftOrderId].tsx` | "Split payment" 버튼 추가 (S4: preorder 비활성) |
| `api/hooks/pos-payments.ts` | `PosSplitTenderFields` 타입 · `split:true` 필드 |
| `lib/refund-rules.ts` | `OriginalTender 'mixed'` · `buildMixedRefundBody` · `pickOriginalTender` 혼합 감지 |
| `components/orders/VoidRefundSheet.tsx` | mixed 주문 void/refund — tenders[] body · PIN in-sheet (S2) |

---

## REQ 검증 결과

| REQ | 항목 | 결과 |
|-----|------|------|
| S1 | 최대 2수단 한도 | ✅ 400 fixture + 서버 가드 |
| S2 | CASH 포함 → PIN in-sheet (Modal 중첩 금지) | ✅ mixed 플랜 requiresPin=true · VoidRefundSheet step='pin' |
| S3 | CASH 먼저 환불 | ✅ refund_distribution[0].method==='cash' |
| S4 | 선주문 분할 불가 | ✅ orderType==='preorder' → splitDisabled=true |
| REQ1 | 1차 금액 입력 + 남은 금액 라이브 | ✅ FirstStep 컴포넌트 |
| REQ2 | 2차 금액 = remaining · 수정 불가 | ✅ SecondStep — amount locked + InfoBanner |
| REQ3 | 현금 빠른 버튼 — 포션 금액 기준 재사용 | ✅ CashTenderPanel(total=포션금액) 무수정 재사용 |
| REQ4 | 영수증 — 두 수단 모두 표시 | ✅ ReceiptCard 기존 tenders[] 순회로 자동 처리 |
| REQ5 | 머지 금지 (draft-ready) | ✅ PR #87 draft · "merge after storeport #212" |
| REQ6 | 어설션 | ✅ 40 assertions PASS |

---

## 테스트 실행

```
Test Files  3 passed (3)
     Tests  40 passed (40)
  Duration  189ms
```

---

## 미검증 (미실행)

- **Playwright 스크린샷** — Expo/Playwright 환경 미구성. split 1차→2차→영수증 · Void 혼합 흐름 UI 실기 미실행.
- **브라우저 E2E** — 서버 storeport #212 미완으로 실 API 연동 불가.

---

## 가정 (서버 #212 미확정 필드)

1. split void/refund body 형식: `{ tenders:[{method, terminal_approval_code?}], manager_pin, register_session_id? }` — 기존 단일 `method:` 형식과 병존 가정.
2. 1차 tender 응답에 `tender_sequence · paid_so_far · remaining · is_complete · grand_total` 추가 필드 포함 가정.
3. `receipt_id: null` = 중간 tender (1차), non-null = 최종 완료 (2차).

---

## 이연 순증감

없음. 기존 `SuccessReceiptAnim` · `CashTenderPanel` 빠른 버튼 로직 무수정 재사용.
