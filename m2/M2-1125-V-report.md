PASS

## M2-1125-V — R0-1125-AF 블로커 3건 수정

**브랜치**: feat/M1-1125-N-cd-receipt-full-snapshot  
**커밋**: 38f3624  
**push**: forced (rebase 후) → origin 반영 완료

---

## 수정 내용

### 1. TS2304 (order-snapshot.ts:4)
`export type { SnapshotItem, ReceiptItem } from "@storeport/receipt-view-model"` →
`import type { SnapshotItem, ReceiptItem } from "@storeport/receipt-view-model";`
`export type { SnapshotItem, ReceiptItem };` 로 분리

### 2. feature-map.yaml 미등록
`commerce-core.customer-display-snapshot` 프로세스 files에
`apps/commerce-core/src/types/__tests__/customer-display-types.unit.spec.ts` 추가

### 3. package.json 의존성 제거
origin/main (#442 hotfix)으로 rebase → `@storeport/receipt-view-model: workspace:*`
자동 제거 (브랜치 커밋 3개 충돌 없이 clean rebase)

---

## 검증 로그

### pnpm --filter customer-display typecheck
```
> customer-display@0.1.0 typecheck
> tsc --noEmit

EXIT_CODE: 0
```

### node scripts/feature-map-check.mjs
```
scanned: 1315 files → matched=1315 unmatched=0 (0.0%)
```

### standalone lockfile (tmpdir)
```
COPY apps/commerce-core/{package.json,pnpm-lock.yaml,.npmrc} → tmpdir
pnpm install --frozen-lockfile --ignore-workspace

Done in 16.9s
EXIT_CODE: 0
```

### pre-push hook (전체 테스트)
```
apps/commerce-core test: Test Suites: 69 passed, 69 total
apps/commerce-core test: Tests:       749 passed, 749 total
apps/customer-display test: Test Files  14 passed (14)
apps/customer-display test: Tests  252 passed (252)
packages/receipt-view-model: Tests 4 passed (4)
packages/event-contracts: Tests 21 passed (21)
```
