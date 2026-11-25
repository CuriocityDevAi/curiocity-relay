PASS

# M0-1125-K — QRIS pre-paid cancel + CD snapshot Rp NaN 수정

## 원장 대사
ledger/decision-qris-cd-flow-20261125.md · **Q3 (서버)** · **Q4** · R0-1125-U · Hub 2 ("storeport 서버") 표.

## PR
- https://github.com/CuriocityDevAi/storeport/pull/438
- Branch: `feat/M0-1125-K-qris-cancel-and-cd-nan`
- Commit: `251dab8`
- Base: `origin/main` @ `23c9679`
- 셀프 머지 안 함.

## 변경 (9 files · +1112 / −44)

| 파일 | 내용 |
|---|---|
| `apps/commerce-core/src/lib/customer-display/snapshot-item.ts` | 신규. `toSnapshotNum` (BigNumber({numeric_}) · string · bigint · number · null 안전 파서) · `CdSnapshotItem` 타입 · `toCdSnapshotItem` 변환기. |
| `apps/commerce-core/src/lib/customer-display/__tests__/snapshot-item.unit.spec.ts` | 신규. 파서 · 변환기 유닛 테스트. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` | 로컬 `toNum` 제거 · 공용 helper 로 통일. 두 CD snapshot upsert 경로 (QRIS short-circuit + cash/card) 를 `line_total` → `total` (CdSnapshotItem) 로 수정. Receipt 발행 경로는 `OrderLineForReceipt[]` 타입 어노테이션으로 pin (의도적으로 `line_total` 유지). |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/__tests__/snapshot-total-field.unit.spec.ts` | 신규. 소스 레벨 grep 회귀 가드. tenders 에 `line_total:` 가 2건 이상이면 FAIL. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/checkout-snapshot/route.ts` | 로컬 `toNum` 제거 · 공용 helper 사용. `snapItems` 에 `CdSnapshotItem[]` 타입 명시. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-cancel/route.ts` | 신규. POST 엔드포인트. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-cancel/__tests__/route.unit.spec.ts` | 신규. 5 cases. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-pending/route.ts` | 신규. GET 엔드포인트. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-pending/__tests__/route.unit.spec.ts` | 신규. 6 cases. |

## 돈 안전 경로 (Q3 · qris-cancel)

1. **Capture 선검사.** cancel 시도 전 `order.payment_collections.payments.captures` 를 조회 — 하나라도 있으면 **cancel 하지 않고** `{ status: 'paid' }` 반환. POS 는 성공 화면으로.
2. **Pending QRIS session 만 cancel.** `pp_xendit_qris_` prefix + status ≠ `captured|canceled` + `xendit_status ≠ EXPIRED|CANCELED|FAILED|SUCCEEDED|CAPTURED|PAID` 인 session 수집 후 `paymentModule.cancelPaymentSession(id)` 호출. provider.cancelPayment 가 내부에서 Xendit `cancelPaymentRequest` 수행.
3. **Cancel 후 webhook race 재확인.** cancel 직후 `query.graph` 로 fresh capture 재조회. 있으면 응답을 **`{ status: 'paid' }` 로 뒤집음** — webhook 이 이긴다.
4. **멱등.** 2회 호출 시 1회차 cancel 후 pending 없음 → `{ status: 'expired', canceled: [] }`. Xendit 쪽 이미-canceled 는 provider 가 silently 흡수.
5. **Manager PIN 불필요.** 결제 전 QR 취소는 돈이 오가지 않음 (void/refund 와 구분).

## 새 API 명세

### POST `/admin/pos/orders/:id/qris-cancel`
- Body (optional): `{ payment_collection_id?: string, payment_request_id?: string }` — 특정 PC/PR 만 좁혀서 취소하고 싶을 때.
- Response 200: `{ ok: true, order_id, status: "paid" | "expired", canceled: Array<{ session_id, payment_request_id, xendit_status, error? }> }`
- Response 404: order 없음.

### GET `/admin/pos/orders/:id/qris-pending` (M3 '이어하기' 용)
- Response 200 (pending 있음): `{ ok: true, order_id, status: "pending", qr_string, payment_collection_id, payment_session_id, payment_request_id, expires_at, amount }`
- Response 200 (없음): `{ ok: true, order_id, status: "none" }`
- Response 404: order 없음.
- 선택 규칙: `pp_xendit_qris_` + session.status ∉ {captured, canceled} + xendit_status 은 pending 범주 + qr_string 보유. 복수면 updated_at desc.

## 테스트 로그

### 신규 유닛 (25 tests · 4 suites)
```
PASS src/api/admin/pos/orders/[id]/qris-cancel/__tests__/route.unit.spec.ts
PASS src/api/admin/pos/orders/[id]/qris-pending/__tests__/route.unit.spec.ts
PASS src/lib/customer-display/__tests__/snapshot-item.unit.spec.ts
PASS src/api/admin/pos/orders/[id]/tenders/__tests__/snapshot-total-field.unit.spec.ts

Test Suites: 4 passed, 4 total
Tests:       25 passed, 25 total
```

### 전체 회귀 (`pnpm --filter commerce-core test`)
```
Test Suites: 65 passed, 65 total
Tests:       715 passed, 715 total
Snapshots:   18 passed, 18 total
Time:        31.638 s
```

### 검증 집합
- `pnpm --filter commerce-core typecheck` → 에러 0.
- `pnpm --filter commerce-core lint` → 신규 error 0 (기존 warning 9 변화 없음).
- `bash scripts/naming-check.sh` → PASS.
- `node scripts/feature-map-check.mjs` → scanned 1308 · unmatched 0 (0.0%).
- pre-commit (lint-staged + naming) · pre-push (full 715 유닛) 통과.

## 큐 금지 조항 준수
- Admin **pos-settings** · **customer-display** 앱 수정 없음.
- 프로덕션 DB · Railway · SSH 접촉 없음.
- 커밋 메시지 느낌표 없음. --no-verify 미사용. --force 미사용.
- 리포트는 이 파일 1회만 작성 (worktree 안에는 리포트 작성/커밋 없음).
- 러너 폴더 (~/projects/curiocity-relay) 수정 없음. 모든 작업 ~/projects/curiocity-relay-wts/M0-1125-K.

## 큐 해석 메모
큐가 명시한 세 라인 `tenders/route.ts 1054 · 1190 · 1369`:
- **1054, 1190** = CD snapshot upsert (QRIS short-circuit · cash/card). `line_total` → `total` 로 수정 ✓.
- **1369** = Receipt pipeline (`receiptSvc.buildSnapshot` 의 입력). 타입이 `OrderLineForReceipt.line_total` 이므로 `line_total` 이 정본이다 (CD 는 이 값을 `receipt.items` 밑에서 `ReceiptItem.line_total` 로 읽는다 — 공용 타입에서 명시). 그 라인은 **배열 타입 어노테이션** 으로 pin 만 하고 필드명은 유지. "필드명 불일치가 컴파일 에러" 요구는 CD(`total`) · Receipt(`line_total`) 두 타입을 각각 어노테이션으로 pin 하는 것으로 충족.
