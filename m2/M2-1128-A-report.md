PASS · PR #485 · feat/M2-1128-A-receipt-printer-exact · 14 files changed, 498 insertions(+), 114 deletions(-)

## 작업 요약

- 브랜치: `feat/M2-1128-A-receipt-printer-exact` (origin/main 기준)
- PR: https://github.com/CuriocityDevAi/storeport/pull/485
- HEAD: d0a3c27

## diff stat (PR #485)

```
docs/feature-map.yaml                              |   4 +
docs/testing/receipt-escpos-card.txt               |  29 ++++
docs/testing/receipt-escpos-qris.txt               |  32 +++++
docs/testing/receipt-escpos-refund-s.txt           |  33 +++++
docs/testing/receipt-escpos-sample.txt             |  11 +-
docs/testing/receipt-escpos-void-s.txt             |  33 +++++
packages/receipt-lines/fixtures/snapshots.ts       |  50 +++++++
packages/receipt-lines/src/index.ts                |   1 +
packages/receipt-lines/src/line-types.ts           |   7 +
packages/receipt-lines/src/render-text.ts          |  14 +-
packages/receipt-lines/src/resolve-receipt-lines.ts| 117 +++++++++++-----
packages/receipt-lines/tests/__write-sample.test.ts|  82 ++++++++---
packages/receipt-lines/tests/parity.test.ts        | 155 ++++++++++++++++-----
packages/receipt-lines/tests/resolve-receipt-lines.test.ts | 44 +++---
14 files changed, 498 insertions(+), 114 deletions(-)
```

## 테스트 결과

- receipt-lines: 43 passed | 5 skipped (parity 9 · resolve 28 · currency 6)
- commerce-core receipt: 56 passed (6 suites)
- commerce-core 전체 unit: 887 passed, 75 suites
- customer-display: 352 passed, 19 suites

## 왜 지정 브랜치(feat/M2-1127-P-receipt-printer-parity)를 안 썼는지

M2-1127-S 변경이 `feat/M2-1127-P-receipt-printer-parity` 에 커밋되지 않았음.
맥북 잠자기로 M2-1127-T 가 중단되면서 변경이 현재 브랜치(`feat/M2-1127-S-receipt-printer-exact`)에 staged 상태로만 남아 있었음.
패리티 브랜치에 cherry-pick할 커밋이 없으므로 staged 변경을 직접 origin/main 기준 새 브랜치에 커밋함.

ⓒ 상시 조항: 이 리포트는 M2-1128-A 태스크 완료 후 최종 작성되었습니다.
