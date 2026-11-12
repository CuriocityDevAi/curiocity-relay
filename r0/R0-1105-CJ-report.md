# R0-1105-CJ 리포트 — storeport #224 (M0-1105-AX · Path D · PB1·SC → Medusa order.total) 리뷰

작성: 2026-11-12 · 리뷰어: 오케 (Opus · R0) · 모드: 리뷰 전용 (코드 수정 0)

---

## 판정 한 줄

**CHANGES** — 설계·공식·멱등 가드는 돈 규칙(11-07 % round 복리) 과 완전 일치하고 7 시나리오 통합 테스트도 올바르나, **(1) CI `pos-integration` 가 RED (tenders.spec #61·#82 2건 실패 · main 동일 커밋 GREEN 대비 회귀)** · **(2) 신규 `pos-tax-lines.spec` 가 `test:integration:pos` 의 `--testPathPattern='tenders\.spec'` 에 걸려 CI 에서 실행되지 않아 검증 게이트 공백 발생** · 2가지를 해소하기 전 머지 불가.

---

## 1. 검증 표 (file:line · 돈 규칙·멱등 가드)

| 검증 항목 | 소스 | 근거 (file:line) | 결과 |
|---|---|---|---|
| SC 공식 `round(subtotal × sc_pct/100)` · % round | tenders/route.ts | `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:335` | ✓ 11-07 규칙 정합 |
| PB1 복리 `round((subtotal+SC) × pb1_pct/100)` · % round | 동 | 라인 336-337 | ✓ 복리·round 정합 |
| computedGrand = subtotal + SC + PB1 | 동 | 라인 340 | ✓ PaymentCollection.amount SoT |
| 멱등 가드 1차 `tenderCountBefore === 0` | 동 | 라인 708 | ✓ 2차 tender · 잔금 재진입 skip |
| 멱등 가드 2차 `items.tax_lines[pos_sc|pos_pb1]` 존재 체크 | 동 | 라인 724-729 (`hasExistingPos`) | ✓ split 중간 재조회 혼선 방어 |
| `items.tax_lines.*` query 필드 추가 | 동 | 라인 275 (query graph) | ✓ 2차 가드 소스 |
| 분배: 비율 round + 마지막 drift 흡수 | 동 | 라인 732-742 (`allocate`) | ✓ 합계 = target · ±0 Rp |
| rate = `(allocated × 100) / itemSub` 역산 | 동 | 라인 759·772 | ✓ Medusa `tax=subtotal×rate/100` 와 정합 |
| 복리 rate description | 동 | 라인 767-770 | ✓ `PB1 10% (compound on SC) ≈ 11.00%` |
| 비치명 fallback (try/catch · warn log) | 동 | 라인 783-789 | ⚠ 영속 마커 없음 (아래 §4-5) |
| /return · /void · /refund 라우트 무변경 | — | 변경 파일 목록에 없음 | ✓ 계획서 §4 준수 |

**결론**: 설계 코드는 11-07 세금 규칙(SC=Subtotal×SC% · PB1=(Subtotal+SC)×PB1% · % round) 과 **완전 일치** · 멱등 가드가 split/preorder/재tender 중복 삽입을 2중으로 막음.

---

## 2. 돈 필드 대조 (단일 품목 30,000 · PB1 10%)

| 필드 | Before (운영 현재) | After (Path D) | 검증 가드 |
|---|---|---|---|
| `order.subtotal` | 30,000 | 30,000 | 불변 |
| `order.tax_total` | 0 | **3,000** | spec `#AX-1` rate=10 |
| `order.total` | 30,000 | **33,000** | spec `#AX-1` 암묵 (rate+subtotal) |
| `order.summary.pending_difference` | **−3,000** | **0** | Admin R6 해소 (관찰 가드 간접) |
| `item.total` | 30,000 | **33,000** | spec `#AX-2` /return refund 33,000 |
| `/return` refund (품목 1개) | 30,000 (R11 버그) | **33,000** | spec `#AX-2` ✓ R11 뿌리 해소 |
| `/void` refunded_amount | 33,000 | 33,000 | spec `#AX-3` (payment.amount SoT · 불변) |
| `PaymentCollection.amount` · `payment.amount` | 33,000 | 33,000 | 불변 |
| `metadata.pos_totals.grand_total` | 33,000 | 33,000 | 불변 (표시 보조) |

**복리 (SC 10% + PB1 10% · 30,000)**:
- SC = round(30,000 × 0.10) = **3,000**
- PB1 = round(33,000 × 0.10) = **3,300**
- order.total = subtotal + SC + PB1 = **36,300** · spec `#AX-6` pos_sc rate=10 · pos_pb1 rate≈11
- effectiveRate 수식 = pb1_pct × (1 + sc_pct/100) = 10 × 1.10 = 11 ✓

**다품목 drift (3개 · 10001+10002+10003 · PB1 10%)**:
- subtotal = 30,006 · pb1_amount = round(30,006 × 0.10) = **3,001**
- 분배: 비율 round([1000·1000·1000]) → 마지막 drift 흡수 → **[1000·1000·1001]** · 합 3,001 ±0
- 품목별 rate ≈ [9.999·9.998·10.007] (BigNumber precision) · spec `#AX-7` rate ∈ [9.99, 10.02]
- allocate 함수 자체가 drift 0 을 보장 (`isLast ? totalAmount - used : round(sub/subSum × totalAmount)`)

**SC=0 단일 줄**: `sc_amount > 0` 조건으로 pos_sc 미삽입 · pos_pb1 1줄만 삽입 · `#AX-1`·`#AX-4`·`#AX-5`·`#AX-7` 모두 `tax_lines.length === 1` 가드.

---

## 3. 시나리오별 가드

| 시나리오 | spec | 가드 | 비고 |
|---|---|---|---|
| 현금 단일 판매 · PB1 10% | `#AX-1` | pos_pb1 rate=10 · tender amount=33,000 | ✓ |
| 부분 반품 품목 1개 (R11) | `#AX-2` | /return refund 33,000 (세금 포함) | ✓ 뿌리 해소 |
| 전액 Void | `#AX-3` | voidRes.refunded_amount=33,000 · pos_totals 유지 | ✓ payment.amount SoT |
| Split tender 13k+20k | `#AX-4` | 1차 후 tax_lines=1 · 2차 후 여전히 1 (중복 삽입 0) | ✓ 멱등 2중 가드 |
| 선주문 DP 50% / 잔금 | `#AX-5` | DP 후 tax_lines=1 · 잔금 후 여전히 1 | ✓ 멱등 2중 가드 |
| SC 10% + PB1 10% 복리 | `#AX-6` | 2줄 (pos_sc rate=10 · pos_pb1 rate≈11) · amount 36,300 | ✓ 복리 식 정합 |
| 다품목 3개 drift 0 | `#AX-7` | 품목별 rate ∈ [9.99, 10.02] · allocate 합 = 3,001 | ✓ drift 식 자체 guard |

**남은 금액 재환불** (스펙 없음 · 코드 리뷰): /return route 무변경 이므로 `payment.amount - refunded_so_far` 로 재환불 경로 동일 유지 — item.total 에 세금 포함되어 항상 정확.

**기존 주문 호환**: tax_lines 삽입은 `tenderCountBefore === 0` 에서만 → 기존 주문(이미 tender 완료) 에는 재영향 0 · 앱 fallback `posTotals?.grand_total ?? order.total` 가 레거시에서 33,000 리턴 · Admin 에서 레거시는 여전히 "−3,000" (backward compat 허용).

---

## 4. 돈 수치 외 교차 영향

| 영역 | 영향 | 상태 |
|---|---|---|
| Admin 주문 상세 | `order.tax_total` 자동 표시 · Outstanding = 0 (R6 해소) | 서버 보장 · Kyu 실기 미완 (PR 본문 체크 2개 비어있음) |
| 앱 pos_totals fallback | `posTotals?.grand_total ?? order.total` 양쪽 33,000 반환 | 앱 수정 0 (Round 3 deferred) |
| 영수증 | `metadata.pos_totals` 계속 쓰기 → 영수증 SC/PB1 명세 변화 0 | 불변 |
| Z report | `order.subtotal` 상품 매출 분리 · `order.tax_total` 세금 분리 | 자동 분리 · 실기 미완 |
| Admin captured_amount | 미변경 | 영향 0 |

---

## 5. 지적 사항 (CHANGES 사유)

### R0-CJ-1 · **CI `pos-integration` 가 RED** (반드시 해소)

- 실행: https://github.com/CuriocityDevAi/storeport/actions/runs/43173728812 (commit ae22370 · 2026-11-12 07:16)
- 결과: `tenders.spec` `Tests: 2 failed, 86 passed, 88 total`
  - `#61 (M1-1105-AS) POST /fulfill 뒤 void` — AxiosError 400 (`tenders.spec.ts:3113`)
  - `#82 (M2-1105-AP) variant↔inventory 링크 polyfill void` — `expect(preFulItemInvId ?? null).toBeNull()` 가 "iitem_01M779TJJ…" 받음 (`tenders.spec.ts:3465`)
- 비교: main (6f15ef7) 동 경로 CI = **success** (2026-11-12 03:59) → PR 4커밋 (ab2e897, 0da4b9e, beea46d, ae22370) 가 유일한 델타 → 회귀 혹은 플래키 가능성 양쪽 다 가능 (log 에 `Connection ended unexpectedly` 다발 · DB 플래키 시그널도 혼재).
- 조치: PR 재실행으로 플래키 여부 확인 → 결정론적 실패면 /void 가 `order.items.tax_lines.*` 쿼리 필드 추가 (route.ts:275) 혹은 setOrderLineItemTaxLines 호출 후 state 로 인해 영향 받는지 재현 필요. **최소: CI 녹색이 머지 전제.**

### R0-CJ-2 · **신규 `pos-tax-lines.spec` 가 CI 에서 실행되지 않음** (게이트 공백)

- 소스: `apps/commerce-core/package.json:23` · `test:integration:pos` 가 `--testPathPattern='tenders\.spec'` → `--testPathPattern='p6-e2e\.spec'` 2 패스만 실행.
- 영향: 7 시나리오 (`#AX-1` ~ `#AX-7`) 은 **로컬 2회 pass** 만 근거 · CI 는 한 번도 실행 안 함 · 향후 회귀 시 서버 이슈 전에 발견할 게이트가 없음.
- 조치: 다음 중 하나
  1. `test:integration:pos` 를 `pos-tax-lines\\.spec` 추가 패스 (3 패스) 로 수정 (가장 작음)
  2. `tenders\\.spec` 패턴을 `(tenders|pos-tax-lines)\\.spec` 로 통합 (단일 패스)
  3. `--testPathPattern` 제거하고 `integration-tests/pos` 폴더 전체 실행 (가장 넓음)
- 추가 지적: `test:integration:pos` 가 `--testPathPattern` 을 하드코딩해둔 구조 자체가 **새 spec 이 자동 편입 안 되는 패턴** · 이 게이트 공백은 R0-1105-CJ 범위 밖 체계 이슈이나 이번 PR 머지 전 최소 1 번은 해소.

### R0-CJ-3 · **비치명 fallback 영속 마커 부재** (Nit · 추후 개선)

- 소스: route.ts:783-789 · `setOrderLineItemTaxLines` 실패 시 `console.warn` 만 남기고 PaymentCollection 은 성공.
- 영향: 운영에서 조용히 실패 → Admin "Outstanding −3,000" + /return 세금 누락이 특정 주문에만 발생해도 **감사 추적 불가** · R11 재발 소스.
- 조치: `metadata.pos_tax_lines_insert_failed = { reason, at }` 마커 1줄 추가하면 사후 조회·복구 쉬움. 블로커 아님 (fallback 이 돈 값 유지하므로 Round 2 수준).

### R0-CJ-4 · **다품목 rate→amount 역산 BigNumber 정밀도** (주의 · 계획서 §2 "실 호출 테스트로 확인" 명시된 주제)

- rate = `(allocated × 100) / itemSub` 는 **float 소수 (예: 10.007)** · Medusa 는 `taxAmount = math.mult(taxableAmount, rate/100)` 을 BigNumber 로 계산.
- `#AX-7` 가 rate 범위만 (9.99~10.02) 가드하고 `item.tax_total == allocated` 직접 가드 안 함 · subtotal × rate/100 이 BigNumber 에서 정확히 복원되는지 비검증.
- 다만 `#AX-2` 의 `/return refund = 33,000` 가드가 **단일 품목 경로에서 item.total = subtotal + tax_total 를 간접 가드** 하므로 운영 단건은 안전 (Soopsok Sweets = 단일 상품/주문 다수).
- 조치: 다품목 운영 매장 (Ta Wan 류) 롤아웃 전 `#AX-7` 에 `sum(item.tax_total) === 3,001` 직접 가드 추가 권장 (BigNumber `numeric_` fallback 으로 `toNum(it.tax_total)` 합) · 블로커는 아님.

### R0-CJ-5 · **Admin UI 실기 미완** (PR 본문 체크 리스트 비어있음)

- PR 본문 "Kyu 실기" 체크 4개 모두 `[ ]` 미확인.
- 서버 숫자 가드 (spec 7/7 pass) 는 있으나 Admin 주문 상세 Tax 줄 표시 · Outstanding 0 · Z-report 분리 집계 · 부분 반품 33,000 등 **4개 모두 Kyu 실기 통과가 필요**.
- 조치: 머지 후 Kyu 1차 실기 블로커로 추적 · 실기 실패 시 즉시 롤백 플랜 명시.

### R0-CJ-6 · **#223 (test seed 공용 헬퍼) 와 머지 순서** (충돌 분석)

- 파일 겹침 0: #223 = (`prod-shape-seed.ts` 신규, `p6-e2e.spec.ts`, `stock-cleanup.spec.ts`) · #224 = (`pos-tax-lines.spec.ts` 신규, `tenders/route.ts`).
- 충돌 가능성: 0. 어느 쪽이 먼저 머지되어도 안전. 그러나 #223 이 먼저 머지되면 `test:integration:pos` 의 `p6-e2e` 패스가 변경된 공용 시드로 돌아가 녹색 유지 여부 재확인 필요.

### R0-CJ-7 · **세금 쪼개짐 (pos_sc + pos_pb1 2줄 vs 통합 1줄) Kyu Q2 미결** (Non-blocker · 표시만)

- 현재 PR: SC>0 → pos_sc + pos_pb1 2줄, SC=0 → pos_pb1 1줄. AX 리포트 §8 에 "Q2 통합 1줄 확정되면 후속 PR 에서 표시만 조정 · 서버 숫자 동일" 명시.
- 돈 값 보존되므로 표시 결정은 비치명. 머지 가능.

---

## 6. Kyu 실기 항목 (쉬운 말 번역)

- **(필수) 새 주문 결제 후 Admin 주문 상세 열면 "Outstanding −3,000" 사라지고 0 으로 보이나요?**  
  (뜻: PB1 세금이 주문 총액에 반영돼서 "덜 받은 것처럼" 보이던 Admin 버그가 사라지는지.)
- **(필수) 부분 반품 (품목 1개만 환불) 시 환불액이 세금 포함 33,000 으로 떨어지나요?**  
  (뜻: 손님이 낸 세금까지 돌려받는 게 R11 해결. 과거엔 30,000 만 환불됐음.)
- **(필수) Admin 주문 상세에 "POS Tax (PB1 10%) = 3,000" 줄이 보이나요?**  
  (뜻: 세금 라인 자체가 표시되는지 확인. 2 줄 혹은 1 줄 디자인은 Q2 에서 확정.)
- **(필수) 하루 Z report 에서 Tax total 이 상품 매출과 분리 집계되나요?**  
  (뜻: 세금 집계 괴리 해소 확인.)
- **(필수) SC 10% 쓰는 매장에서 36,300 결제가 서버 저장 36,300 · 환불 36,300 으로 떨어지나요?**  
  (뜻: 복리 공식이 Soopsok 외 매장에서도 작동.)
- **(선택) 선주문 DP (16,500) → 잔금 (16,500) 각 영수증·Admin 숫자도 정합한가요?**

---

## 7. 이연 순증감

- **+0 신규 이연**: R0-CJ-1·R0-CJ-2 는 본 PR 범위 내 수정 가능 (CI 재녹색 · test 스크립트 패턴 확장) · R0-CJ-3·R0-CJ-4·R0-CJ-5 는 후속 티켓으로 이연 가능하나 전부 M0/M3 수준.
- **−0 소멸**: PR 머지 후에만 "PB1·SC 를 Medusa `order.total` 에 반영" (R0-1105-CB §5 · M1-1105-AZ §4 R6 · decision-void-test2 R11) 이연 소멸. 지금 시점에는 아직 미소멸.

---

## 8. 착지 명령

```bash
cp /tmp/R0-1105-CJ-report.md ~/projects/curiocity-relay/r0/ && \
cd ~/projects/curiocity-relay && \
git add r0/R0-1105-CJ-report.md && \
git commit -m "r0: R0-1105-CJ" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs R0-1105-CJ done "CHANGES · 설계·공식·멱등 모두 정합이나 CI pos-integration RED (tenders.spec #61·#82) + 신규 pos-tax-lines.spec 가 test:integration:pos 패턴에 미편입 → 2건 해소 전 머지 금지"
```
