#280 CI 초록 · #275 CI 초록

## #280 (feat/M3-1126-S) — rebase 정리

- `git rebase --onto origin/master 4b06e71` 로 이미 master에 squash된 `fix(product-details)` 커밋(4b06e71) 제거 → diff가 결제 완료 화면 변경만 남음 (3 files: success/[orderId].tsx · PhoneEntryButton.tsx · m3-1126-k-phone-status-playwright.mjs)
- `scripts/spec-guard-pos-playwright.mjs` (#277) · `e2e/flows/spec-guard-pos.spec.ts` 에 Payment successful Phone entry 칩 "있음" 어설션 없음 → 갱신 불필요
- 1차 CI: `unit-tests` 실패 — `__tests__/m3-1126-k-customer-phone-v4.test.ts` 의 "PhoneEntryButton variant="chip" 마운트" 어설션이 chip 제거 이후에도 `variant="chip"` 존재를 expect → `not.toMatch(/variant="chip"/)` 으로 갱신 후 재push
- 2차 CI: 전 잡 초록

## #275 (feat/M3-1126-I) — lint 수정

- lint 에러 원인: `components/cd-preview/CdPreviewWindow.tsx:465` 에 이 브랜치가 추가한 JSX 텍스트 `<Text>⏎··Preview unavailable⏎··</Text>` 가 Prettier 단일 라인 규칙 위반 (pre-existing 아님 — master #279/#277 lint 초록이므로 이 브랜치 도입)
- 수정: 텍스트를 단일 라인 `<Text ...>Preview unavailable</Text>` 로 변경, 커밋·push
- CI: 전 잡 초록 (lint pass · unit-tests pass · playwright pass)
