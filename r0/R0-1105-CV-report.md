# R0-1105-CV — master 68a771e 자동 검사 상태 확인

**판정: 초록 (회귀 없음)** · playwright CI 실행 중(~10분, 미완료 시점 보고)

---

## 1. CI 결과 (HEAD 68a771e)

| 잡 | 상태 | 결론 |
|---|---|---|
| Lint | completed | ✅ success |
| assertions | completed | ✅ success |
| flow-tests | completed | ✅ success |
| playwright | in_progress | ⏳ 보고 시점 미완료 (run #43201962743, 10:37 UTC 시작) |

> Playwright: `Expo export web` → `Cache Playwright browsers` → `Install playwright-chromium` → **`Run Playwright harnesses`** 실행 중. 선행 단계 모두 success. 실패 시 GitHub Actions에 스크린샷 업로드 스텝이 있어 증적 보존됨.

---

## 2. 로컬 테스트 (master HEAD = 68a771e, `agilo-fork-test`)

| 명령 | 결과 |
|---|---|
| `npm ci --legacy-peer-deps` | ✅ 완료 |
| `npm run lint` | ✅ 오류 0, 경고 44 (기존 warning) |
| `npx vitest run` | ✅ 10 files, 99 passed, 6 expected fail |
| `npm run test:flows` | ✅ 4 files, 46 passed, 6 expected fail |

---

## 3. `git diff 020cc26 68a771e` — 중복·되돌림 검사

변경된 app/ 파일: `app/(tabs)/cart.tsx` · `app/checkout/split-tender/[draftOrderId].tsx` · `app/checkout/success/[orderId].tsx` · `app/orders/[orderId].tsx`

| 파일 | 변경 여부 | 판정 |
|---|---|---|
| `app/_layout.tsx` | **변경 없음** | ✅ #112 Toast 위치 수정 보존 |
| `lib/receipt-share.ts` | **변경 없음** | ✅ #110 lazy-load 수정 보존 |
| `app/orders/[orderId].tsx` | 변경됨 | ✅ 되돌림 아님 — 의도적 개선 (↓) |

### `app/orders/[orderId].tsx` 변경 내용
- `deriveGrandTotal` / `deriveOutstanding` import 추가 (lib/order-totals.ts)
- `grandTotal` 계산을 `posTotals?.grand_total ?? order.total` → `deriveGrandTotal(order.total, orderMd)` 로 변경
- `outstanding` 계산을 인라인 reduce → `deriveOutstanding()` 위임
- **Done 버튼**: voided 조건부에서 항상 표시(`className="flex-1"`)로 변경 — M3-1105-BF F3 사양 반영. #111 Done 버튼이 삭제된 게 아니라 위치·조건 개선.

---

## 4. 발견된 이슈

### [경고] vitest.config.ts — `define` 키 중복 (non-blocking)

```
vitest.config.ts:10  define: { __DEV__: false }  ← 첫 번째
vitest.config.ts:14  define: { __DEV__: false }  ← 중복 (동일 값)
```

- 기능 영향 없음(동일 값이므로 오버라이드 결과 같음), 테스트 실패 없음
- esbuild 빌드 경고로 출력됨
- **제안: 담당자(#107 머지한 오케 또는 #105 작성자)가 중복 `define` 블록 14-16줄 제거**

---

## 5. 종합

- **회귀 없음**: #110 lazy-load, #112 Toast, #111 Done 버튼 모두 보존 또는 의도적 개선
- **로컬 lint/unit/flow 전 통과**
- **CI**: Lint ✅ · assertions ✅ · flow-tests ✅ · playwright ⏳ 미완료(실행 중)
- vitest.config.ts duplicate key 1건 — 담당자 cleanup 권고
