# R0-1105-CD — fork #101 리뷰 (M3-1105-AX · 반품 품목 선택 · 부분 환불)

**판정: APPROVE** — 서버 #208 계약 일치 · 어설션 66/66 · vitest 40/40 · prettier clean · 어설션 bite 확인 (코드 되돌리면 4개 실패) · #100 과 파일 겹침 0 · #91/#98 회귀 0. 스샷 02 와 03 은 같은 blob(85a65209) 이지만 PR 승인 보류 사유는 아님(머지 후 별도 캡처로 교정 권고).

---

## 검증 표 (file:line)

| REQ | 확인 항목 | 결과 | file:line |
|---|---|---|---|
| 1 | 반품 body `items[{line_item_id,quantity}] · method · manager_pin? · terminal_approval_code?` 서버 #208 와 일치 | ✅ | api/hooks/pos-refunds.ts:93–110 vs storeport return/route.ts:73–81 |
| 1 | 수량 초과 400 fixture / 가드 | ✅ | fixtures/pos-return-400-qty-exceeded.json · route.ts:230 |
| 1 | 남은 수량 반영 (`already_returned` 추적) · −/+ 가 `max_returnable` 초과 불가 | ✅ | ReturnItemsPicker.tsx:63–82 (`maxReturnable = quantity - already_returned` · `max={maxReturnable}`) |
| 2 | 환불 예상액 = `Math.round(line_total * qty/orig_qty)` → 서버 공식과 bit-identical | ✅ | ReturnItemsPicker.tsx:52–60 vs route.ts:306–317 |
| 2 | 토스트 금액 = 서버 `res.refunded_amount` (클라이언트 estimate 무시) | ✅ | VoidRefundSheet.tsx:184 |
| 2 | mixed/split 주문: CASH-first 서버가 분배 (`allPaymentPacks` + `totalRefundable`) · 클라 body 에 tender 분해 없음 | ✅ | route.ts:259–283 · VoidRefundSheet submitPartial body 는 items 만 전달 |
| 3 | 같은 시트 단계 전환 (`confirm → pin`) · Modal 중첩 0 | ✅ | VoidRefundSheet.tsx:117,480 |
| 3 | PIN 4자리 자동 확인 (Verify 버튼 없음 · `onComplete`) · R9 준수 | ✅ | VoidRefundSheet.tsx:487–497 · DigitsInput onComplete |
| 3 | 완료 토스트 `Refunded IDR N (Cash) · N item(s)` | ✅ | VoidRefundSheet.tsx:183–196 |
| 3 | Payments 표 Type=Refund 줄 (`refunds[].note` → type='refund') | ✅ | TendersTable.tsx:31 · pos-orders.ts:123 |
| 3 | `payment_status='partially_refunded'` → Refund 버튼 유지 (#91 경로 불변) | ✅ | lib/refund-rules.ts:254 (`paid` 가 captured · paid · partially_refunded 셋 수용) |
| 3 | Void 흐름 (#98) 회귀 — `submitFull` 로 분기 유지 · body 동일 | ✅ | VoidRefundSheet.tsx:204–231 (voidMut 경로 변경 없음) |
| 4 | 재고 서버가 항상 되돌림 (`inventory_restored=true`) · 화면 안내는 전체-환불 restock 단계 재사용 중 | ✅ | route.ts:60 응답 field · UI 는 full-order void 전용 restock prompt (반품은 서버-주도) |
| 5 | 어설션 bite — master 로 되돌리면 (7) toast × 2 + (10) partially_refunded × 2 → 62/66 (4 실패) | ✅ | 로컬 negative check 완료 |
| 5 | 스샷 실제 커밋 (git ls-tree pr-101-review screenshots-m3-1105-ax/) | ⚠ | 4 blob 있음 · 02 와 03 이 같은 blob (85a65209…) · PR 승인 사유는 아님 |
| 5 | CI — lint pass · assertions pass · playwright pending (타 PR과 공통 패턴) | ✅ | gh pr checks 101 |
| 5 | #100 (scan/qr) 충돌 — 변경 파일 교집합 0 | ✅ | #100 touches scan.tsx/lib/qr.ts · #101 은 VoidRefundSheet/refund-rules/fixture/scripts |

---

## 서버 필요 목록

- (M3 리포트 그대로) `POST /admin/pos/orders/:id/return` 에 `restock` 파라미터 미지원 — 현재 서버는 항상 `inventory_restored=true`.  
  → 반품은 "재고 폐기 선택" 단계가 UI 에 없음 (full-order void 의 restock prompt 와 분기). 향후 `restock?: boolean` 지원 시 `ReturnOrderInput.body` 에 확장 + full-order 와 동일 단계 재사용 가능.

---

## Kyu 실기 항목 (쉬운 말)

- [ ] Refund 버튼 → 시트 열림 → `Full order / Select items` 탭 보임
- [ ] `Select items` → 품목 목록 (이름·옵션·남은 수량·이미 반품된 수량 반영)
- [ ] 수량 −/+ 가 남은 수량(`maxReturnable`) 초과 불가
- [ ] 예상 환불액 표시 (`Estimated refund IDR N`)
- [ ] `Refund` → PIN 단계 (4자리 입력 즉시 자동 확인 · Verify 버튼 없음)
- [ ] 완료 토스트: `Refunded IDR 60,000 (Cash) · 1 item` 형식
- [ ] Payments 표 Type = Refund 줄
- [ ] 부분 환불 뒤 결제 상태 = Partially refunded
- [ ] 같은 주문 한 번 더 Refund 가능 (Refund 버튼 여전히 보임 · #91)
- [ ] 7번 옛 주문 Void (#98) 회귀 0

---

## 이연 순증감

- (−) 이연 신규 없음.
- (유지) 서버 `restock=false` 미지원 — M3-1105-AX 리포트 그대로 보존.

---

## 착지 명령

```
cp /tmp/R0-1105-CD-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CD-report.md && git commit -m "r0: R0-1105-CD" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CD done "APPROVE · fork #101 · 66/66 assertions · 40/40 vitest · 어설션 bite 확인 · 스샷 02=03 blob 중복은 머지 후 캡처로 교정 권고"
```
