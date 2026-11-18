#372 APPROVE · 수정 되돌리면 테스트 실패 O

## 판정

**APPROVE** — 버그 수정 로직 정확, 사이드 이펙트 없음, regression guard 작동 확인.

## REQ-1 · fetchFields 추가 + fulfillment-cancel.ts 제거

**return/route.ts** (line 274)  
`"items.detail.quantity"` 추가 위치: `query.graph` fetchFields 블록 (263–278). `items.quantity`와 나란히 요청되어 Medusa v2 computed field 가 채워지는 패턴 — #365 fulfill 수정과 1:1 동일. 로직 흐름:
```
items.detail.quantity 포함 →
  ori.quantity = N (정상) →
  oriQty = N → share = req/N → refundAmount = 올바른 금액
```

**fulfillment-cancel.ts** (line 116–120)  
`"items.quantity"` 제거. 본문에서 `fi.quantity`를 사용(lines 193, 213)하지만, 이는 `for (const fi of ful.items)` — fulfillment 항목, 즉 `fulfillments.items.quantity` (line 129)에서 온다. `order items.quantity`는 함수 본문 어디서도 읽히지 않음. 제거가 다른 동작을 바꾸지 않는다. ✓

## REQ-2 · 수정 되돌리면 테스트 실패 여부

fix 되돌려 테스트 실행 결과: **Tests: 1 failed, 2 passed**

실패한 테스트는 **#G-1** (not #G-2 as PR body says).

- #G-1 (regression guard): `graphCalls[1].fields`에 `items.detail.quantity` 포함 확인 → fix 없으면 field 배열에 없어 **실패** ✓
- #G-2 (정상 산정): mock이 항상 `quantity: 2`를 반환하도록 설계됐으므로 fix 되돌려도 통과. 이는 mock 계층의 한계 — query.graph mock이 실제 Medusa field 필터링을 모사하지 않음.
- #G-3 (버그 재현): quantity 미포함 fixture → 항상 통과.

PR body의 "#G-2가 실패" 오기. 실제는 #G-1이 regression guard 역할을 하며 fix 없으면 실패함 — guard 기능은 정상.

## REQ-3 · 테스트 실행 결과

**unit 전체**: 46 suites · 531 tests · all green (22s)  
**신규 spec** (pos-return-route-qris-qty): 3/3 PASS  
**it.sh partial-refund-anytime**: 스크립트 미발견 (`scripts/test-integration-pos.sh` 존재하나 해당 케이스 없음). PR body에 "로컬 Medusa 부트 환경 필요 · CI에서 실행"으로 명시 — CI pending 상태.  
**gh pr checks 372**: changes-filter / check / markers-and-forbidden 모두 pending (CI 대기 중).

## 비고

`pos-complete/route.ts` (line 52) — 같은 계열 리스크가 PR body 표에 "별도 티켓 후보"로 명시됨. 본 PR 범위 밖이고 올바른 scope 판단.
