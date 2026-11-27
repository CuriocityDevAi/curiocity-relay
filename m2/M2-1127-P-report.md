# M2-1127-P Report

PASS · PR #484 · head feat/M2-1127-P-receipt-printer-parity · diff 271줄 · 테스트 36(receipt-lines)+887(commerce-core)

## 완료 항목

1. **새 브랜치** `feat/M2-1127-P-receipt-printer-parity` (origin/main 기준) — #482 브랜치 오염 해소
2. **cherry-pick M2-1127-N** (6b253461) — 충돌 없음
3. **품목 줄 형식 fix** (`render-text.ts:renderItem`):
   - Before: `ItemName    Rp total` / `  (Variant)` / `  qty x Rp unit` (3줄, total 첫 줄)
   - After: `ItemName (Variant)` / `  qty x Rp unit        Rp total` (2줄, fork 패리티 ✓)
   - fork 기준: `receipt-escpos.ts:212-222` — `title+(variant) 한 줄` → `b.kv(qtyPart, total)`
4. **골든 샘플 갱신** (`docs/testing/receipt-escpos-sample.txt`)
5. **패리티 테스트** fork 출처 커밋 명시: `f8a9d6a` · `receipt-escpos.ts:212-222`
6. **resolve-receipt-lines.ts 주석 정정**: 라인 번호(165) + 품목 형식 설명 추가
7. **#482 닫기**: 코멘트 "→ #484" + close

## Diff

```
7 files changed, 173 insertions(+), 98 deletions(-)
apps/commerce-core/src/modules/receipt/__tests__/receipt-snapshot.unit.spec.ts (+67)
apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts (+16/-1)
docs/testing/receipt-escpos-sample.txt (품목 형식 갱신)
packages/receipt-lines/src/index.ts (+4)
packages/receipt-lines/src/render-text.ts (renderItem 재작성)
packages/receipt-lines/src/resolve-receipt-lines.ts (주석 정정 + 배너·포맷 변경)
packages/receipt-lines/tests/parity.test.ts (fork 출처 커밋 주석)
```

## 테스트 결과

- receipt-lines: 36 passed, 1 skipped ✓
- commerce-core unit: 887 passed ✓
- customer-display: 352 passed ✓
- typecheck: 1 error (pre-existing · apps/wing/button.tsx · main 동일)
