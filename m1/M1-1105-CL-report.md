# M1-1105-CL Report

prettier 반영 · assertions/lint/flow-tests 결과 전체 pass · lint 실패 = 기존 여부 → master에서도 동일 경고 (기존 이슈 확인).

## prettier

- `components/receipt/ReceiptCard.tsx`: prettier --write 적용 (6줄 → 1줄 변경)
- `lib/printer/escpos.ts`: unchanged
- `lib/printer/receipt-escpos.ts`: unchanged
- `scripts/m2-1105-m-receipt-escpos-assertions.mjs`: unchanged
- 커밋: `59ba468` `style(receipt): M1-1105-CL — prettier ReceiptCard.tsx`
- push: `fix/m1-1105-ck-qris-ref-overflow` → origin

## lint 기존 이슈 확인

`app/checkout/split-tender/[draftOrderId].tsx:69 react-hooks/set-state-in-effect`  
→ master 체크아웃 후 `npx eslint` 실행 결과 동일 경고 재현 → PR 범위 밖 기존 이슈 확인됨. 미수정.

## PR #144 CI checks (최종)

| job | status | duration |
|---|---|---|
| assertions | **pass** | 2m39s |
| flow-tests | **pass** | 50s |
| lint | **pass** | 46s |
| playwright | **pass** | 15m30s |

PR #144: draft 아님 (OPEN) — 그대로 유지.
