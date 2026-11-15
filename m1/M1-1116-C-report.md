# M1-1116-C Report

파싱 수정 · 테스트 · CI(결제블록) · 스레드 resolve · mergeState=UNSTABLE

## 작업 내용

### 1. Main Rebase (충돌 해소)
`origin/main`(a2b1826 · #285 머지 포함) 위로 rebase 완료.

충돌 내역:
- `e18bdcf`(M2-1105-BM) — main에 `9f55c28`으로 이미 머지됨 → skip
- `728f75c`(M2-1105-BM tests) — 주석·goto URL 차이 → HEAD(main) 채택 → skip
- `33013cb`(BN REQ1) — loyalty-gate.spec.ts test 7 종료 위치 → HEAD 채택
- `cb7b198`(BN REQ2) — IS_DEV `import.meta` vs `process.env` → HEAD 채택(CJS 호환)
- `ccc741e`(BN REQ3) — 이미 upstream → 자동 drop
- `1631c52`(BN REQ4) — ci.yml customer_display/e2e-admin-loyalty 이미 main → HEAD 채택

### 2. loyalty_earn 파싱 수정 (`route.ts` L62-87)
`parseLoyaltyEarn()` 함수 추가:
- 객체 `{applied, amount, ...}`: `applied ? amount : null`
- 숫자: 그대로
- null/undefined: null
- `metadata.loyalty_recover` 있으면 순적립 = `max(0, earn − recovered)`

### 3. 이중 페이지네이션 버그 수정 (`route.ts` L167-174)
전화번호 비숫자 검색 시 DB query에 `skip/take` 없이 sort만 → 앱에서 `slice()` 한 번만.

```ts
pagination: qIsDisplayId
  ? undefined
  : q === ""
    ? { skip: offset, take: limit, order: { created_at: "DESC" } }
    : { order: { created_at: "DESC" } },
```

### 4. 통합 테스트 객체 형식으로 갱신 (`orders-list.spec.ts`)
헬퍼 `createOrderWithPhone`의 `loyaltyEarn: number | null` → `loyaltyMeta: { earn?, recover? } | null`.
실제 earnForOrder 저장 형식(객체)으로 메타데이터 세팅.

추가된 테스트:
- `#5` loyalty_earn 객체 `applied=false` → null
- `#6` loyalty_earn + loyalty_recover → 순적립 (3000 − 1000 = 2000)

### 5. CI 상태
GitHub Actions 결제 한도 초과 → 모든 job "not started because recent account payments have failed".
코드 오류 아님 — 로컬 unit test 310개 전부 통과 (`git push` pre-push 훅).

### 6. 리뷰 스레드 Resolve
`PRRT_kwDOTe-UYs63uoYV` (BLOCKER: loyalty_earn 형식 불일치) → `resolveReviewThread` → `isResolved: true`

### 7. mergeStateStatus
```json
{"mergeStateStatus":"UNSTABLE","headRefName":"feat/m1-1116-b-pos-orders-list"}
```
UNSTABLE = CI 결제 블록. 코드·충돌·스레드 모두 해소.
