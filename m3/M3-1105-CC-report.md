# M3-1105-CC Report

rebase 성공 · 새 HEAD 93a8dad · CI 전체 통과

## REQ1 — rebase 결과
- `git rebase --onto origin/master 64ccfe6` 실행 (충돌 없음)
- BZ 커밋(64ccfe6·e4a124c) 제거, CA 커밋 3개만 master(0539f5b) 위에 착지
- 새 SHA 매핑:
  - 202f701 → 5f6d192 `feat(split): M3-1105-CA REQ1`
  - 1a63dbb → 6c04bab `feat(refund): M3-1105-CA REQ2+3`
  - bd87d24 → 93a8dad `test(flows): M3-1105-CA REQ4`

## REQ2 — CI 결과 (run 43563735600 / Lint 43563735504)
| job | 결과 | 소요 |
|---|---|---|
| lint | ✅ success | 57s |
| assertions | ✅ success | 2m8s |
| flow-tests | ✅ success | 48s |
| playwright | ✅ success | 14m13s |

## REQ3 — changed files (vs origin/master)
CA 파일만 변경됨:

**소스 코드**
- `api/hooks/pos-refunds.ts`
- `app/checkout/split-tender/[draftOrderId].tsx`
- `app/checkout/tender-qris/[draftOrderId].tsx`
- `components/orders/RefundRetrySheet.tsx`
- `lib/split-qris-state.ts`
- `lib/split-tender.ts`
- `tests/flows/m3-1105-ca.test.ts`

**픽스처**
- `fixtures/m3-1105-ca.refund-retry-cash-fallback-200.json`
- `fixtures/m3-1105-ca.refund-retry-qris-errors.json`
- `fixtures/m3-1105-ca.split-tender-1st-qris.json`
- `fixtures/m3-1105-ca.split-tender-409-qris-pending.json`

**스크린샷(커밋됨)**
- `docs/M1-1105-Q-case-a.png`, `docs/M1-1105-Q-case-d.png`, `docs/M3-1105-F-order-detail.png`
- `e2e/screenshots/01-cash-receipt-qr.png`, `01-cash-success-title.png`, `02-split-step1.png`, `02-split-step2.png`, `02-split-success-qr.png`
- `screenshots-m3-1105-ax/01~04-ipad-*.png`
