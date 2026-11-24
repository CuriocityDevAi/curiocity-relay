CHANGES

# R0-1124-AF — PR #421 재리뷰 (d94eb52 · M0-1124-K 반영분)

- PR: https://github.com/CuriocityDevAi/storeport/pull/421
- HEAD: d94eb52659be28c3b1c592f9c1a41f8496701901
- 판정: **CHANGES** (COMMENT 제출)

---

## R0-1124-AC CHANGES 해소 여부

### ✅ #1 — refund custom_display_id 전달 (R0 지적 vs M0 반박 · 코드 판정)

**R0-1124-AC 지적:** `refund/route.ts` buildSnapshot 호출부에서 `custom_display_id`가 직접 전달되지 않는다.

**M0-1124-K 반박:** `refund/route.ts`는 `posRefundWorkflow`에 `order` 객체 전체를 전달하고,
`mint-receipt` 단계의 `mintRefundReceiptHandler`에서 `buildSnapshot`에 `custom_display_id`를 전달한다.
단위 테스트로 lockdown 추가.

**코드 판정 — M0가 맞다.**

경로 추적:
1. `refund/route.ts` → `posRefundWorkflow.run({ input: { ..., order, ... } })` — `order` 전체 전달
   (fields 에 `"custom_display_id"` 포함 조회 · 라인 ~127)
2. `mint-receipt.ts:mintRefundReceiptHandler` → `receiptSvc.buildSnapshot({ order: { ..., custom_display_id: (order as any).custom_display_id ?? null, ... } })`
   — 명시적 전달 확인 (SHA 85cc315f)

단위 테스트 3건 (`mint-receipt-custom-display-id.unit.spec.ts`) 올바르게 작성됨:
- ① "PIM26B1000" → `buildSnapshotFn.mock.calls[0][0].order.custom_display_id === "PIM26B1000"` ✅
- ② null → null 전달 ✅
- ③ 필드 미포함 → null 정규화 ✅

R0-1124-AC 지적은 `refund/route.ts` → 직접 buildSnapshot 경로를 추적했으나,
실제 경로는 route.ts → workflow → mint-receipt → buildSnapshot 이었음. **해소됨.**

---

### ✅ #2 — fallback 4 제거 · null · 테스트

**코드 확인:**

`reserve.ts` (SHA 613aac30): `resolveStockLocationIdForOrder`는 fallback 1 (metadata) →
fallback 2 (shipping_methods) → fallback 3 (sales_channel_stock_location 단일 링크) 까지만.
fallback 4 블록 (order_number_store 단일 닉네임 조회) **완전 제거 확인.**

단위 테스트 갱신 (`resolve-stock-location.unit.spec.ts`):
- "닉네임 1 개여도 (fallback 4 제거) → null" + `order_number_store` SQL 미호출 어서션 ✅
- "sales_channel 2 개 연결 → 모호 → null" ✅

통합 테스트 테스트 ④ 신설: metadata 없이 생성 + 닉네임 설정 → `custom_display_id = null` ✅

**해소됨.**

---

### ❌ #3 — d94eb52 CI 미트리거 (신규 CHANGES)

**배경:** R0-1124-AC #3의 "heavy-mac ⏭ skip → 통합 테스트 미검증" 우려는 M0 반박 기준으로
f5f0f04 heavy-cloud ✅ 15m 10s (통합 테스트 `order-number-receipt.spec.ts` PASS 12.029s) 에서
사실이 아닌 것으로 확인됨. heavy-mac ⏭ 는 cloud 배정 설계 그대로.

**그러나 신규 문제 발견:**

d94eb52 (2026-11-24 14:37 UTC push) 에 대한 GitHub Actions workflow run이 **0건**이다.

실측 (14:53 UTC · push 후 16분):
```
gh api repos/CuriocityDevAi/storeport/commits/d94eb52.../check-runs
→ {"total_count":0,"check_runs":[]}

gh api "repos/CuriocityDevAi/storeport/actions/runs?branch=fix/M0-1124-I-order-number-assign&per_page=5"
→ f5f0f04 (11:45 UTC) 가 마지막 run · d94eb52 run 없음
```

ci-summary 코멘트도 `f5f0f04 · 2026-11-24 13:38 UTC` 에서 갱신 없음.

REQ 지정 최대 15분 대기 경과 후에도 CI 미시작.

**영향:** d94eb52에서 추가된 신규 테스트 3건 (mint-receipt-custom-display-id · resolve-stock-location
fallback 4 제거 · order-number-receipt ④)이 CI에서 검증되지 않은 채 머지 대기 중.

**조치 필요:** 원인 조사 (self-hosted curiocity-mac-light 오프라인 가능성) + re-push 또는
workflow_dispatch force_cloud 로 CI 재트리거 → ci-summary ✅ 확인 후 재리뷰 요청.

---

## OK 항목

| 항목 | 결과 |
|---|---|
| refund/route.ts → posRefundWorkflow → mint-receipt → buildSnapshot 경로 | ✅ |
| custom_display_id ?? null 전달 · mint-receipt.ts 명시 | ✅ |
| mintRefundReceiptHandler 단위 export (lockdown 가능) | ✅ |
| 단위 테스트 3건 (값·null·미설정→null) | ✅ |
| fallback 4 블록 완전 제거 (reserve.ts) | ✅ |
| fallback 4 제거 단위 테스트 갱신 | ✅ |
| 통합 테스트 ④ (metadata 없이 → null) 신설 | ✅ |
| f5f0f04 heavy-cloud ✅ 15m 10s · 통합 테스트 PASS | ✅ |
| heavy-mac ⏭ = cloud 배정 설계 (R0 우려 사실 아님) | ✅ |
| d94eb52 CI 미트리거 (16분 경과 · run 0건) | ❌ |
