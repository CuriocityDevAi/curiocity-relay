# M0-1105-AX 리포트 — PB1·SC 를 Medusa 주문 총액에 (Path D · 서버 Round 1+2)

작성: 2026-11-12 · 브랜치 `feat/m0-1105-ax-pos-tax-lines` · PR #224

---

## 결론 한 줄

Path D (per-item `setOrderLineItemTaxLines` · target 역산 rate · 마지막 품목 drift 흡수)
구현 완료. 사용자 영향 돈 금액(환불 33k · void 33k · 부분 반품 R11 해소 · 복리 36,300 ·
drift 0) 7 시나리오 통합 테스트 **로컬 2회 모두 7/7 pass**. PR #224 open.

---

## 1. 실측 결론 (Medusa v2.17.2 `setOrderLineItemTaxLines`)

| 항목 | 결과 |
|---|---|
| API shape | `setOrderLineItemTaxLines(order_id, taxLines[{item_id, code, description, rate, provider_id}])` — **rate 기반** (bigNumber · amount 필드 없음) · `OrderLineItemTaxLine` 모델 `rate: model.bigNumber()` |
| 계산 식 | `@medusajs/utils/dist/totals/tax/index.js:13` · `rate=math.div(taxLine.rate, 100); taxAmount=math.mult(taxableAmount, rate)` · BigNumber |
| item 집계 | `item.tax_total = Σ(subtotal × rate/100)`; `item.total = subtotal + tax_total` (line-item/index.js:41-50) |
| 멱등 | `set*` 는 기존 tax_lines 전량 삭제 후 upsert (order-module-service.js:912-931). **서버는 추가로 `tenderCountBefore===0 && !items.tax_lines[pos_*]` 가드** → split/재tender/preorder balance 중복 0. |
| 반올림 흡수 | per-item **target amount** 를 server 에서 Math.round 분배 + 마지막 품목 drift 흡수 (`target_total − Σ others`) → rate 를 `(allocated × 100)/item_subtotal` 역산. 품목 1개면 rate=pb1_pct 정수. |

**rate 기반 반올림 차이 흡수**: Medusa 는 rate × subtotal 을 BigNumber 로 계산하므로 정수 currency(IDR) 에서 non-integer tax 를 만들 수 있다. 서버 코드가 target amount(= compound formula) 를 authoritative 로 잡고 per-item rate 로 역산하면, 단일 품목·여러 품목 모두 `Σ item.tax_total ≈ target` 성립 (BigNumber precision).

---

## 2. 변경 요약 (파일:라인 · 커밋)

| 변경 | 파일 | 커밋 |
|---|---|---|
| tenders 라우트 tax line 삽입 블록 (`items.tax_lines.*` query 포함) | `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` (섹션 `--- 0b) M0-1105-AX ---` · +122 줄) | `ab2e897` |
| 통합 테스트 신설 (7 시나리오) | `apps/commerce-core/integration-tests/pos/pos-tax-lines.spec.ts` | `0da4b9e` |
| spec 재작성 (관계 필드 중심 가드) | 동일 파일 | `beea46d` |
| #AX-7 drift 가드 보정 (BigNumber 재구성 식 자체로) | 동일 파일 | `ae22370` |

**수정 불필요** (계획서 §4 Round 1 "무변경" 준수):
- `/return/route.ts` — `Math.round(item.total × share)` · item.total 에 PB1 포함되면 자동 수정
- `/void/route.ts` — `payment.amount = computedGrand` 가 이미 PB1 포함
- `/refund/route.ts` — 동일

---

## 3. 돈 수치 대조표

**단일 품목 30,000 · PB1 10%**:
| 필드 | Before | After | 주체 |
|---|---|---|---|
| `order.subtotal` | 30,000 | 30,000 | Medusa summary (불변) |
| `order.tax_total` | 0 | **3,000** | Medusa summary |
| `order.total` | 30,000 | **33,000** | Medusa summary |
| `order.summary.pending_difference` | **−3,000** | **0** | 정상화 |
| `item.total` | 30,000 | **33,000** | Medusa line-item |
| `/return` refund (1개) | 30,000 (R11 버그) | **33,000** | 공식 자동 수정 |
| `/void` refunded_amount | 33,000 | 33,000 | 불변 |
| `PaymentCollection.amount`, `payment.amount` | 33,000 | 33,000 | 불변 |
| `metadata.pos_totals.grand_total` | 33,000 | 33,000 | 불변 (표시 보조) |

**SC 10% + PB1 10% (복리 · 30,000)**:
- SC rate = **10** · PB1 effective rate = 10 × 1.10 = **11**
- tax lines: `pos_sc` + `pos_pb1` 2종 · tax_total = 6,300 · order.total = **36,300**

**다품목 drift (3개 · 10001+10002+10003 · PB1 10%)**:
- pb1_amount = round(30006 × 0.10) = **3,001**
- 품목별 allocated = [1,000 · 1,000 · 1,001] (마지막 품목 drift 흡수) · 합 = 3,001 ±0
- 품목별 rate ≈ [9.999 · 9.998 · 10.007] (BigNumber)

---

## 4. 앱 영향

- **앱 수정 0**: `grandTotal = posTotals?.grand_total ?? order.total` fallback 유지 → 신규 주문(order.total=33k) · 레거시 주문(pos_totals=33k) 모두 동일 33k 반환.
- **Admin Outstanding 해소**: Medusa Admin UI 가 `order.summary.pending_difference` 를 즉시 읽음 → "−3,000" 사라지고 **0** 표시 (Kyu 11-12 R6 뿌리 해소).
- **R11 해소**: `/return` 공식 무변경 · item.total 에 PB1 포함 → 부분 반품이 세금 포함 금액 자동 환불.
- **범위 밖**: Round 3 (앱 grandTotal 소스 단순화) · R12 (앱 Captured→Paid 라벨) 은 별도 M3 티켓.

---

## 5. 자기 검증 로그 (통합 테스트)

```
# 로컬 run #1 (Path D 서버 코드 · spec 7 시나리오)
PASS integration-tests/pos/pos-tax-lines.spec.ts (12.108 s)
  ✓ #AX-1 현금 판매 · PB1 10% · pos_pb1 rate=10 · amount 33,000
  ✓ #AX-2 /return 품목 1개 → refund 33,000 (R11 뿌리 해소)
  ✓ #AX-3 /void 전액 → refund 33,000 (payment.amount 불변)
  ✓ #AX-4 split tender 13k+20k · tax_line 멱등 (2차 중복 0)
  ✓ #AX-5 preorder DP/잔금 · tax_line 멱등
  ✓ #AX-6 SC 10% + PB1 10% 복리 · pos_sc + pos_pb1 · amount 36,300 · PB1 rate≈11
  ✓ #AX-7 다품목 3개 다른 가격 · PB1 10% · drift 0 (할당 1000+1000+1001)
Tests: 7 passed, 7 total

# 로컬 run #2 (멱등 재현)
PASS integration-tests/pos/pos-tax-lines.spec.ts (14.219 s)
Tests: 7 passed, 7 total
```

**기대 숫자 대조**: 모두 통과 — R11 refund 33,000 · void refund 33,000 · split paid_so_far 33,000 · DP+잔금 각 16,500 · 복리 36,300 · drift 0 (3001).

---

## 6. git ls-tree · 커밋 셋

```
ae22370 test(pos): M0-1105-AX · #AX-7 drift 가드 보정 (BigNumber 재구성 식 자체로)
beea46d test(pos): M0-1105-AX · spec 재작성 (관계 필드 중심 가드 · 7 시나리오 유지)
0da4b9e test(pos): M0-1105-AX · pos-tax-lines.spec 7 시나리오 (R11 뿌리 가드)
ab2e897 fix(pos): Medusa order.total 에 PB1·SC 반영 (M0-1105-AX · Path D 서버)
```

브랜치: `feat/m0-1105-ax-pos-tax-lines` · PR: **#224** (<https://github.com/CuriocityDevAi/storeport/pull/224>)

---

## 7. Kyu 실기 항목 (PR 본문에 포함 · check list)

- Order 신규 결제 (Soopsok · PB1 10% · 30,000 → 33,000)
  - [ ] Admin 주문 상세 Tax 줄 "POS Tax (PB1 10%)" = 3,000 표시
  - [ ] Admin 주문 상세 **Outstanding −3,000 사라짐** → 0 (R6 해소)
  - [ ] 부분 반품 품목 1개 → **환불 33,000 (세금 포함)** (R11 해소)
  - [ ] Z-report 일/주 합계 Tax total 분리 집계 확인
- SC 10% + PB1 10% 매장 (Ta Wan 류): 30,000 → **36,300**
  - [ ] Admin Tax 줄 2개 (`pos_sc 10%` 3,000 + `pos_pb1 11%` 3,300)

---

## 8. 이연 순증감

- **−1 이연**: "PB1·SC 를 Medusa `order.total` 에 반영" (R0-1105-CB §5 · M1-1105-AZ §4 R6 · decision-void-test2 R11 · M0-1105-AW 계획서) → 서버 Round 1+2 착지. **Round 3 (앱 소스 단순화)** · **R12 (앱 Captured→Paid 라벨)** 는 별도 M3 티켓 유지.
- **+0 신규 이연**.

Kyu Q1·Q2 답 대기 중 선행 — SC=0 이면 `pos_pb1` 1줄 · SC>0 이면 `pos_sc` + `pos_pb1` 2줄 (복리). Q2 답이 "통합 1줄"로 확정되면 후속 PR 에서 표시만 조정 (서버 숫자 동일).

---

## 9. 착지 명령

```bash
cp /tmp/M0-1105-AX-report.md ~/projects/curiocity-relay/m0/ && \
cd ~/projects/curiocity-relay && \
git add m0/M0-1105-AX-report.md && \
git commit -m "m0: M0-1105-AX" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M0-1105-AX done "Path D 서버 Round 1+2 · setOrderLineItemTaxLines per-item rate · R11 refund 33k 가드 7/7 로컬 2회 통과 · PR #224"
```
