PASS

# M0-1125-C — 손님 화면 영수증 = POS 영수증 같은 내용

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/427
- **Branch**: `feat/M0-1125-C-cd-receipt-same`
- **Commit**: `e869c36` on `main` 기준 bde7a4f 위
- **워크트리**: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1125-C-wt`
- **원장 대사**: decision-cd-defer-20261124 · decision-pos-phone-status-20261124 §9 (Kyu 11-24 "완전히 다른 영수증 — 손님 화면 영수증 = POS 영수증") · 감사 m2/M2-1125-B-report.md #7

## 요구사항 체크 (§[REQ])

| 요구 | 구현 |
| --- | --- |
| 서버 receipt snapshot → `snapshot.receipt` 로 그대로 전달 (한 출처) | `serializeSnapshot` 이 `ReceiptModuleService.buildSnapshot` 출력 shape 을 verbatim pass-through. `SnapshotReceipt` 타입을 양쪽(commerce-core · customer-display) 미러. 두 곳에서 계산 안 함. |
| 매장 헤더(매장명·주소) | `view.storeName` = `receipt.store.name` → `storeConfig.storeName` · `view.storeAddress` = `receipt.store.address`. ReceiptScreen `receipt-store-name` · `receipt-store-address` testid. |
| 품목 | `view.items` = `receipt.items` (POS shape · `line_total`) → fallback `snapshot.items`. `receipt-item-N` testid 로 렌더. |
| 소계 · PB1 · 합계 | `view.subtotal` · `view.tax`(show/label/rate_pct/amount) · `view.grandTotal`. testid `receipt-subtotal` · `receipt-tax` · `receipt-total`. |
| tender 세부 (Cash/Card/QRIS 나눠 결제 + 현금 받은 돈·거스름돈) | `view.tenders[]` = `receipt.tenders` 평탄화. Cash leg 은 `receipt-tender-N-received` + `receipt-tender-N-change` 출력. Card/QRIS leg 은 받은 돈/거스름 숨김. |
| 칩 #N | 기존 `<PosChipBadge orderNum={snapshot.pos_order_num}/>` 유지. |
| 하단 주문번호(PIM26B…) 우선순위 | `receipt.order_custom_display_id` → `snapshot.order_custom_display_id` → `#display_id`. 미존재 시 null (렌더 생략). testid `receipt-bottom-order-no`. |
| 애니메이션 · 5개 언어 라벨 | 슬라이드/팝 애니메이션 그대로. Subtotal/Total/Tax(PB1) 는 기존 CartStrings 사용. Received/Change/Order 는 ReceiptScreen 내부 5-lang map. |

## 변경 파일

- `apps/commerce-core/src/types/customer-display.ts` — `SnapshotReceipt` 를 `buildSnapshot` 출력 shape 으로 확장 · `OrderSnapshot` 에 `order_custom_display_id` 필드 추가 (하위 호환 · 모두 optional).
- `apps/commerce-core/src/modules/register_session/lifecycle.ts` — `serializeSnapshot` 이 receipt verbatim pass-through + `order_custom_display_id` top-level 노출 (우선순위 체인).
- `apps/commerce-core/src/modules/register_session/__tests__/receipt-passthrough.unit.spec.ts` (신규) — 4 테스트 (cash · split · qris · 하단 번호 우선순위).
- `apps/customer-display/src/types/order-snapshot.ts` — 미러 타입.
- `apps/customer-display/src/screens/ReceiptScreen.tsx` — `resolveReceiptView` 를 통해 서버 한 출처에서 렌더.
- `apps/customer-display/src/screens/receipt-view.ts` (신규) — pure 뷰 모델 리졸버.
- `apps/customer-display/src/screens/__tests__/receipt-view.test.ts` (신규) — 5 테스트 (cash · split · qris · 하단 번호 체인 · 최소 receipt 폴백).
- `apps/customer-display/src/mocks/adapter.ts` — `?tenders=cash|split|qris` 로 receipt 변형 · 서버 shape 그대로 포함.
- `apps/customer-display/e2e/receipt-same-as-pos.spec.ts` (신규) — Playwright 3 변형 + 스크린샷.
- `docs/feature-map.yaml` — cd-checkout 에 `screens/receipt-view.ts` + `screens/__tests__/**` 추가.

금지 범위 준수:
- ⛔ `apps/customer-display/src/screens/MainScreen.tsx` · `apps/customer-display/app/index.tsx` 수정 없음 (M2).
- ⛔ POS fork (`external-refs/narisolutions-medusa-pos/**`) 수정 없음.
- ⛔ `~/projects/curiocity-relay` 수정 없음.
- ⛔ 운영 · Railway · SSH 액션 없음.

## 테스트 로그

```
# commerce-core 전체 unit — 630 pass (regression + 신규 4건)
$ pnpm --filter commerce-core exec jest --testPathPattern unit
Test Suites: 56 passed, 56 total
Tests:       630 passed, 630 total
Snapshots:   18 passed, 18 total
Time:        5.661 s

# customer-display 전체 vitest — 238 pass (regression + 신규 5건)
$ pnpm --filter customer-display test
Test Files  13 passed (13)
     Tests  238 passed (238)
  Duration  428ms

# 신규 jest 스펙 상세
$ pnpm --filter commerce-core exec jest receipt-passthrough.unit.spec.ts
  M0-1125-C · serializeSnapshot pass-through of receipt (POS=CD 한 출처)
    ✓ 단일 Cash — 받은 돈·거스름돈 포함 · 하단 PIM26B 번호 노출 (3 ms)
    ✓ 나눠 결제 Cash+Card — 두 tender 모두 금액·메타 보존
    ✓ QRIS 단일 — issuer/reference_no 보존 + QR 문자열 폴백 필드 유지 (1 ms)
    ✓ 하단 주문번호 우선순위 — receipt.order_custom_display_id > snapshot > display_id
Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total

# typecheck
$ pnpm --filter commerce-core exec tsc --noEmit  # clean
$ pnpm --filter customer-display exec tsc --noEmit  # clean

# naming check
$ bash scripts/naming-check.sh
✓ naming-check PASS

# feature-map coverage
$ node scripts/feature-map-check.mjs --diff <10 files>
scanned: 10 files → matched=10 unmatched=0 (0.0%)

# Playwright e2e — 신규 3건 (스크린샷 포함)
$ pnpm --filter customer-display e2e receipt-same-as-pos.spec.ts
  ✓ single-cash — 매장/품목/합계/받은 돈/거스름돈/PIM26B 하단 노출 (423ms)
  ✓ split cash+card — 두 tender 라인 모두 표시 (247ms)
  ✓ qris 단일 — tender 1건 · QRIS 라벨 · 하단 PIM26B (245ms)
  3 passed (1.7s)

# 기존 receipt e2e — regression 유지
$ pnpm --filter customer-display e2e receipt-done.spec.ts
  7 passed (2.9s)
$ pnpm --filter customer-display e2e snapshots.spec.ts
  16 passed (11.6s)
```

## 스크린샷

Playwright 로 캡처해 리포트 디렉토리에 복사.

- 단일 Cash: `./m0-1125-c-receipt-cash.png`
- 나눠 결제 Cash+Card: `./m0-1125-c-receipt-split.png`
- QRIS: `./m0-1125-c-receipt-qris.png`

(워크트리 원본: `apps/customer-display/screenshots/m0-1125-c-receipt-{cash,split,qris}.png`)

## 어설션 파일 (한 눈에)

- 서버 쪽 pass-through: `apps/commerce-core/src/modules/register_session/__tests__/receipt-passthrough.unit.spec.ts`
- CD 쪽 뷰 모델: `apps/customer-display/src/screens/__tests__/receipt-view.test.ts`
- Playwright 어설션: `apps/customer-display/e2e/receipt-same-as-pos.spec.ts`

## Kyu 실기 체크리스트 (PR 본문에도 수록)

- [ ] `/?mock=1&state=receipt&tenders=cash` 로 열어 `Cash | Rp 126.500` · `Received Rp 200.000` · `Change Rp 73.500` · 하단 `PIM26B1042` 확인.
- [ ] `/?mock=1&state=receipt&tenders=split` 로 `Cash Rp 50.000` + `Card Rp 76.500` 두 줄이 보이는지, card leg 에 received/change 안 뜨는지 확인.
- [ ] `/?mock=1&state=receipt&tenders=qris` 로 `QRIS Rp 126.500` · issuer=GoPay (서버 snapshot 보존) · 하단 `PIM26B1042` 확인.
- [ ] 애니메이션 (slide + check pop) 기존 그대로.
- [ ] 언어 토글 → Received/Change 라벨 번역 교체 (en/id/ko/ja/zh).

## PR 자기 머지 금지 준수

PR #427 을 열어두고 **머지하지 않음**. 착지는 T0 세션 소관.
