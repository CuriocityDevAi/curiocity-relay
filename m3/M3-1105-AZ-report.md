# M3-1105-AZ 리포트

## 항목 표

| REQ | 파일:변경 | 커밋 |
|-----|----------|------|
| 1 · ManagerPinSheet 삭제 | `components/orders/ManagerPinSheet.tsx` 삭제 | 2717963 |
| 1 · assertion 갱신 (8개) | `scripts/m3-1105-aj/ae/an/ar/al/ad/am/aw-assertions.mjs` | 2717963 |
| 2 · handedOver OR 조건 | `app/orders/[orderId].tsx:873` `fulfillment_stage==='hand_over' \|\| fulfillments.length>0` | a5bfc66 |
| 2 · aw-assertions 갱신 | `scripts/m3-1105-aw-assertions.mjs` check(10) | a5bfc66 |
| 3 · 스샷 | `docs/testing/screenshots-20261112/` 5장 | af9559d |
| 3 · 스샷 스크립트 | `scripts/m3-1105-az-screenshots.mjs` 신규 | af9559d |
| 4 · prettier | `app/orders/[orderId].tsx`, `scripts/m3-1105-an/aw-assertions.mjs`, `scripts/m3-1105-az-screenshots.mjs` | bd8cf30 |

## 스샷 목록

`docs/testing/screenshots-20261112/` (iPad 1180×820):
- `01-void-restock-step.png` — Void 재고 질문 (restock step)
- `02-payments-type-table.png` — Payments Type 표 (void 행)
- `03-void-buttons-done-reprint-share.png` — Void 뒤 버튼 3개
- `04-refund-select-items.png` — 반품 품목 선택 (AX 복사)
- `04-refund-full-order.png` — 반품 Full order (AX 복사)

영수증 QR(M0-1105-AT): dist 미적용 — 별도 작업.

## PR 번호

PR #106 — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/106

## git ls-tree (AZ 관련)

```
scripts/m3-1105-aw-assertions.mjs
scripts/m3-1105-az-screenshots.mjs
docs/testing/screenshots-20261112/
```

## 이연 순증감

- **삭제**: `components/orders/ManagerPinSheet.tsx` (176줄)
- **신규**: `docs/testing/screenshots-20261112/` (5 PNG), `scripts/m3-1105-az-screenshots.mjs`
- **수정**: assertion 8개, `app/orders/[orderId].tsx` handedOver 1줄

## assertions

`node scripts/run-all.mjs assertions` → 총 44개 · 44 PASS · 0 FAIL
