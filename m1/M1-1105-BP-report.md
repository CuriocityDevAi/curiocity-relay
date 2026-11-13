# M1-1105-BP 착지 보고

## 단언 경로
`query.graph({ fields: ["items.*", "items.tax_lines.*"] })` → `items.tax_lines.rate` 역산 합산

```
taxLineSum = sum_items( sum_taxlines( round(item_subtotal × tl.rate / 100) ) ) === 3001
```

## 발견 사항
- `items.tax_total` via `retrieveOrder`: 항상 0 (Medusa computed 미populate)
- `items.tax_lines.amount` via `query.graph`: 항상 0 (`CreateOrderTaxLineDTO`에 amount 필드 없음 — rate만 저장)
- `items.quantity`/`items.subtotal` 개별 필드 명시 시: 0 반환 (computed 필드)
- **해결**: `items.*` 와일드카드 사용 → `total`/`subtotal` 올바르게 반환

## 로컬 integration 테스트
`pnpm test:integration:pos` → **5 suites, 120 tests, 0 failed**
- tenders.spec.ts: 89 passed
- pos-tax-lines.spec.ts: 9 passed (#AX-1~7 · #CJ-4 · #CJ-3)
- p6-e2e.spec.ts: 10 passed
- refund-ghost-reservation.spec.ts: 5 passed
- pos-qris-simulate.spec.ts: 7 passed

## push & PR
- PR #240: `fix/m1-1105-bo-tax-retrieve`
- head SHA: `a55c8b2`
- PR 본문 갱신 완료
