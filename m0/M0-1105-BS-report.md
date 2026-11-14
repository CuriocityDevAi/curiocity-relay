# M0-1105-BS 리포트 — 나눠결제 QRIS R1 · 서버 split 가드 조건부 해제 + tender 상태 필드

**결과**: ✅ 통과 · 서버 단독 · Kyu 실기 없음 (R3 앱 뒤).
**PR**: https://github.com/CuriocityDevAi/storeport/pull/248 (draft · base main · 머지는 Kyu 승인 뒤)
**브랜치**: `feat/m0-1105-bs-qris-split-tender-status` (origin/main 분기 · 2 commits)
**commits**:

- `7a232ed` feat(pos): QRIS × split tender R1 — qris_split_not_supported 가드 조건부 해제 + metadata.tenders status 필드
- `7a58622` fix(pos): tender append 매치 — expired/failed entry 는 skip 해 새 entry 로 추가 (BS-d 수정)

---

## 건드린 파일 (허용 범위 안)

1. `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` — 가드 재설계 · metadata.tenders status 필드 도입.
2. `apps/commerce-core/src/api/hooks/payment/xendit/route.ts` — paid 블록 (status patch + is_complete 게이트) · expired/failed 블록 (status patch helper). refund 핸들러 블록 **미변경** (R2).
3. `apps/commerce-core/integration-tests/pos/tenders.spec.ts` — #69b 교체 + 신규 `M0-1105-BS` describe (4 테스트).

환불 경로 (`return/route.ts` · `refund/route.ts` · `refund-retry/route.ts`) · 앱 (fork) 파일 · migrations · workflow — **전부 미변경** (상시 금지 규약 준수).

---

## [REQ] 체크

| # | 요구                                                                                          | 반영                                                                                                                                                                                                                                                                                                      |
| - | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `qris_split_not_supported` 가드 조건부 해제                                                   | ✓ 기존 400 가드 삭제 · 신규 409 `qris_pending_cannot_split_next` 로 교체 — 직전 active tender.method==="qris" && status!=="captured" 일 때만 거부. 1차 QRIS · 1차 CASH/CARD+2차 QRIS · 양쪽 QRIS 모두 허용 (Q1/Q2).                                                                                        |
| 2 | `metadata.tenders[idx].status` 신설                                                           | ✓ 타입 `"pending" \| "captured" \| "expired" \| "failed"`. CASH/CARD append 에 `status:"captured"` + `captured_at` 고정. QRIS short-circuit 직전에 `status:"pending"` entry 선 append (webhook 매칭 키 = `payment_request_id` + `payment_collection_id`). 기존 주문 (status 필드 없음) 은 captured 로 간주 (후방 호환). |
| 3 | tender count 보정 (Q6)                                                                        | ✓ `activeTenderStatus` + `isActiveTender` helper · `paidSoFarBefore` / `tenderCountBefore` 는 status ∈ {captured, pending} 만 셈 · S1 max 2 하드캡도 active 기준.                                                                                                                                       |
| 4 | 웹훅 paid → captured patch · 중간 tender 는 영수증 mint·draft→order 전환 없음                 | ✓ paid 블록: 매칭 후 `status="captured"` patch · `pos_totals.grand_total` 대비 captured 합계로 `is_order_complete` 산출 · 완결일 때만 영수증 mint + convert. 응답에 `is_order_complete` / `tender_status_patched` 추가. 영수증 tender list 는 `metadata.tenders` 기반으로 재구성 (복수 tender 수단 분해 유지). |
| 5 | QRIS 만료/실패 → status expired/failed patch                                                  | ✓ expired/failed 블록에 `patchMetadataTenderStatus` helper 호출. 미구현 아님 (expired · failed 둘 다 처리). Xendit v3 payment_requests 의 `payment.expired`·`payment.failed` 이벤트 수신 경로는 `webhook/lib/webhook.ts` 가 이미 지원 중 (M0-1105-BE 완료).                                                   |
| 6 | 통합 테스트 (#69b 교체 + 신규)                                                                | ✓ 아래 테스트 리스트 참조.                                                                                                                                                                                                                                                                             |

---

## 통합 테스트 (요구 a~e + 추가 회귀 가드)

**#69b 교체**: `[M0-1105-BS] 1차 CASH captured → 2차 QRIS split 허용 (qris_split_not_supported 해제)` ✓ · 기존 `qris_split_not_supported` 400 code 가 사라졌음을 metadata.tenders 영속으로 가드.

**M0-1105-BS describe** (4 건 · 전부 통과):

| #     | 시나리오                                                                                        | 핵심 가드                                                                                   |
| ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| BS-a  | 1차 CASH 50k + 2차 QRIS 50k close-out → simulate paid → 영수증 1매                             | `is_order_complete=true` · `receipt_id` 유효 · `converted=true` · metadata.tenders 2건 다 captured |
| BS-b  | 1차 QRIS PENDING 중 2차 요청 → 409 `qris_pending_cannot_split_next` → paid 뒤 2차 CASH → 완결 | 409 code 정확 · webhook paid 뒤 2차 CASH tender_sequence=2 · receipt_kind="sale"            |
| BS-c  | 양쪽 QRIS 50k+50k → 1차 paid 는 receipt 미발행 · 2차 paid 는 발행                              | 중간 tender `is_order_complete=false` · `receipt_id=null` · `converted=false` (영수증 mint·convert 없음을 명시 가드) |
| BS-d  | 1차 QRIS expired → active count 제외 → 신규 CASH 전액 (non-split 100k) → 완결                 | metadata.tenders=[qris:expired, cash:captured] 2건 보존 · 재고 2개 한도 유지                |

**회귀 유지**: #1~#46 · #44~#82 (void/refund) · #54~#60 (return) · #61~#65 (delivery 가드) · #66~#69 (AJ S1·S2·S3·S4) · #69b 교체 · #70~#71 (AK Bug 1/2) · #74~#79 (AM retry) — **93/93 통과**.

---

## 자기 검증 결과

### 로컬 `pnpm --filter commerce-core test:integration:pos` (최종 통과)

```
PASS integration-tests/pos/tenders.spec.ts (68.586 s)              → 93 passed
PASS integration-tests/pos/pos-tax-lines.spec.ts (14.925 s)        →  9 passed
PASS integration-tests/pos/p6-e2e.spec.ts (19.002 s)               → 10 passed
PASS integration-tests/pos/refund-ghost-reservation.spec.ts (12.178 s) → 5 passed
PASS integration-tests/pos/pos-qris-simulate.spec.ts (14.492 s)    → 12 passed
PASS integration-tests/pos/refund-receipt-kind.spec.ts (11.733 s)  →  4 passed
합계 : 133/133 passed
```

중간 라운드에서 `#BS-d` 가 "metadata.tenders.length=2 기대, 실제 1" 로 실패했었다 → 원인: PaymentCollection 재사용 경로가 1차 QRIS expired entry 를 2차 CASH entry 로 overwrite (findIndex 매치가 terminal 상태를 구분 안 함). 수정 commit `7a58622` 로 match 조건에 `status not in {expired, failed}` 를 추가해 terminal 이력을 보존하면서 새 entry append. 재실행 → 전수 통과.

### CI (PR #248 · HEAD `7a58622`)

| Job                     | 결과     | 시간    |
| ----------------------- | -------- | ------- |
| changes-filter          | pass     | 6s      |
| check                   | pass     | 12s     |
| markers-and-forbidden   | pass     | 7s      |
| unit-commerce-core      | pass     | 53s     |
| **pos-integration**     | **pass** | **4m36s** |
| docker-smoke-anchor     | skipping | -       |
| docker-smoke-commerce-core | skipping | -    |
| docker-smoke-wing       | skipping | -       |
| wrangler-check-care-agent | skipping | -     |

→ **전 job green**.

---

## 선택지 / 채택 / 이유 (PR 본문 요약)

- (a) Medusa `PaymentCollection` × 2 유지 + 가드 조건부 해제 — **채택**
- (b) PC 1 개 안에 session × 2 — 미채택. 이유: 코어 session 간 정산 로직을 자체 보강해야 하고 tender_sequence SoT 를 재설계해야 함 · split 기존 테스트 (AJ S1~S4) 를 전면 수정 필요. (a) 는 기존 S1~S4 가드와 `metadata.tenders` SoT 를 그대로 유지하면서 가드 1 지점만 재설계해 테스트 리스크 최소 (계획서 §2 매트릭스).

---

## 이연 (R2 몫 · 본 라운드에서 미수행)

- `/refund-retry` `mode` 분기 (retry · cash_fallback) · QRIS retry `tryXenditRefund` 호출 — 계획서 §5-2.
- webhook refund 핸들러에 `withOrderLock` 감쌈 + 가드 2 (§5-3 · dup_refund_alerts).
- R2 integration test `refund-retry` + webhook race fixture.

**이연 순증감**: **+3** (R2 세 항목 신규 디스패치 대기 · R3 UI 는 R2 뒤).
