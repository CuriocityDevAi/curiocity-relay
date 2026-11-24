PASS — R0-1124-E CHANGES 3건 반영 완료. CI sell-scroll 9케이스 로컬 통과.

## 작업 브랜치
`fix/M3-1124-D-sell-scroll` (commit `732cd14`)

## 수정 내역

### ① estimatedItemSize={220} 삭제
- `app/(tabs)/sell.tsx` FlashList에서 제거.
- 현 FlashList 버전에 없는 prop → TS2322 에러 + 런타임 무시.
- tsc 에러 수: 18줄 → 16줄 (sell.tsx TS2322 소거 확인).

### ② 코멘트 원인 정정 (sell.tsx:202-205)
Before:
```
// M3-1124-D · FlashList 수정: estimatedItemSize + 명시적 flex:1 래퍼.
//   - estimatedItemSize 없으면 iOS FlashList 가 콘텐츠 높이를 0 으로 계산 → 스크롤 불가.
//   - 세로 모드: CartBottomBar(≈56px) 높이만큼 paddingBottom 추가 → 마지막 상품 가림 방지.
```
After:
```
// M3-1124-D · FlashList 스크롤 수정.
//   - 부모 View 에 flex:1 없으면 Yoga 가 FlashList 높이를 0 으로 계산 → 스크롤 불가.
//   - 세로 모드: CartBottomBar(≈72px)가 마지막 카드를 가림 → paddingBottom: 72 로 방지.
```
실제 원인 = Yoga 높이 체인(부모 flex:1 래퍼 누락) + CartBottomBar paddingBottom: 72 로 정정.

### ③ 하네스 등록
- `scripts/m3-1124-d-sell-scroll-playwright.mjs` 신규 추가.
- `scripts/run-all.mjs` glob 패턴(`scripts/*-playwright.mjs`) 대상.
- 스펙: `e2e/flows/M3-1124-D-sell-scroll.spec.ts`.

## CI 실행 증거

```
npx playwright test --config playwright.config.ts e2e/flows/M3-1124-D-sell-scroll.spec.ts

Running 9 tests using 1 worker

  ✓  1 ① 맨 아래 상품 스크롤 도달 — phone-portrait (3.7s)
  ✓  2 ② 마지막 카드 CartBottomBar 가림 없음 — phone-portrait (3.4s)
  ✓  3 ③ 마지막 카드 클릭 → product-details 이동 — phone-portrait (3.4s)
  ✓  4 ① 맨 아래 상품 스크롤 도달 — ipad-portrait (3.4s)
  ✓  5 ② 마지막 카드 CartBottomBar 가림 없음 — ipad-portrait (0ms)
  ✓  6 ③ 마지막 카드 클릭 → product-details 이동 — ipad-portrait (3.4s)
  ✓  7 ① 맨 아래 상품 스크롤 도달 — ipad-landscape (3.4s)
  ✓  8 ② 마지막 카드 CartBottomBar 가림 없음 — ipad-landscape (0ms)
  ✓  9 ③ 마지막 카드 클릭 → product-details 이동 — ipad-landscape (3.4s)

  9 passed (26.0s)
```

## 빌드 체크
- `npx tsc --noEmit` 에러 증가 없음 (18줄 → 16줄, 감소).
- lint error 0.
- 머지 금지 유지.
