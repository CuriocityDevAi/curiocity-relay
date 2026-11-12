# M3-1105-BM report

## 변경 줄

`scripts/m3-1105-ae-assertions.mjs` §2 · 4줄 교체 (lines 178-185):

| 전 (단일 조건 버튼) | 후 (두 버튼 각각) |
|---|---|
| `testID=\{voidRefund\.action === 'void' \? 'order-void' : 'order-refund'\}` regex | `variant="outline"[\s\S]{0,200}testID="order-void"` |
| `variant="outline"…voidRefund\.action === 'void' \? 'Void' : 'Refund'` regex | `variant="outline"[\s\S]{0,200}testID="order-refund"` |

결과: 34 passed → 36 passed · 0 failed

## CI run

- **run #43263113292** (master, 머지 후 신규)
  - ✓ assertions (2m18s)
  - ✓ flow-tests (1m20s)
  - ⏳ playwright (실행 중 — assertions/flow-tests 는 초록)
- **Lint run #43263113449** FAIL — prettier 포맷 에러 (`app/checkout/tender-qris/[draftOrderId].tsx` 등) · M3-1105-BL 브랜치 코드 기인, 본 태스크 범위 외.

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/117 (squash-merged → master)
