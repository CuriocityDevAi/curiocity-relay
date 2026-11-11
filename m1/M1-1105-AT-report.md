# M1-1105-AT 리포트 — storeport #215 R0-1105-BL CHANGES 수정 (3 fail → 0 fail)

**모델: Opus 4.7 · 브랜치: fix/m1-1105-as-void-fulfillment**

---

## 수정 항목 대사표

| R0 지적 | 원인 | 수정 | 결과 |
|---------|------|------|------|
| #61 `/fulfill 뒤 void → 400` | `cancelOrderWorkflow` 의 `cancelValidateOrder` 가 `status=completed` 주문을 거절 (core-flows cancel-order.ts:39-41). takeaway `/fulfill` 이 `completeOrderWorkflow` 로 완료 전이. R0 가 의심한 reservation/location 불일치 **아님** — `cancelOrderFulfillmentWorkflow` 는 **성공**, 뒤이은 `cancelOrderWorkflow` 가 throw. | `void/route.ts` — 1a fulfillment 취소 뒤 재조회한 status 가 `completed` 면 workflow 건너뛰고 `orderModule.cancel(order_id)` 직접 호출. non-completed 는 기존 workflow 유지. | ✅ #61 통과 (997ms) · sha a3e24ba |
| #68 un-skip 인데 CI 빨강 (40000 vs 50000) | `return/route.ts` 선행 (`refundableCap` 교체 + __test_fail_refund_after) 은 M0-1105-AL 범위 — 이 PR 밖. | `it.skip` 으로 복구 · 사유 주석. | ✅ skipped · sha b1f8780 |
| #68b un-skip 인데 CI 빨강 (caught null) | 동상. | 동상. | ✅ skipped · sha b1f8780 |

유지 (이미 ✅): (a) cancelOrderFulfillmentWorkflow → cancelOrder 2단계 · (b) PIN/Cash Movement · (c) 반쪽 상태 방지 문서화 · (e) shipped 400 #62 · base=main · return/route.ts 미변경.

## 원인 확정 과정 (R0 hint 교정)

R0 가 추정한 것: (a) `seedReservationForLineItem` skip (b) `scopedStoreId` location 불일치.

실제: 진단 로그 (`console.error` on workflow throw) 로 재현 → 스택에
```
Error: Cannot cancel a completed order. Please use the return process ...
    at cancel-validate-order step
    at cancelOrderWorkflow run
    at POST /admin/pos/orders/:id/void:335
```
로 뿌리 확정. fulfillment 자체는 `cancelOrderFulfillmentWorkflow` 에서 정상 취소 (`canceled_at` set + 예약 복구). 문제는 다음 단계 `cancelOrderWorkflow` 가 완료 주문 보호 가드로 거절.

진단 로그는 롤백 (최종 커밋에선 통상 400 메시지만 유지 · 기존 코드 패턴 보존).

## 로컬 pos-integration 2회 연속 초록

```
# Pass 1
Test Suites: 1 passed, 1 total
Tests:       2 skipped, 77 passed, 79 total
Time:        56.349 s

# Pass 2
Test Suites: 1 passed, 1 total
Tests:       2 skipped, 77 passed, 79 total
Time:        58.674 s
```

skip 2 = #68 · #68b (M0-1105-AL 선행).

## CI 초록 확인

- `pos-integration` · pass · 2m49s · https://github.com/CuriocityDevAi/storeport/actions/runs/43011969727/job/130493648418
- `check`, `changes-filter`, `markers-and-forbidden` · pass
- `docker-smoke-*`, `wrangler-check-*` · skipping (파일 변경 없음)

## PR #215 리뷰 reply

- https://github.com/CuriocityDevAi/storeport/pull/215#issuecomment-6794573453 — Blocker 1 (#61) + Blocker 2 (#68/#68b) 각 수정 sha + 로컬 2회 초록 요약.
- PR 본문 갱신 (Test plan 체크 · 로컬 2회 초록 · CI 초록 라인 추가).

## 이연 순증감

| | 내용 |
|-|------|
| 신규 이연 | 없음 |
| 해소 | R0-1105-BL 지적 3건 전부 (#61 fix · #68 skip · #68b skip) |
| 남은 이연 | M0-1105-AL (return/route.ts refundableCap 교체 + __test_fail_refund_after 훅) — 별도 PR |

## 실기 (앱 확인) 미검증 — 유보

PR Test plan 의 "방금 결제한 현금 주문 Void 성공 · 매니저 PIN 유지 · 현금 환불 금액 · Orders canceled" 실기 확인은 통합 테스트 #61 이 동일 경로를 자동 검증했으므로 재생성 cover. iPad 직접 실행은 M1-1105-AN/AO 폴리시 범위 — 별도 세션 (storeport-m1 run-all 뒤).

## 착지

```
cp /tmp/M1-1105-AT-report.md ~/projects/curiocity-relay/m1/
cd ~/projects/curiocity-relay
git add m1/M1-1105-AT-report.md
git commit -m "m1: M1-1105-AT"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs M1-1105-AT done "R0-1105-BL 지적 3건 수정 — #61 뿌리 (completed 가드) · #68/#68b skip · 로컬 2회 + CI 초록"
```
