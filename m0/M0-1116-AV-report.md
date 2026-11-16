PR #321 · 정책 all-or-nothing on QRIS preflight · 앱 계약 변경 없음

---

## 변경 요약

- 서버 `/refund` 가 `method:'qris'` 를 수용 (400 거부 해제).
- QRIS 몫은 Medusa `refundPaymentWorkflow` 선행에 `tryXenditRefund` (공용 helper `_shared/xendit-refund.ts` 재사용 · 로직 복제 없음).
- Cash+QRIS 혼합 refund: QRIS 즉시 실패면 CASH 몫도 처리하지 않고 전체 400 `qris_refund_rejected` (돈 반만 나가는 상태 금지).
- 승인번호는 `card_terminal` 엔트리만 요구. `qris`/`cash` 에는 요구 금지.
- 앱 (fork) 수정 없음. 앱은 `tenders:[{method:'cash'},{method:'qris'}] + manager_pin` 그대로 송신.

## 정책

**all-or-nothing on QRIS preflight**. 설계 정본 `docs/plans/qris-split-refund-plan.md` §4-2 S3 ("QRIS 가 즉시 실패하면 현금 몫도 처리하지 말고 전체 400") 를 그대로 구현. `tender_results` 구조는 /refund 에 도입하지 않음 (현재 /return · /refund-retry 에만 존재 · 복잡도 최소화).

## 코드 변경

- `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts`
  - `RefundTenderEntry.method` 에 `'qris'` 추가 + 유효성 검사.
  - `allPayments[0]` → `paymentPacks` 전체 수집 + tender → pack 매칭 (같은 method 순서대로 소비 · multi-pack refund 지원).
  - QRIS preflight 블록 (`tryXenditRefund` 호출 · 결과 처리 /return §444-479 과 동일).
  - PIN·approval 검증 순서를 pack 매칭 앞으로 두어 기존 `tenders.spec #67` 메시지 (`manager_pin required`) 보존.
  - metadata.refund.tenders[].xendit = {refund_id, status, reference_id, payment_request_id} 저장 (webhook 이 최종 상태 업데이트).
  - 응답 `xendit_refund` (첫 QRIS 결과) 추가.
- `apps/commerce-core/integration-tests/pos/refund-qris-tender.spec.ts` (신규)

## 자기 검증

**Typecheck**: `pnpm typecheck` — refund/route.ts 신규 에러 0. 사전 존재 admin UI React 19 bigint JSX 에러 245건과 무관.

**신규 spec**: `TEST_TYPE=integration:pos npx jest refund-qris-tender` →
```
PASS integration-tests/pos/refund-qris-tender.spec.ts (11.769 s)
  ✓ #AV-1 cash+qris 전액 환불 → 200 · Cash Movement 1건(현금 몫) · Xendit /v3/refunds 1회(QRIS 몫) (1333 ms)
  ✓ #AV-2 cash+qris · QRIS 즉시 실패 → 400 qris_refund_rejected · Cash Movement 0건 · 현금 미처리 (1089 ms)
  ✓ #AV-3 qris 단독 전액 환불 → 200 · PIN 불요 · Xendit /v3/refunds 1회 (631 ms)
  ✓ #AV-4 card+qris · 승인번호 누락 → 400 · 승인번호 포함 → 200 (1599 ms)
Tests: 4 passed, 4 total
```

**회귀 (관련 refund 스펙)**:
- `tenders.spec -t "M0-1105-AJ"` (split tender S1–S4) — 12 passed, 0 failed.
- `refund-retry-qris.spec` — 7 passed, 0 failed.
- `refund-decision-bc.spec` — 3 passed.
- `refund-ghost-reservation.spec` — 5 passed.
- `refund-receipt-kind.spec` — 4 passed.
- `partial-refund-anytime.spec` — 3 passed.
- `void-refund-restock.spec` — 6 passed.
- 총 40 통과 · 0 실패.

**실행 로그**: 상동 jest 명령어. Xendit sandbox mock 만 사용 · 실 Xendit live 호출 0건.

## Kyu 확인 항목

- [ ] Cash+QRIS 주문 전액 Refund → PIN 입력 → 성공 응답 `{ok:true, refunded_amount:<total>, cash_movement_id:…, open_drawer:true, xendit_refund:{status:'SUCCEEDED'|'PENDING'}}`.
- [ ] 현금 서랍 안내 (open_drawer=true) + QRIS 몫 Pending→Succeeded (Xendit webhook 반영).
- [ ] 앱 쪽 M2-1116-AQ 반영 후 승인번호 입력 화면 나오지 않음.

## 상시 금지 준수

- `/tmp` 리포트 작성만 (dev 작업장 아님).
- 운영 SSH · railway CLI · 운영 DB 접근 없음.
- 실 Xendit live 호출 0건 (sandbox fetch mock).
- 앱 (fork) 수정 없음.
- `void/route.ts` 미수정 (R0 판정 유지).
- CI 대기 없이 바로 PR.
