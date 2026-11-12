# M0-1105-AR 리포트 — Void 서버 수정 (예약 +1 · 환불 기록 · 세금 포함 환불 · 재고 되돌림 선택)

**결론 한 줄**: void 라우트가 refundPaymentWorkflow 로 전액 환불 기록 + 예약 cleanup + A안 restock 선택을 처리하도록 수정, 로컬 2회 모두 6/6 PASS, PR #221 로 착지 대기.

---

## 항목 표 (파일:줄 · 커밋)

| 항목 | 요구 | 파일:줄 | 커밋 |
|------|------|--------|------|
| 1 | R3 Reserved +1 제거 (예약 cleanup) | `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` : 1c 블록 (430–457 라인 · `inventoryModule.deleteReservationItems`) | 7942cc8 |
| 2 | R5·R7·R11 환불 기록 (refundPaymentWorkflow · 세금 포함 금액) | `void/route.ts` : 296–359 (cancel 전 refund 블록) + receipt grand_total 교체 : 638–644 | 7942cc8 |
| 3 | A안 restock 선택 (true/false/누락 400) | `void/route.ts` : restock 검증 283–296 · wasted 역차감 362–420 · 응답 restocked/wasted_items : 744–750 | 7942cc8 |
| 4 | R6 pos_totals metadata 저장 | `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` : 540–555 (`nextMd.pos_totals = …`) | 7942cc8 |
| 5 | R4 release-stale-reservations 테스트 | `apps/commerce-core/integration-tests/pos/void-refund-restock.spec.ts` : #AR-6 (653–720 라인) | 7942cc8 · 0127d6f |
| 6 | 새 spec 전수 (운영 시드 재현) | `integration-tests/pos/void-refund-restock.spec.ts` (#AR-1~#AR-6 · 6 scenarios) | 7942cc8 · 0127d6f |
| 7 | 앱 계약 fixture 6종 | `integration-tests/pos/fixtures/m0-1105-ar.*.json` | 0127d6f |

---

## 기대 숫자 대조 (실측)

| 상태 | Reserved | In stock | Available | 검증 |
|------|---------|---------|-----------|------|
| 판매 전 (11 stale + 1 order) | 12 | 100 | 88 | AR-1 preSale (PASS) |
| 결제 + Hand Over 후 | 11 | 99 | 88 | AR-1 postFulfill (PASS) |
| Void(restock=true) 후 | 11 | 100 | 89 | AR-1 postVoid (PASS) |
| Void(restock=false) 후 | 11 | 99 | 88 | AR-2 postVoid (PASS) |
| Void(restock 누락) → 400 | 변화 0 | 99 | 88 | AR-3 after (PASS) |

Refund 합계 = 33,000 (세금 포함) · payment_status = `refunded` · metadata.pos_totals.grand_total = 33000 · split 2-tender void refunds 합 = 33,000 (13k + 20k) 모두 PASS.

---

## PR 번호

**#221**: https://github.com/CuriocityDevAi/storeport/pull/221

브랜치: `fix/m0-1105-ar-void-refund-restock`  
베이스: `main`  
커밋:  
- `7942cc8` fix(pos): void · refund 기록 + 예약 cleanup + restock 선택 (M0-1105-AR)  
- `0127d6f` test(pos): void-refund-restock spec payment_status 체크 + 앱 계약 fixture 6종 (M0-1105-AR)

---

## PR 본문에 Kyu 실기 확인 항목 (요약)

- Order 생성 → 결제 → Hand Over → Void 창에서 "Return to stock / Not returned" 선택 UI 노출 (서버 계약 완료 · UI 는 M3)
- 결제 완료 Admin inventory: Reserved 11 / In stock 99 / Available 88
- Void(Return to stock) 뒤 Admin: Reserved 11 / In stock 100 / Available 89
- Void 뒤 payment_status=refunded + payment.refunds[]
- Void 뒤 Payments 표 Reference(승인번호) · Type(Sale/Void) 분리는 M3 TendersTable 전환 이후

---

## 착지 전 자기 검증 (실행 로그)

```
$ pwd
/Users/kyu.lee/projects/storeport/apps/commerce-core

$ TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules npx jest --silent=false --runInBand --forceExit --testPathPattern='void-refund-restock'
# ── 1차 ─────────────────────────────────────────────────────────────
PASS integration-tests/pos/void-refund-restock.spec.ts (14.01 s)
    M0-1105-AR · POS void refund·restock·R3·R4·R5·R6·R7·R11
      ✓ #AR-1 restock=true · Hot variant · 11 사전 예약 · PB1 10% · 11/100/89 → Hand over 11/99/88 → Void(restock=true) 11/100/89 · refunds[33k] · payment_status=refunded (1330 ms)
      ✓ #AR-2 restock=false · 재고 그대로 (99/88) · metadata.void.restocked=false · wasted_items=[{qty:1}] (1400 ms)
      ✓ #AR-3 restock 누락 (hand over 주문) → 400 restock_required · 어떤 변화도 없음 (863 ms)
      ✓ #AR-4 Hand over 안 한 주문 void (restock 무시) → payment refunded · order canceled (802 ms)
      ✓ #AR-5 split 2-tender (card + cash) void · 각 payment refund · 합 = 33k (993 ms)
      ✓ #AR-6 release-stale-reservations · dry_run=true 11 후보 · dry_run=false 11 삭제 (648 ms)
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total

# ── 2차 ─────────────────────────────────────────────────────────────
PASS integration-tests/pos/void-refund-restock.spec.ts (14.243 s)
Tests:       6 passed, 6 total
```

TypeScript 체크 (`npx tsc --noEmit`) — no output · PASS.

---

## git ls-tree 증거 (M0-1105-AR 신규 경로)

```
$ git ls-tree -r HEAD --name-only | grep -E "m0-1105-ar|void-refund-restock"
apps/commerce-core/integration-tests/pos/fixtures/m0-1105-ar.order-after-void.json
apps/commerce-core/integration-tests/pos/fixtures/m0-1105-ar.void-restock-false.request.json
apps/commerce-core/integration-tests/pos/fixtures/m0-1105-ar.void-restock-false.response.json
apps/commerce-core/integration-tests/pos/fixtures/m0-1105-ar.void-restock-missing.400.response.json
apps/commerce-core/integration-tests/pos/fixtures/m0-1105-ar.void-restock-true.request.json
apps/commerce-core/integration-tests/pos/fixtures/m0-1105-ar.void-restock-true.response.json
apps/commerce-core/integration-tests/pos/void-refund-restock.spec.ts
```

---

## 이연 순증감

- **+1 이연**: PB1·SC 를 Medusa `order.total` 에 반영 (fee line item 통합) → R6 2차 · M0-1105-AR 범위 밖. 대사표 3종 (코어 있음: addShippingMethod/fee line / 우회: metadata.pos_totals / 신규: PB1 전용 모듈) — 우회 채택.
- **+0**: R1 (189 left · 앱 Hot/Iced 합산) · R2 (VOID 영수증 검정) · R8 (Hand over 가드) · R9 (Verify 버튼 제거) · R10 (void toast) · R12 (Captured→Paid 표기) · R13 (Type 컬럼) — 모두 pos-m1 앱 또는 M3 차례.

---

## 참고 사항 (운영 사이드)

### release-stale-reservations 운영 호출 절차 (사람 수행)

1. Admin JWT 획득 — Admin UI 로그인 → Cookies `_medusa_jwt` 복사 또는 `POST /auth/user/emailpass`.
2. stock_location_id 획득 — `GET /admin/stock-locations` → 매장 id.
3. Dry-run:
   ```bash
   curl -X POST https://<HOST>/admin/pos/maintenance/release-stale-reservations \
     -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
     -d '{"location_id":"<SLOC>","dry_run":true}'
   ```
4. 목록 확인 후 `"dry_run":false` 로 실 삭제.

### 워크트리 사건 보고

세션 중 메인 워크트리가 다른 세션 (feat/m2-1105-aq-stock-cleanup-page) 의 작업을 포함하고 있었고 `git checkout` 뒤 외부 프로세스가 재차 그 브랜치로 자동 복귀시키는 현상을 관측. 내 변경을 stash 로 분리해 AR 브랜치에 깨끗한 3-파일 커밋만 올림. 다른 세션 미완 파일(스crash-cleanup page·spec·release-stale-reservations route)은 stash 로 복구 가능하도록 유지.

---

## 착지 명령

```bash
cp /tmp/M0-1105-AR-report.md ~/projects/curiocity-relay/m0/ && cd ~/projects/curiocity-relay && git add m0/M0-1105-AR-report.md && git commit -m "m0: M0-1105-AR" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M0-1105-AR done "void refund 기록(세금 포함) · restock 선택 · 예약 cleanup · 6/6 로컬 PASS · PR #221"
```
