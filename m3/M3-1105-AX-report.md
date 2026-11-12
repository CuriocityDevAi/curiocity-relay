# M3-1105-AX 리포트 — 반품 품목 선택 화면 (부분 환불)

날짜: 2026-11-12  브랜치: feat/m3-1105-ax-return-items  PR: #101

---

## 대사표 (서버 #208 · 앱 기존 · 신규)

| 항목 | 서버 #208 계약 | 앱 기존 (master) | 이 PR 신규 |
|---|---|---|---|
| `POST /return` body | `items[{line_item_id,quantity}]` · `method` · `manager_pin?` · `terminal_approval_code?` | `useReturnOrder` 훅 (api/hooks/pos-refunds.ts) ✓ | — |
| 수량 초과 400 | `return quantity exceeds purchased` | fixture 존재 ✓ | assertion (3) |
| PIN 불일치 401 | `reason:mismatch remaining_attempts` | fixture 존재 ✓ | assertion (4) |
| PIN 잠금 423 | `reason:locked locked_until` | fixture 존재 ✓ | assertion (5) |
| 재고 복귀 | 서버 자동 `inventory_restored:true` | `ReturnOrderInput.body` 에 `restock` 없음 | **서버 필요**: `restock=false` 미지원 · 현재 항상 복귀 |
| 완료 토스트 | — | `showToast.success('Refunded')` (item 수 없음) | `Refunded IDR N (Cash) · N items` |
| Payments Type=Refund | `refunds[].note='return'` → type='refund' | `TendersTable typeLabel.refund='Refund'` ✓ | fixture `pos-order-partial-refund.json` |
| Partially refunded 상태 | `payment_status=partially_refunded` | `PaymentStatus` label='Partially refunded' ✓ | `deriveVoidRefundExposure` paid 체크에 추가 (#91) |

---

## 항목별 표

| REQ | 내용 | 파일:줄 | 커밋 |
|---|---|---|---|
| 0 | 대사표 | 위 표 참조 | 77850e3 |
| 1 | UI 흐름 (Full/Select→품목→예상액→방법→PIN→환불) | VoidRefundSheet.tsx:380–413 · ReturnItemsPicker.tsx ✓ | 기존 (master에서 완성) |
| 2 | 같은 시트 단계 전환 · 숫자 키패드 · PIN 자동 확인 | VoidRefundSheet.tsx:117,480 ✓ | 기존 |
| 3 | 완료 토스트 "Refunded IDR N (Cash) · N items" | VoidRefundSheet.tsx:183–196 | 77850e3 |
| 3 | Payments Type=Refund 줄 | TendersTable.tsx:31 · pos-orders.ts:123 ✓ | 기존 |
| 3 | Partially refunded 뒤 Refund 버튼 유지 (#91) | lib/refund-rules.ts:254 | 77850e3 |
| 4 | 재고 복귀 — **서버 필요** `restock=false` 미지원 | — | — |
| 5 | assertions 66개 | scripts/m3-1105-ax-assertions.mjs | 77850e3 |
| 5 | vitest 40개 · prettier | __tests__/ ✓ | 77850e3 |
| 6 | 스크린샷 4장 (Full/Select/PIN/Payments) | screenshots-m3-1105-ax/ | 77850e3 |

---

## 서버 필요 목록

- `POST /admin/pos/orders/:id/return` 에 `restock` 파라미터 미지원 (storeport #208 계약 범위 외).  
  → 반품 시 재고 복귀/폐기 선택 단계 없음. 현재는 서버가 항상 `inventory_restored=true`.  
  → 지원 시 `ReturnOrderInput.body`에 `restock?: boolean` 추가 + restock 단계 재사용 가능.

---

## PR

PR #101 · https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/101

---

## Kyu 확인(실기) 항목

- [ ] Refund 버튼 → 시트 열림 → "Full order / Select items" 탭 보임
- [ ] Select items → 품목 목록 (이름·옵션·남은 수량·이미 반품된 수량 반영)
- [ ] 수량 −/+ 가 남은 수량 초과 불가
- [ ] 예상 환불액 표시
- [ ] Refund → PIN 단계 (4자리 입력 즉시 자동 확인)
- [ ] 완료 토스트: `Refunded IDR 60,000 (Cash) · 1 item` 형식
- [ ] Payments 표 Type = Refund 줄
- [ ] 부분 환불 뒤 결제 상태 = Partially refunded
- [ ] 같은 주문 한 번 더 Refund 가능 (Refund 버튼 여전히 보임)

---

## git ls-tree (스크린샷 포함)

```
screenshots-m3-1105-ax/01-ipad-refund-full-order.png    c20a9cb
screenshots-m3-1105-ax/02-ipad-refund-select-items.png  85a6520
screenshots-m3-1105-ax/03-ipad-refund-pin.png           85a6520
screenshots-m3-1105-ax/04-ipad-payments-refund-row.png  7096f38
```

---

## 이연 순증감

이연 없음.

---

## 착지 명령

```
cp /tmp/M3-1105-AX-report.md ~/projects/curiocity-relay/m3/ && cd ~/projects/curiocity-relay && git add m3/M3-1105-AX-report.md && git commit -m "m3: M3-1105-AX" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M3-1105-AX done "반품 품목 선택 UI 완성: 토스트 IDR N (Cash) · N items · partially_refunded Refund 유지 · 66 assertions · 스크린샷 4장"
```
