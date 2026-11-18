#357 APPROVE · build exit 0

## diff 2줄 검토

### ① mint-sale-receipt.ts:160 — `?? null ?? null` → `?? null`
- 중복 `?? null` 제거. `expr ?? null ?? null` ≡ `expr ?? null` (두 번째 `?? null`은 도달 불가).
- 런타임 반환값 동일: null/undefined → null, 그 외 → 원값.
- TS2871(unreachable) 오류만 해소, 동작 불변 ✓

### ② pos-void/steps.ts:360 — compensate 인자 `WastedItem[]` → `WastedItem[] | undefined`
- `createStep` CompensateFn 계약 준수를 위한 타입 선언 수정.
- 본체 첫 줄 `if (!wasted?.length) return;` 가 이미 undefined 처리 중 → 런타임 동작 불변 ✓
- index.ts TS2554/TS2345 cascade 2건도 이 한 줄로 해소.

## 빌드 결과

```
pnpm build (apps/commerce-core)
  Backend build completed successfully (5.80s)
  Frontend build completed successfully (17.62s)
  EXIT: 0
```
Backend errors: 없음.

## 판정: APPROVE
