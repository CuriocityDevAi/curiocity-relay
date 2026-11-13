# M0-1105-BP · 서버 부분 환불 영수증 kind='partial_refund' 복구 — 리포트

## 원인 (REQ1)

두 라우트에서 `kind: 'refund'` 를 **하드코드** 했고, 애초에 `receipt.kind` enum 에 `partial_refund` 값이 **존재하지 않았음**.

- `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts:495` — `kind: "refund"` 하드코드 (M0-1105-AB 도입 커밋 `d691edd2`, PR #183).
- `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts:983` — `kind: "refund"` 하드코드 (M0-1105-AC 도입 · 이후 M0-1105-BF 분기 추가되었어도 kind 는 그대로).
- `apps/commerce-core/src/modules/receipt/models/receipt.ts:19` enum `["sale","balance","reprint","refund","void"]` · DB check constraint (`Migration20261105000001` · `Migration20261107000001`) 에도 `partial_refund` 값 없음.

→ 서버가 부분 환불에도 `kind='refund'` 로 영수증을 발행 (R0-1105-DO 주의 1 확인). 앱(#128 보정 머지 `f015f8f`) 이 자체 보정으로 가리고 있었지만, 영수증 번호·Admin·추후 WA 영수증은 서버 값을 그대로 쓰므로 서버 교정 필요.

## 판정 함수 위치 (REQ2)

`apps/commerce-core/src/modules/receipt/service.ts` · 함수 **`resolveRefundReceiptKind(order, thisRefundTotal)`** 로 통일.

```
export function resolveRefundReceiptKind(order, thisRefundTotal):
  original = order.metadata.pos_totals.grand_total  // PB1/SC 포함 SoT (M0-1105-AR R6)
          ?? order.total                              // 폴백
  if (original <= 0) return 'partial_refund'
  return Math.round(thisRefundTotal) === Math.round(original) ? 'refund' : 'partial_refund'
```

Kyu 결정(decision-refund-receipt-label-20261113) 원문 반영: "partial 이라는것은 잔액에 대한 리펀드 비율이 아니라, 최초 원거래에 대한 리펀드 비율이기때문이야." → 이번 환불 총액(세금 포함) == 주문 최초 결제 총액 이면 `refund`, 아니면 `partial_refund` (앞선 부분 환불 뒤 나머지 전부도 partial).

**`/refund` · `/return` 두 라우트가 같은 함수를 import** 하여 `createReceiptForOrder({ kind, ... })` 에 전달. (`/refund-retry` 는 영수증 신규 발행 지점이 없어 호출 없음 — 운영 재발행은 별 트랙.)

## 수정 파일

1. `apps/commerce-core/src/modules/receipt/models/receipt.ts` — enum 에 `partial_refund` 추가.
2. `apps/commerce-core/src/modules/receipt/service.ts` — `kind` 타입 확장 + `resolveRefundReceiptKind` export.
3. `apps/commerce-core/src/modules/receipt/migrations/Migration20261113000001.ts` (신규) — `receipt_kind_check` constraint 갱신.
4. `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts` — 하드코드 → helper 호출.
5. `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts` — 하드코드 → helper 호출.
6. `apps/commerce-core/integration-tests/pos/refund-receipt-kind.spec.ts` (신규) — 4건 회귀 테스트 (REQ4).
7. `apps/commerce-core/integration-tests/pos/tenders.spec.ts` — 기존 #54 테스트 (60000 환불 of 120000 total) 기대값 `'refund'` → `'partial_refund'` (본 수정의 의도된 결과).
8. `apps/commerce-core/package.json` — `test:integration:pos` 스크립트에 새 spec 추가.

## REQ3 가드

이미 발행된 영수증 (R-261113-0004 등) 은 손대지 않음 — 본 수정은 DB 레코드 **새로 만드는 지점의 kind** 만 교정 (앱 보정 유지).

## 자기 검증 결과

- `pnpm typecheck` (apps/commerce-core) — 에러 0.
- `pnpm test` (unit · 132 cases) — **132 passed · 0 failed**.
- `pnpm test:integration:pos` (6 suites: tenders · pos-tax-lines · p6-e2e · refund-ghost-reservation · pos-qris-simulate · refund-receipt-kind) — **124 passed · 0 failed**.
  - refund-receipt-kind: 4/4 pass (BP-1 ~ BP-4).
  - tenders.spec #54 회귀 기대값 수정 후 89/89 pass.

## PR · 커밋 · head SHA

- PR: https://github.com/CuriocityDevAi/storeport/pull/243 (draft · base main)
- Branch: `fix/m0-1105-bp-partial-refund-kind`
- Commits (3 건 · 항목마다 push):
  1. `09986dd` feat(receipt): partial_refund kind + resolveRefundReceiptKind helper (M0-1105-BP)
  2. `a0506e2` fix(pos): /refund · /return receipt kind partial_refund 판정 적용 (M0-1105-BP)
  3. `525125a` test(pos): partial_refund / refund 판정 통합 테스트 4건 + 회귀 수정 (M0-1105-BP)
- HEAD SHA: `525125af464c257c584b5b5b4364a673608228a3`

## CI run

- 최신 run: https://github.com/CuriocityDevAi/storeport/actions/runs/43425047437 (push 525125a · 리포트 작성 시점 pending — 오케가 머지 전 확인 필요)
- unit-commerce-core · check · markers-and-forbidden · changes-filter 4 job.

## 금지 사항 준수

- webhook.ts · xendit-qris-provider · hooks/payment/xendit/route.ts · tenders QRIS 경로 · pos-qris-simulate.spec.ts (M1-1105-BR 진단 중) · 앱(fork) — **건드리지 않음**.
- 머지는 오케 · PR draft 로 열어둠.
