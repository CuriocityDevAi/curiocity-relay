# M1-1125-S PASS

## #437 fix(commerce-core): SnapshotItem·ReceiptItem 로컬 정의

### 변경 파일
- `apps/commerce-core/src/types/customer-display.ts` — `export type { SnapshotItem, ReceiptItem } from "@storeport/receipt-view-model"` 제거 → 로컬 인터페이스 직접 정의
- `apps/commerce-core/src/types/__tests__/customer-display-types.unit.spec.ts` — 타입 호환성 unit test 2개 (상대경로 import · 양방향 할당 단언)

### commit
`b53fc73` fix(commerce-core): M1-1125-S — SnapshotItem·ReceiptItem 로컬 정의 (#442 블로커)
rebase 후 `b53fc73` → push (force-with-lease) ✓

### unit test
```
PASS src/types/__tests__/customer-display-types.unit.spec.ts
  customer-display 로컬 타입 — packages/receipt-view-model 필드 동일성
    ✓ SnapshotItem 샘플 객체가 로컬·패키지 양쪽 타입에서 통과 (1 ms)
    ✓ ReceiptItem 샘플 객체가 로컬·패키지 양쪽 타입에서 통과
Tests: 2 passed, 2 total
```

### grep 0줄 확인
```
$ grep -rn "@storeport/receipt-view-model" apps/commerce-core/src --include=*.ts | grep -v "src/admin/"
(결과 없음 — 0줄)
```

---

## #435 feat(commerce-core): M1-1125-M rebase

`main`(`73d666a`) 으로 rebase 완료. 충돌 없음(M1-1125-L 커밋 cherry-pick skip).  
commit `17d0aba` → `b6b3600`, push (force-with-lease) ✓

---

## standalone 설치 로그 꼬리

테스트 조건: `#442` package.json(receipt-view-model 제거) + M1-1125-N lockfile(receipt-view-model 없음) → tmpdir `pnpm install --frozen-lockfile --ignore-workspace`

```
devDependencies:
+ @medusajs/test-utils 2.17.2
+ @playwright/test 1.65.1
+ @swc/core 1.15.47
+ @swc/jest 0.2.39
+ @types/jest 29.5.14
+ @types/node 20.19.43
+ @types/react 18.3.31
+ @types/react-dom 18.3.7
+ jest 29.7.0
+ pg-god 1.0.12
+ prop-types 15.8.1
+ react 18.3.1
+ react-dom 18.3.1
+ ts-node 10.9.2
+ typescript 5.9.3
+ vite 5.4.21
+ yalc 1.0.0-pre.53

Done in 15.4s
EXIT: 0
```

> 비고: M1-1125-N 브랜치의 `pnpm-lock.yaml` 은 이미 receipt-view-model 없이 갱신된 상태. `package.json` 은 `#442` 머지 전이므로 여전히 `workspace:*` 참조 보유 — `#442` package.json 과 조합해야 `--frozen-lockfile` 통과. Railway 빌드 블로커(런타임 import)는 본 PR(#437)에서 해소됨.
