# M0-1105-AY 리포트 — #224 R0-1105-CJ CHANGES 반영 (CI pos-integration RED 해소)

작성: 2026-11-12 · 브랜치 `feat/m0-1105-ax-pos-tax-lines` · 커밋 `beb89bd` · PR #224

---

## 결론 한 줄

CJ R0-1105-CJ 지적 2건 해소 · `tenders.spec` 88/88 + `pos-tax-lines.spec` 7/7 로컬 pass · CI 게이트 공백 보강 · AX 설계/구현 **무변경** (오직 테스트 기대값 교정 + CI 스크립트 패턴 확장).

---

## 1. CJ 지적별 처리 표

| 지적 | 뿌리 (file:line) | 처리 | 커밋 |
|---|---|---|---|
| R0-CJ-1 · `tenders.spec #61` AxiosError 400 (line 3113) | `void/route.ts:303` 가 `hadFulfillment && typeof body.restock !== "boolean"` 이면 400 — #221 M0-1105-AR 에서 추가된 계약 · 테스트 body 에 restock 누락 | `+restock: true` (손님 변심 = 재판매 가능) | `beb89bd` |
| R0-CJ-1 · `tenders.spec #82` preFulItemInvId toBeNull fail (line 3465) | `_shared/fulfillment-items.ts:103-104` 가 #219 M0-1105-AQ 이후 reservation 조회로 `inventory_item_id` 를 채움 · 테스트 전제 (null) 가 스테일 | `preFulItemInvId` null 가드 삭제 + `void` body `+restock: true` | `beb89bd` |
| R0-CJ-1 · `tenders.spec #82` stocked 주석 (line 3509-3515) | fulfill AQ 경로가 재고 -2 를 수행 (예전 설명은 "변동 0") | `stocked: 10` 수치 유지 + 흐름 주석 재작성 (fulfill -2 → restock=true +2 → 10) | `beb89bd` |
| R0-CJ-2 · `pos-tax-lines.spec` CI 미실행 | `package.json:23` 의 `--testPathPattern='tenders\|p6-e2e'` 2 패스에 `pos-tax-lines` 미편입 | 패턴 확장: `tenders → pos-tax-lines → p6-e2e` 3 패스 (pos-tax-lines 가 p6-e2e 앞) | `beb89bd` |

**R0-CJ-3·4·5** (fallback 영속 마커 · BigNumber 다품목 정밀도 · Admin UI 실기) 는 **Non-blocker** · 후속 티켓 이연 (본 PR 범위 밖).

---

## 2. 기대값 변경 표 (근거 포함)

| spec:line | 이전 | 새 | 이유 |
|---|---|---|---|
| tenders.spec:3115-3121 `#61` void body | `{method, pin, session, reason}` | `+restock: true` | #221 M0-1105-AR 계약 (`route.ts:303`): hadFulfillment void 는 restock boolean 필수. 손님 변심 시나리오 = 재판매 가능 → `true`. |
| tenders.spec:3464-3465 `#82` preFulItemInvId | `expect(preFulItemInvId ?? null).toBeNull()` | 가드 자체 삭제 | #219 M0-1105-AQ 가 `_shared/fulfillment-items.ts:103` 에서 reservation 조회로 `inventory_item_id` 를 **채우도록** 바뀜. 본 테스트의 **핵심 가드** 는 `required_quantity` 크래시 없이 `void` 가 200 으로 수렴하는지 — null 전제는 더 이상 유효하지 않음. |
| tenders.spec:3481 `#82` void body | `{method, pin, session, reason}` | `+restock: true` | 동일 (#221 AR 계약). |
| tenders.spec:3509-3515 `#82` stocked 주석 | "fulfill 폴백은 … adjustInventory(-qty) 를 **치지 못했다** → stocked 10 유지" | "fulfill = AQ reservation 경로 -2 (10→8) · void restock=true = +2 복원 (8→10) · 최종 10" | #219 AQ 이후 polyfill fallback 이 reservation 경로로 재고 1회 차감. 수치 `10` 자체는 유지 (fulfill -2 와 restock +2 상쇄). |
| package.json:23 test:integration:pos | 2 패스 (tenders, p6-e2e) | 3 패스 (tenders, **pos-tax-lines**, p6-e2e) | R0-CJ-2 지적 해소. `pos-tax-lines` 를 `p6-e2e` 앞에 두어 AX 7 시나리오 가드가 CI 에서 반드시 실행되도록 (p6-e2e 가 별건 사유로 실패해도 AX coverage 는 CI 로 증명). |

**AX 구현 코드 (`tenders/route.ts`) · `pos-tax-lines.spec.ts` 7 시나리오 · AX 설계 공식·멱등 가드**: 수정 **0** (CJ §1-§3 "완전 일치" 판정 그대로 유지).

---

## 3. 로컬 로그 (spec 별 별도 프로세스 · Medusa singleton 오염 회피)

```
# 1차 (tenders.spec)
PASS integration-tests/pos/tenders.spec.ts (62.87 s)
Test Suites: 1 passed, 1 total
Tests:       88 passed, 88 total
Time:        62.958 s
# 포함 가드: #61 (M1-1105-AS) · #62 · #80 · #81 · #82 (M2-1105-AP) · #14 (SC+PB1) · #17 (show_tax_label) · #32 (pb1_pct 500 가드) 등

# 2차 (pos-tax-lines.spec · 별도 프로세스)
PASS integration-tests/pos/pos-tax-lines.spec.ts (13.38 s)
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
# AX-1 ~ AX-7 전건 pass (현금 · 반품 · void · split · 선주문 · 복리 · drift)
```

실행 env: `DB_HOST=localhost DB_PORT=5432 DB_PASSWORD= JWT_SECRET=test_jwt_secret_ci COOKIE_SECRET=test_cookie_secret_ci STORE_CORS=http://localhost ADMIN_CORS=http://localhost AUTH_CORS=http://localhost NODE_ENV=test` (CI env 와 동일).

---

## 4. 이연 (별건)

- **p6-e2e.spec (b)** `결제 → fulfill(hand_over) → Void` 가 **같은 #221 AR restock_required 뿌리** 로 로컬 RED (void 400 · line 184). AY 티켓 **⛔ 범위 (M2-1105-AW 작업 중 · p6-e2e.spec.ts)** 로 **건드리지 않음**. M2-AW 계열 (또는 별건 R0-AR 후속 티켓) 에서 동일 패턴 (`+restock: true`) 로 처리 필요.
- **R0-CJ-3** (fallback 영속 마커 `metadata.pos_tax_lines_insert_failed`): 운영 사후 조회용 Nit · 후속 M0 이연.
- **R0-CJ-4** (다품목 BigNumber 정밀도): 단건 운영 매장 (Soopsok Sweets) 은 안전 · 다품목 매장 (Ta Wan 류) 롤아웃 전 `#AX-7` 에 `sum(item.tax_total) === pb1_amount` 직접 가드 추가 권장 · M0 이연.
- **R0-CJ-5** (Admin UI Kyu 실기 4항목): 머지 후 1차 실기 블로커 · 롤백 플랜은 M0-1105-AX 플랜서 §3 보존.

---

## 5. 이연 순증감

- **+1 신규 이연**: p6-e2e.spec (b) #221 AR 후속 (restock:true 전파 · M2-AW 혹은 별건).
- **−0 소멸**: R0-CJ-1·R0-CJ-2 는 본 리포트 커밋으로 해소되지만 PR #224 머지 전이므로 "R11 뿌리" 는 머지 완료시에만 소멸. 지금은 **CHANGES → 머지 대기** 로 전환.

---

## 6. 교차 영향 확인

- **AX 구현 코드 (`tenders/route.ts` 668-789)**: 수정 0.
- **pos-tax-lines.spec**: 수정 0.
- **tenders.spec #61·#82 외 86개 테스트**: 영향 0 (로컬 1차 88/88 pass).
- **p6-e2e.spec·stock-cleanup.spec·prod-shape-seed.ts**: 수정 0 (⛔ M2-1105-AW 범위).
- **feature-map coverage**: `apps/commerce-core/integration-tests/pos/**` = `commerce-core.pos-tenders-fulfill` · `apps/commerce-core/package.json` = `infra.commerce-core-envelope` · 양쪽 다 처음부터 등록됨 · 신규 미분류 0.

---

## 7. CJ 리뷰 답글

`gh api repos/CuriocityDevAi/storeport/issues/224/comments` · comment id `6817983275` · 2026-11-12 07:52 UTC · 모든 R0-CJ-1·2 처리 내역 + 로컬 pass 로그 + 이연 항목 포함. Resolve 는 R0 소관.

---

## 8. 착지 명령

```bash
cp /tmp/M0-1105-AY-report.md ~/projects/curiocity-relay/m0/ && \
cd ~/projects/curiocity-relay && \
git add m0/M0-1105-AY-report.md && \
git commit -m "m0: M0-1105-AY" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M0-1105-AY done "CJ CHANGES 2건 해소 · tenders.spec #61·#82 restock=true 교정 + pos-tax-lines CI 3 패스 편입 (beb89bd push) · 로컬 tenders 88/88 + pos-tax-lines 7/7 pass · p6-e2e (b) #221 AR 뿌리 별건 이연"
```
