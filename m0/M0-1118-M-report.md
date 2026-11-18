#381 갱신 · QRIS 큰 QR O · qr 없음 fallback O · 키패드 위 요약 O · 비회귀 27/27

## 범위
- 워크트리: `~/curiocity-live/storeport-wts/hub-m0`
- 브랜치: `feat/M0-1118-K-cd-sync-r3` (origin 과 rebase 후 append · force-with-lease push)
- PR: #381 (본문 M0-1118-M 섹션 추가)
- HEAD: `75550bc feat(customer-display): M0-1118-M — QRIS 손님 화면 + 번호 키패드 주문 요약 (#381 보완)`

## [REQ] 체크
1. **payment_qris 큰 QR + 금액 + 소형 장바구니** — O
   - `src/screens/QrisScreen.tsx` 신규. landscape QR = min(55% viewport height, 90% × 반쪽 폭) · portrait QR = min(70% width, 45% height).
   - `qr_string` 유효 → `<Svg>` + per-module `<Rect>` 로 EMVCo QR 렌더(react-native-svg + qrcode@1.5.4).
   - 금액 = `snapshot.amount ?? snapshot.grand_total` (POS R2 미도착 대응 fallback).
   - 하단 recap: 최대 3줄 아이템 + `qris.more.replace("{n}", 추가수)` 로 "+N more items".
2. **qr_string 없음 placeholder** — O
   - `<View testID="qris-qr-placeholder">` + "QRIS 결제 준비 중…" (5개 언어). `qris-qr-svg` 는 아예 렌더 안 됨(빈 QR 금지 요구 충족).
3. **loyalty_entry 키패드 위 주문 요약** — O
   - `KeypadScreen` 에 `summary?: OrderSnapshot | null` prop. landscape 에서는 leftTop 안 큰 카드 (`summaryCard`), portrait/split 에서는 키패드 바로 위 1줄 strip (`summaryStrip`).
   - 카드: `주문 #XXXX` + `N개 품목` + `Rp X` (천단위 포맷). 모든 색은 semantic 토큰(`t.surface`/`t.border`/`t.ink`/`t.muted`) · 하드코딩 hex 없음.
   - `storeConfig.orderNumber` 비면 비노출(하위 호환 — 기존 responsive keypad 뷰 영향 0).
4. **포맷 함수 재사용 + semantic 토큰** — O. `formatRp` 는 CartScreen/KeypadScreen 와 동일 구현 재사용. 색 전부 theme 토큰.
5. **e2e** — O
   - `e2e/qris-keypad-summary.spec.ts`: landscape/portrait × en/id/ko × {qris-with-qr, qris-without-qr, keypad-summary} = **18/18**.
   - QR 치수 assert: landscape min-side ≥ 55% height · portrait width ≥ 60% width.
   - 기존 responsive 27/27 비회귀. 그 외 e2e 전체 82/82 (8 skipped — 기존 skip 유지).
6. **unit/typecheck** — O. vitest 195/195. `pnpm typecheck` customer-display 0 errors.

## 서버 계약 확인 (#378)
- `src/types/order-snapshot.ts` 에 `qr_string?: string | null` + `amount?: number | null` 필드 추가 (nullable · 하위 호환).
- 서버 쪽은 R2(POS fork #193, M0-1118-L) 가 `payment_qris` 상태에서 upsert 시 두 필드를 함께 보낼 예정. 현재 commerce-core 의 `serializeSnapshot` 은 `qr_string`/`amount` 를 아직 serialize 하지 않음 — R2 머지 때 추가(이 PR 범위 밖).

## 금지 준수
- `src/lib/pairing.ts` · display-machine seq/라우팅 규칙 수정 없음(payment_qris → qris 분기만 추가 · 멱등성 로직 그대로).
- commerce-core · POS 앱 코드 수정 없음.
- `~/projects/*` 에서 git 조작 없음.

## 커밋 · 푸시 로그
```
75550bc feat(customer-display): M0-1118-M — QRIS 손님 화면 + 번호 키패드 주문 요약 (#381 보완)
 18 files changed, 894 insertions(+), 14 deletions(-)
 create mode 100644 apps/customer-display/app/qris.tsx
 create mode 100644 apps/customer-display/e2e/qris-keypad-summary.spec.ts
 create mode 100644 apps/customer-display/src/screens/QrisScreen.tsx
 create mode 100644 apps/customer-display/src/types/qrcode.d.ts

+ 32034de...75550bc feat/M0-1118-K-cd-sync-r3 -> feat/M0-1118-K-cd-sync-r3 (forced update)
```

## 변경 파일 (18)
```
 apps/customer-display/app/index.tsx                |  20 ++
 apps/customer-display/app/keypad.tsx               |   1 +
 apps/customer-display/app/qris.tsx                 |  58 +++
 apps/customer-display/e2e/dev-server.mjs           |   6 +
 apps/customer-display/e2e/qris-keypad-summary.spec.ts | 104 ++++++
 apps/customer-display/package.json                 |   1 +
 apps/customer-display/src/i18n/context.tsx         |   4 +
 apps/customer-display/src/i18n/strings.ts          |  58 +++
 apps/customer-display/src/lib/__tests__/display-machine.test.ts |   4 +-
 apps/customer-display/src/lib/display-machine.ts   |   4 +-
 apps/customer-display/src/mocks/adapter.ts         |  30 ++-
 apps/customer-display/src/screens/KeypadScreen.tsx | 141 ++++++
 apps/customer-display/src/screens/QrisScreen.tsx   | 400 ++++++++++++++++++
 apps/customer-display/src/types/customer-display.ts |   9 +-
 apps/customer-display/src/types/order-snapshot.ts  |   4 +
 apps/customer-display/src/types/qrcode.d.ts        |  19 +
 docs/feature-map.yaml                              |   4 +-
 pnpm-lock.yaml                                     |  19 +-
```

## 미완 · 머지 금지
- 머지는 T0(게이트 통과) 소관. 본 리포트는 `커밋·push` 범위까지.
- Kyu 실기(iPad EAS 재설치) 미실행 — R2(fork #193, M0-1118-L) 서버 머지 후 세팅 필요.
