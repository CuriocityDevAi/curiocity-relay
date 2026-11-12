# R0-1105-CU 보고서

원장 대사: decision-qris-20261112 · 계획서 §J-c·J-d

---

## PR #228 (M0-1105-BC+BE) · feat/m0-1105-bc-qris-xendit-server

**판정: APPROVE**  
REQ1·REQ2 필수 2건 해소 확인. L1~L3·503 처리. CI 43200084894 green (headSha 06b6ab2).

### 검증 표

| 항목 | 확인 위치 | 결과 |
|---|---|---|
| REQ1 · 동시 paid 이중 처리 차단 | `webhook.ts:165-247` · `route.ts:234-296` | ✅ UPDATE CAS (`WHERE NOT data?'webhook_claim'`) · unit Promise.all 테스트 1건만 true |
| 동시성 테스트 경합 재현 여부 | `qris-xendit.unit.spec.ts` | ⚠️ fake pg mock으로 logical contract 검증. 실 Postgres 경합은 DB 행 직렬화(UPDATE row lock)가 보장 — unit 한계는 허용 범위 |
| REQ2 · 전체 테이블 조회 제거 | `webhook.ts:208-224` | ✅ raw SQL `data->>'payment_request_id'` 직조회 |
| L1 · sha256 timingSafeEqual | `webhook.ts:57-73` | ✅ 양쪽 sha256(32B) → timingSafeEqual |
| L2 · split+QRIS → 400 | `tenders/route.ts:379-391` | ✅ code=qris_split_not_supported |
| L3 · captured 후 expired/failed 덮어쓰기 금지 | `route.ts:194-204` | ✅ alreadyCaptured → updatePaymentSession 생략 · 200 idempotent |
| REQ6 · 503 미설정 | `route.ts:74-80` | ✅ `service_unavailable` |
| CI | 43200084894 success · headSha 06b6ab2 | ✅ |

---

## PR #229 (M0-1105-BD) · feat/m0-1105-bd-qris-xendit-refund-cancel

**판정: APPROVE (notes 포함)**  
5개 중점 항목 모두 패스. 로컬 84/84 · tsc 0 error. whole-table scan 1건 known-deferred.

### 검증 표

| 항목 | 확인 위치 | 결과 |
|---|---|---|
| **(a)** Xendit 실패 시 Medusa refund 미기록 | `return/route.ts` QRIS 선행 블록 | ✅ `tryXenditRefund(!ok)` → 400 return · refundPaymentWorkflow 호출 전 분기. 경로 0 확인 |
| **(b)** PENDING → webhook 확정 경로 | `route.ts:handleRefundWebhook` | ✅ metadata.returns[].xendit.status PENDING→SUCCEEDED/FAILED 전환. refund_id dedup key로 멱등 |
| **(b)** refund webhook 멱등 | `handleRefundWebhook` `x.status === newStatus` guard | ✅ 동일 status 재수신 → alreadyCount++ · no-op |
| **(c)** cash fallback 400 충분성 | `return/route.ts` 400 응답 shape | ✅ `{type:'qris_refund_rejected', fallback:'cash', reason, failure_code, message, order_id}` — 앱 재호출에 충분 |
| **(d)** Void QRIS cancel 실패 → void 완료 | `void/route.ts` 1a-3 블록 | ✅ 개별 `catch(e)` → qrisCancellations[].error 기록 · non-fatal. 외부 try도 warn-only |
| **(e)** 현금·카드 return/void 경로 무변경 | `return/route.ts` · `void/route.ts` | ✅ QRIS 로직은 `method==='qris'` 가드 안 · cash/card 분기 미변경 |
| 테스트 | 84/84 pass · tsc 0 · naming 0 | ✅ |
| CI | base=BC 브랜치 미트리거 · 로컬 수동 확인 | 로컬 OK (CI는 BC→main 후 자동 실행 예정) |

**Note 1** (`handleRefundWebhook` whole-table scan):  
`filters: {}` 전체 order 조회. 명시적 known-deferred (보고서 "후속 라운드에서 index 최적화"). 환불 webhook 빈도는 낮아 비치명이나 운영 성장 시 추적 필요.  
파일:줄 → `apps/commerce-core/src/api/hooks/payment/xendit/route.ts` 내 `handleRefundWebhook` 상단 `query.graph({ entity:'order', filters:{} })`

**Note 2** (PENDING+Medusa record 후 refund.failed 수신):  
Xendit PENDING → Medusa refund row 기록 → webhook refund.failed → `xendit.status=FAILED` + `r.status='qris_refund_failed'`. Medusa refund row는 돌릴 수 없으므로 앱이 "남은 금액 다시 환불"을 안내해야 함. decision-refund-failure-20261111 A안 · 본 라운드 범위 밖 · 추적 필요.

---

## 머지 순서 제안

1. **#228 먼저 머지** (base=main · mergeable_state=clean · CI green).
2. **#229 base → main 재지정** 후 CI 확인 (현재 base=feat/m0-1105-bc-qris-xendit-server · CI 미트리거).
3. #229 CI green 확인 후 머지.
