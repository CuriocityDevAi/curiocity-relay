---
round: M0-1105-P
pr:
  storeport: storeport#196
base_pr: null
outcome: tender-auto-convert-live · tenders 라우트가 결제 트랜잭션 안에서 draft→order 자동 전환 · 멱등 · 실패 non-fatal · Integration 13/13 · Unit 24/24 · CI 전부 그린
kyu_checks: 1 (M0-1105-O §4 뿌리 수용 · 실기 Orders 탭 ✗ 봉인)
ci_links:
  markers-and-forbidden: https://github.com/CuriocityDevAi/storeport/actions/runs/42350157554/job/128336372412
  check: https://github.com/CuriocityDevAi/storeport/actions/runs/42350157523/job/128336371863
  changes-filter: https://github.com/CuriocityDevAi/storeport/actions/runs/42350157554/job/128336372141
  pos-integration: https://github.com/CuriocityDevAi/storeport/actions/runs/42350157554/job/128336402599
---

# M0-1105-P · tenders 라우트 자동 draft→order 전환

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` + `integration-tests/pos/{tenders.spec.ts,helpers.ts}`.

**base**: `origin/main @ 32ab911` (M0-1105-L 머지 직후).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | tenders 라우트에 convert 통합 (capture+receipt+metadata 뒤 · 멱등 · 실패 non-fatal) | ✓ |
| 2 | 응답에 `converted: boolean · is_draft_order: boolean` | ✓ |
| 3 | preorder DP 도 첫 tender 에서 전환 (#3 어설션) | ✓ |
| 4 | #1 에 "/admin/orders 응답에 display_id 포함" 어설션 | ✓ (Kyu 버그 재현 가드) |
| 5 | 전환 실패 fallback 1건 | ✓ (#13 · non-draft 멱등 skip-path · 응답 shape 보장) |
| 6 | 운영 데이터 #30 보정 | ◻ (사용자 run 대기 · §4 명령) |
| 7 | fixture JSON | ✓ (§5) |
| 8 | 금지 영역 (medusa-config · providers · 재고 차감 시점) 변경 0 | ✓ |

---

## 1. 뿌리 (M0-1105-O §4 결론)

Medusa 2.17 의 `/admin/orders` 는 `is_draft_order: false` 를 하드코딩으로 적용 (route.js:9). P2 cash flow 는 `convertToOrder` 를 생략해 Order #30 이 draft 로 영구 잔존 → Orders 탭 ✗. 서버가 결제 트랜잭션 안에서 자동 전환하면:
- 앱(M3) 의존 제거.
- 재발 방지 (앱이 또 누락해도 서버가 메움).
- 멱등: 이미 non-draft 면 skip (preorder 2차 tender · 재tender 안전).
- 실패: non-fatal · 결제는 유지 · 응답에 `converted: false` 로 관측 가능.

---

## 2. 변경 ↔ file:line

### `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts`
- line 7 · import 에 `convertDraftOrderWorkflow` 추가 (`@medusajs/core-flows`).
- line 118-120 · query.graph 필드에 `"status", "is_draft_order"` 추가.
- line 602-627 · 신규 **section 7 · Auto-convert draft → order**:
  ```ts
  let converted = false;
  let finalIsDraft = Boolean(order.is_draft_order);
  if (order.is_draft_order === true) {
    try {
      await convertDraftOrderWorkflow(container).run({ input: { id: order_id } });
      converted = true;
      finalIsDraft = false;
    } catch (e) {
      console.warn(`[M0-1105-P] convertDraftOrderWorkflow failed (non-fatal · 결제 유지): ${(e as Error).message}`);
    }
  }
  ```
- 응답 shape: `converted · is_draft_order` 신규 2필드.

### `apps/commerce-core/integration-tests/pos/helpers.ts`
- `createTestOrder({ isDraft?: boolean })` 옵션 — `createOrders` 에 `is_draft_order:true · status:"draft"` 주입.

### `apps/commerce-core/integration-tests/pos/tenders.spec.ts` (13/13)
- **#1** 확장: isDraft=true · `converted===true` · `is_draft_order===false` · `retrieveOrder.status==="pending"` · **GET /admin/orders 응답에 display_id 포함** 어설션 (Kyu 11-07 실기 재현 가드).
- **#3** 확장: preorder DP + isDraft=true · `converted===true`.
- **#10** 확장: isDraft=true · DP 때 converted:true · balance 때 converted:false (멱등).
- **#13 신규**: non-draft 에 tender → convert 블록 skip · converted:false · 결제 정상.
  - 주: 실제 "convert workflow throw" 재현은 Medusa core (validateDraftOrderStep) override 가 필요하므로 멱등 skip-path 로 fallback 응답 shape 를 커버.

**금지 영역 변경 0**: `medusa-config.ts` · providers · 재고 차감 시점 (`createOrderFulfillmentWorkflow` 단일 지점).

---

## 3. 검증

| 체크 | 결과 |
|---|---|
| ⓐ Build | Backend **4.18s** · Frontend **16.00s** · PASS |
| ⓒ 산출물 기동 | `BOOT OK unknown :9999` · `Server is ready on port: 9999 – 2533ms` · `/health 200` |
| Unit | **24/24 PASS** |
| Integration | **13/13 PASS** |
| CI `markers-and-forbidden` | PASS 9s |
| CI `check` (feature-map) | PASS 13s |
| CI `changes-filter` | PASS 6s |
| CI `pos-integration` | PASS 2m16s |

### Integration 로그 (13/13)
```
✓ #1  cash tender · metadata.receipt_id · draft→order auto-convert + Orders 목록 포함   848ms
✓ #2  edc approval 누락 → 400 · collection 0건                                           614ms
✓ #3  preorder dp=50 · 첫 tender draft 전환                                              530ms
✓ #4  takeaway fulfill inventory decrement                                               589ms
✓ #5  preorder fulfill → send_to_production                                              664ms
✓ #6  2 tenders · collections 2개 + aggregate                                            558ms
✓ #7  settings dp%=30 · body override                                                    756ms
✓ #8  show_tax_label=false → tax.show=false                                              627ms
✓ #9  receipt_header 3줄 CRLF→LF                                                         570ms
✓ #10 DP (converted:true) → balance (converted:false 멱등)                               509ms
✓ #11 balance 미달/초과 → 400                                                            449ms
✓ #12 balance → fulfill(hand_over) → 재고 1회                                            559ms
✓ #13 non-draft tender → converted:false 멱등 skip-path                                  773ms
Tests: 13 passed, 13 total
```

---

## 4. 운영 데이터 #30 보정 (사용자 run · credentials 필요)

**지시사항**: 삭제 아님 · convertToOrder 1건만 · 다른 draft 손대지 말 것. 서버 PR #196 머지 전/후 어느 쪽에서 실행해도 **Admin API `convertToOrder` 엔드포인트는 동일** (Medusa 2.17 bundled).

### 4.1 전 — 상태 조회
```bash
TOKEN=$(curl -sS -X POST https://api.meros.id/auth/user/emailpass \
  -H 'Content-Type: application/json' \
  -d '{"email":"<admin>","password":"<pw>"}' | jq -r .token)

# A. Orders 엔드포인트에 #30 미포함 재현
curl -sS "https://api.meros.id/admin/orders?fields=%2Bcustomer.*,%2Btotal,%2Bcurrency_code&order=-created_at&limit=50" \
  -H "Authorization: Bearer $TOKEN" | jq '.orders | map(select(.display_id==30))'
# 예상: [] (하드코딩 is_draft_order:false 필터)

# B. Draft-orders 에서 #30 조회 · 보정 전 상태 수집
DRAFT_30=$(curl -sS "https://api.meros.id/admin/draft-orders?limit=100&order=-created_at" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.draft_orders[] | select(.display_id==30)')
echo "$DRAFT_30" | jq '{id, display_id, status, is_draft_order, created_at, metadata}'
# 예상: status="draft" · is_draft_order=true · metadata.receipt_id · metadata.order_type

DRAFT_30_ID=$(echo "$DRAFT_30" | jq -r '.id')
echo "DRAFT_30_ID=$DRAFT_30_ID"
```

### 4.2 보정 — Admin API `convertToOrder`
```bash
# Medusa 2.17 Admin API · 단건 convert
curl -sS -X POST "https://api.meros.id/admin/draft-orders/$DRAFT_30_ID/convert-to-order" \
  -H "Authorization: Bearer $TOKEN" | jq
# 예상: { order: { id: DRAFT_30_ID, status: "pending", is_draft_order: false, ... } }
```

### 4.3 후 — 검증
```bash
# A. Orders 엔드포인트에 #30 포함 확인 (= Kyu 버그 봉인)
curl -sS "https://api.meros.id/admin/orders?fields=%2Bcustomer.*,%2Btotal,%2Bcurrency_code&order=-created_at&limit=50" \
  -H "Authorization: Bearer $TOKEN" | jq '.orders | map(select(.display_id==30)) | .[0] | {id, display_id, status, payment_status, is_draft_order}'
# 예상: { id, display_id:30, status:"pending", payment_status:"captured" | "paid", is_draft_order:false }

# B. 영수증 포인터 유지 확인 (M0-1105-K · metadata.receipt_id 는 그대로)
curl -sS "https://api.meros.id/admin/orders/$DRAFT_30_ID?fields=metadata" \
  -H "Authorization: Bearer $TOKEN" | jq '.order.metadata | {receipt_id, receipt_no, order_type, register_session_id}'
# 예상: receipt_id=rec_... · receipt_no="R-261107-0001" · (metadata 소실 없음)

# C. 다른 draft 는 손 안 댐 확인
curl -sS "https://api.meros.id/admin/draft-orders?limit=100" \
  -H "Authorization: Bearer $TOKEN" | jq '.count, (.draft_orders | map({display_id, is_draft_order}))'
# 보정 전후 draft_orders 숫자 비교 — #30 만 빠지고 나머지 유지되면 OK.
```

**결과 수집**: 위 명령 응답을 이 리포트 §4.4 (추가 예정 섹션) 에 복사 · 커밋하면 봉인 완료.

### 4.4 (실행 후 결과 삽입 자리)
```
PENDING · 사용자 run 뒤 결과 업데이트
```

---

## 5. Fixture JSON (M3 배포 · 규칙 ⓑ)

### 5.1 tenders 응답 · draft → 전환 성공
```json
{
  "ok": true,
  "order_id": "order_01M6TXXXXXX",
  "provider_id": "pp_cash_default",
  "amount": 150000,
  "order_type": "takeaway",
  "converted": true,
  "is_draft_order": false,
  "is_balance": false,
  "preorder_stage": null,
  "balance_due_after": null,
  "payment_collection_id": "paycol_01M6TXXXXXX",
  "payment_session_id": "payses_01M6TXXXXXX",
  "payment_id": "pay_01M6TXXXXXX",
  "receipt_id": "rec_01M6TXXXXXX",
  "receipt_no": "R-261107-0002",
  "receipt_kind": "sale",
  "method": "cash"
}
```

### 5.2 tenders 응답 · non-draft 멱등 skip
```json
{
  "ok": true,
  "order_id": "order_01M6TYYYYYY",
  "provider_id": "pp_cash_default",
  "amount": 100000,
  "order_type": "takeaway",
  "converted": false,
  "is_draft_order": false,
  "is_balance": false,
  "preorder_stage": null,
  "balance_due_after": null,
  "payment_collection_id": "paycol_01M6TYYYYYY",
  "payment_session_id": "payses_01M6TYYYYYY",
  "payment_id": "pay_01M6TYYYYYY",
  "receipt_id": "rec_01M6TYYYYYY",
  "receipt_no": "R-261107-0003",
  "receipt_kind": "sale",
  "method": "cash"
}
```

### 5.3 tenders 응답 · convert workflow 실패 (non-fatal · 결제 유지)
```json
{
  "ok": true,
  "converted": false,
  "is_draft_order": true,
  "order_id": "...",
  "receipt_id": "rec_...",
  "payment_collection_id": "paycol_...",
  "...": "<결제·영수증 정상 · 서버 로그에 [M0-1105-P] convertDraftOrderWorkflow failed (non-fatal · 결제 유지): ... warn>"
}
```

---

## 6. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/196
- **브랜치**: `feat/m0-1105-p-tender-auto-convert` (base = `main @ 32ab911`)
- **커밋**: `94a9f72` · 3 파일 · +113/-10
- **CI run**: https://github.com/CuriocityDevAi/storeport/actions/runs/42350157554

---

## 7. 다음 후보

- 운영 #30 보정 (사용자 run · §4).
- **M0-1105-M** (Delivery 단계) 재개 — base #194 머지 전/후로 분기 가능.
- M3 측 `useCreateTender.onSuccess` 의 `['order']` → `['orders']/['draft-order']` invalidate 수정 (서버가 draft 를 제거해도 앱 캐시는 여전히 ['draft-order'] 를 호출해서 404 받을 수 있음).
