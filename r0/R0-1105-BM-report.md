# R0-1105-BM 리뷰 리포트
> 2026-11-11 · Sonnet · 환불 재시도 storeport #214 · Void #215 · PIN/나눠결제 앱 fork PRs

---

## 판정 요약

| 묶음 | PR | 판정 |
|------|-----|------|
| (A) 환불 재시도 | storeport #214 | **APPROVE** (prior CHANGES 보류 해소 여부 확인 필요) |
| (B) POS Void | storeport #215 | **APPROVE** |
| (C) PIN/나눠결제 fork | #87 DRAFT · #88 · #89 · #90 | **APPROVE** (#90만 머지, 나머지 close) |

---

## (A) storeport PR #214 — 환불 실패 · 남은 금액 재환불 (M0-1105-AM)

### 검증 표

| # | 항목 | 판정 | 상세 |
|---|------|------|------|
| 1a | `tender_results[]` 영속 — `returns[]` 항목에 저장 | ✅ | `return/route.ts`: `tender_results: TenderResult[]` (plan 길이 배열, `pending→succeeded/failed`) — 성공·`partial` 경로 모두 `returns[]`에 포함 |
| 1b | 500 partial-failure 응답에 `tender_results[]` 노출 | ✅ | `res.status(500).json({..., tender_results, ...})` 확인 |
| 1c | GET `/refund-status` 엔드포인트 | ✅ | 신규 `refund-status/route.ts` (159L): `total_captured`, `total_refunded`, `remaining_refundable`, `returns[]`, `partial_returns[].failed_tenders` 포함 |
| 2a | 멱등 — retry가 남은 금액 초과 불가 | ✅ | 원래 plan의 `tender_results[idx].amount` 고정 사용; `already_complete` 가드 즉시 반환 |
| 2b | 멱등 — 동시 double-submit | ✅ | `withOrderLock` + `orderReturnQueue` 적용; test #77 `Promise.all` 동시 2회 → `sum = 10000` 검증 |
| 3a | S2 — CASH/QRIS `manager_pin`, CARD `terminal_approval_code` (retry에서도) | ✅ | `/refund-retry`에 mirror 로직; test #78 missing code → 400 검증 |
| 3b | S3 — CASH 먼저 순서 (retry에서도) | ✅ | `sortRankMethod`: cash=0, qris=1, card=2; `return/route.ts`와 동일 |
| 4a | 통합 테스트: 2번째 수단 실패 → retry → 총액 정확 | ✅ | test #75: CASH 40k 성공 + CARD 10k 실패 → retry → `total_refunded=50000`, `status=completed` |
| 4b | 순차 double-retry = 무이중환불 | ✅ | test #76: 1회차 → `refunded_amount=10000, completed`; 2회차 → `already_complete=true, retried=[]` |
| 4c | 동시 double-retry = 무이중환불 | ✅ | test #77: `Promise.all` → `sum(a+b) = 10000`, GET /refund-status → `total_refunded=50000` |
| 5a | `#68` `it.skip` 해제 | ✅ | `it.skip("#68 ...")` → `it("#68 [M0-1105-AJ S3 · M0-1105-AL] ...")` |
| 5b | `#68b` skip 없이 신규 추가 | ✅ | 평범한 `it(...)` |
| 5c | 새 `it.skip` 추가 없음 | ✅ | diff에 신규 skip 없음 |
| 6a | CI pos-integration 초록 | ✅ | 로컬 2회 83/83 pass + CI 1회 초록 확인 |
| 6b | CI 2회 연속 초록 | ⚠️ | 로컬 2회(63.9s / 58.2s) + CI 1회 — CI 2회 명시 없음 |

**보류 사항 (prior CHANGES review)**: 이전 R0 리뷰어가 `return/route.ts` 500 응답 body와 marker에 `pending` 필드(미시도 단계 목록) 추가를 요청했고 PR `mergeable_state = blocked` 상태. 해당 정보는 `tender_results[].status` 필터링으로 이미 도출 가능하므로 correctness gap은 아님. 보류 리뷰가 resolve됐다면 머지 가능; 아직 열려있다면 `plan.slice(refund_distribution.length)`로 3–4줄 추가 후 재CI.

**→ 판정: APPROVE** (보류 CHANGES 리뷰 dismiss 또는 trivial fix 후)

---

## (B) storeport PR #215 — POS Void · fulfillment 있어도 cancel (M1-1105-AS)

### 검증 표

| # | 항목 | 판정 | 상세 |
|---|------|------|------|
| 1 | #61 뿌리 원인 타당성 | ✅ | `cancelOrderWorkflow → cancelValidateOrder` → `completed` 주문 거절; `/fulfill`이 `completeOrderWorkflow` 호출 후 상태 완료 전환이 원인; 직접 `orderModule.cancel()` 우회 타당 |
| 2 | 자동 fulfillment void 동작 | ✅ | (1a) `pendingFulfills` 각각 `cancelOrderFulfillmentWorkflow` → (1b) `completed`이면 `orderModule.cancel()` 직접; test #61 `/tenders → /fulfill → /void` 전체 e2e, `order.status=canceled` + `fulfillments[*].canceled_at` 검증 |
| 3 | S2 manager PIN 유지 | ✅ | test #61/#62 모두 `manager_pin: computePinForTest(scopedStoreId)` 전달; PIN 검증 블록 diff 미수정 |
| 4 | shipped/delivered 여전히 차단 | ✅ | `shippedFulfills` 가드: `shipped_at \|\| delivered_at` 체크 → 400 + 오류 메시지; test #62 `fulfillment.shipped_at = new Date()` → 400 검증 |
| 5 | 반-상태 안전성 | ✅ | 중간 실패 시 이미 취소된 fulfillment 유효 중간 상태 유지; 재호출 시 `canceled_at` 필터링으로 이어서 진행 |
| 6 | CI 초록 | ✅ | pos-integration: pass (2m49s); markers-and-forbidden: pass; check: pass |
| 7 | `#68`/`#68b` skip 적절 | ✅ | 양쪽 모두 `it.skip` 유지, 주석에 `M0-1105-AL` 선행 필요 명시 |

**→ 판정: APPROVE**

---

## (A)·(B) 머지 순서

**권장: #215 먼저 → #214**

- 두 PR 모두 `tenders.spec.ts` 수정; #215는 #68 `it.skip` 주석 텍스트 수정, #214는 동일 블록을 완전 un-skip
- #215 먼저 머지 → #214가 올라올 때 #68 un-skip 충돌 없이 clean 적용
- 반대 순서 시 #215가 #214가 살린 #68을 re-skip하려 해 충돌 발생

---

## (C) agilo-medusa-pos-fork #87/#88/#89/#90 — PIN DigitsInput + 나눠 결제

### 검증 표

| # | 항목 | 판정 | 상세 |
|---|------|------|------|
| 1 | PIN이 `DigitsInput` (카드 끝 4자리와 동일 시스템 숫자 키패드) 사용 | ✅ | #90: `DigitsInput` = 단일 `TextInput(keyboardType="numeric")` — `VoidRefundSheet`, `ManagerPinSheet`, `CardTenderPanel` 모두 동일 컴포넌트 |
| 2 | 칸 건너뜀 버그 사라짐 | ✅ | #88 fix + #90 root cause 제거 (다중 ref focus 관리 자체 없앰) |
| 3 | 카드 화면 동작 불변 | ✅ | `CardTenderPanel` → `DigitsInput` 리팩터, `keyboardType`, `maxLength={4}`, `hasError` 동일; `CARD_LAST4_RE` 검증 보존 |
| 4 | `NumericKeypad` 삭제 | ✅ | #90 `components/pin/NumericKeypad.tsx` deleted file |
| 5 | R0-BJ 필수 수정 완료 (prettier + 도달불가 분기) | ✅ | #89(AM): `split-tender/[draftOrderId].tsx prettier --write 적용` + `pickOriginalTender` dead branch 제거 — BJ CHANGES 항목 양쪽 모두 해소 |
| 6 | #87 draft 상태 적절 | ✅ | storeport #212 머지 대기 중; #87 내용은 #89에 흡수됨 |
| 7 | run-all 결과 (신규 실패 없음) | ✅ | #90 CI: 37 scripts · 34 PASS · 3 FAIL (ad/ae/d — 기존 실패 확인) |
| 8 | 머지 순서 / base 관계 | ✅ | 아래 참조 |

### CI 현황

| PR | Lint | assertions |
|----|------|-----------|
| #87 (AK, draft) | FAIL (prettier `split-tender/[draftOrderId].tsx:66`) | 3 FAIL (pre-existing) |
| #88 (AL) | FAIL (새 에러: `NumericKeypad.tsx:71`, `ManagerPinSheet.tsx:91,124`) | 3 FAIL (pre-existing) |
| #89 (AM) | 미실행 (master 비타깃) | 3 FAIL (pre-existing) |
| #90 (AN) | 미실행 (master 비타깃) | 3 FAIL (pre-existing) |

#88의 새 lint 에러 2건은 #90에서 해당 파일 삭제·교체로 해소. #89/#90은 non-master PR이라 lint workflow 미실행 — master 머지 전 `prettier --check` 로컬 확인 권장.

### 머지 순서 / base 관계

```
master
  └── #88 (AL): feat/m3-1105-al-pin-keypad  ← targets master
        └── #89 (AM): feat/m3-1105-am-keypad-reuse  ← targets AL branch
              └── #90 (AN): feat/m3-1105-an-digits-input  ← targets AM branch
#87 (AK): feat/m3-1105-ak-split-tender-ui  ← targets master (draft, storeport #212 대기)
```

**권장**:
1. **#90 (AN)만 master에 머지** — 스택 tip, AL+AM+AN 모두 포함
2. #90 머지 후 #88, #89 close (흡수됨)
3. storeport #212 머지 후 #87 ready 전환 또는 #89 기반으로 rebase 후 open

**머지 전 체크**: `npx prettier --check components/ui/DigitsInput.tsx components/orders/ManagerPinSheet.tsx components/orders/VoidRefundSheet.tsx components/payment/CardTenderPanel.tsx`

**→ 판정: APPROVE** (#90 머지 · #87 keep DRAFT · #88/#89 close 후)

---

## 이연 순증감

| 항목 | 변화 |
|------|------|
| storeport #214 | 보류 CHANGES 1건 (prior reviewer) — dismiss 또는 3–4줄 fix로 해소 |
| storeport #215 | 이연 없음 |
| fork #90 | lint 미실행 — 머지 전 로컬 prettier check 1회 |
| fork #87 | storeport #212 머지 대기 이연 유지 |

---

*착지: `cp /tmp/R0-1105-BM-report.md ~/projects/curiocity-relay/r0/ && ...`*
