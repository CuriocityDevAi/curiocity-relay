#272 CHANGES — prettier 에러 1건 (신규 도입), 머지 전 수정 필요.

## 확인 항목

| 항목 | 결과 |
|------|------|
| formatElapsed 경계값 (59m/60m/23h59m/24h/19263분/0/미래/null) | ✓ 전부 정확 |
| elapsedMs null = 칩 자체 숨기지 않음 | ✓ Text 만 조건부 렌더, 컨테이너 항상 노출 |
| formatElapsed 다른 사용처 (grep) | ✓ OrderChips.tsx:296 한 곳뿐 — 교대 마감·주문 목록 무관 |
| vitest (m3-1123-a-order-chips) | ✓ 26/26 passed |
| vitest (m3-1126-d-pos-fixes) | ✓ 25/25 passed |
| e2e M3-1126-E-waiting-elapsed.spec.ts | ✓ 1/1 passed — `5m→"5m" · 2h→"2h" · 3d→"3d"` |
| lint (types.ts, OrderChips.tsx) | ✗ prettier error 1건 (신규) |

## 발견된 문제

**`components/order-chips/types.ts:90`** — `prettier/prettier` error.  
불필요한 괄호 제거 필요. 로직 자체는 올바름.

```ts
// 현재 (error)
elapsedMs: (w.createdAt > 0 && w.createdAt <= nowMs) ? (nowMs - w.createdAt) : null,

// 수정
elapsedMs: w.createdAt > 0 && w.createdAt <= nowMs ? nowMs - w.createdAt : null,
```

master 에는 없던 에러 — 이 PR 에서 신규 도입.  
CI `eslint --max-warnings 0` 조건이면 블록됨.

## formatElapsed 경계값 직접 검증

| 입력 | 예상 | 실제 |
|------|------|------|
| 0ms | `0m` | ✓ |
| 59 × 60_000ms | `59m` | ✓ |
| 60 × 60_000ms | `1h` | ✓ |
| (23×60+59) × 60_000ms | `23h 59m` | ✓ |
| 24 × 60 × 60_000ms | `1d` | ✓ |
| 19263 × 60_000ms | `13d` | ✓ |
| createdAt = 0 | elapsedMs null | ✓ |
| createdAt > now (미래) | elapsedMs null | ✓ |

칩 폭: 최대 `23h 59m` (7자) + `#N ·` — 기존 무제한 `M:SS`(예: `19263:15`) 대비 안전하게 제한됨.

## 명령 로그

```
$ npx vitest run __tests__/m3-1123-a-order-chips.test.ts
 Test Files  1 passed (1)
     Tests  26 passed (26)
  Duration  142ms

$ npx vitest run __tests__/m3-1126-d-pos-fixes.test.ts
 Test Files  1 passed (1)
     Tests  25 passed (25)
  Duration  150ms

$ npx expo export --platform web --output-dir dist --clear
  Exported: dist

$ npx playwright test e2e/flows/M3-1126-E-waiting-elapsed.spec.ts --reporter=line
  [M3-1126-E] 5m chip: "#2· 5m" | 2h chip: "#3· 2h" | 3d chip: "#4· 3d"
  1 passed (5.1s)

$ npx eslint components/order-chips/types.ts components/order-chips/OrderChips.tsx
  types.ts:90  error  prettier/prettier  ← 신규, master 에 없음
  OrderChips.tsx:235  warning  useRef.current  ← pre-existing
  ✖ 4 problems (1 error, 3 warnings)
```

## PR 코멘트

COMMENT 리뷰 제출 완료 (자기 PR — REQUEST_CHANGES 불가).  
LINE 코멘트: `components/order-chips/types.ts:90` (prettier 수정 방법 포함).
