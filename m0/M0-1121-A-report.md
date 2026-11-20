원인 (e) 로고 bitmap 파이프라인 자동 영수증 인쇄 경로에 wiring 되지 않음 · 수정 `lib/printer/logo-fetch.ts` wiring 토대 + skip 사유 `console.warn` 1줄 + success 화면 2곳 call site 경유 · native 변경 X · PR #220 · tests 9/9 (전체 899/910 pass · 2 fail pre-existing 무관)

## 근거 숫자

- `grep -rn "logoBitmap:" app/ components/ hooks/ lib/` → 호출 site **0** (오직 `lib/printer/receipt-escpos.ts` type 정의와 fallback 분기만).
- 자동 영수증 경로: `app/checkout/success/[orderId].tsx:173` (auto) · `:205` (reprint). 둘 다 `printReceipt(receipt)` 호출 시 `opts.logoBitmap` 전달 **없음**.
- `renderReceiptEscPos` (receipt-escpos.ts:171) 가 `opts.logoBitmap ?? null` → `logoSlot` (:81) 이 `if (logoBitmap && ...)` false → 텍스트 fallback 분기.
- **바이트 evidence**: 로고 영역 GS v 0 명령 (`1D 76 30`) 출현 횟수 **0**. 현재 로고 슬롯 출력 바이트 = `ESC a 01` + `ESC E 01` + `store.name` ASCII + LF + `ESC E 00`. 다운로드/디코드 시도 **0회**.
- 가로 dot: 로고 bitmap 이 생성된 적 없으므로 측정값 **없음**. 로고 크기 정책 `LOGO.maxHeightPx=110` · `logoMaxWidthDots=304` 은 변동 없이 그대로 유지.
- QR 블록 (`receipt-escpos.ts:267` · `orderIdToQrBitmapCentered`, 384-dot GS v 0) 은 이미 동일 경로로 정상 출력 중 → chunk/BLE/프린터 raster 지원 자체는 OK. 즉 후보 (c)(d) 배제.

## 후보 중 다른 것들이 아닌 이유

| 후보 | 배제 근거 |
|------|-----------|
| (a) Android fetch/decode 조용히 skip | fetch 자체 시도 **0회** (호출 site 0) |
| (b) 가로 폭 384 dots 초과 | 로고 bitmap 자체 미생성 |
| (c) 래스터 chunk 넘침 | QR (동일 GS v 0 · 384 dot) 은 정상 인쇄 중 |
| (d) ESC * 필요 (GS v 0 미지원) | QR 이 GS v 0 로 정상 출력 중 |

→ **(e) 기타** 확정.

## 수정 요약

1. **`lib/printer/logo-fetch.ts`** (신규 · pure · `node:*` 금지 가드 통과):
   - `prepareLogoBitmapForPrint(url)` 헬퍼. 현재 URL 유무/공백 체크 후 `{kind:'skip', reason}` 반환. 디코더 wiring 은 M0-1121-B follow-up (pure-JS PNG 디코더 선정 뒤).
   - `formatSkipLog(receiptId, reason)` — `[print:<id>] skip logo bitmap · <reason>` 1줄 포맷.
2. **`app/checkout/success/[orderId].tsx`** (2 call site):
   - 라인 170-184 (auto print) · 203-212 (reprint). 헬퍼 경유 → skip 시 `console.warn` 1줄 → `printReceipt` 를 그대로 호출 (영수증 나머지 인쇄 유지 · "지금처럼").
3. **`__tests__/m0-1121-a-logo-print.test.ts`** (신규 9 테스트):
   - REQ-1 (URL skip 사유 4개) · REQ-2 (type 레벨 패턴 1개) · REQ-3 (텍스트 fallback 2개) · REQ-4 (logoBitmap 지정 시 GS v 0 바이트 1개) + formatSkipLog 1개.

## 테스트 실행 로그

### 신규 테스트 (`__tests__/m0-1121-a-logo-print.test.ts`)
```
RUN  v5.1.0
Test Files  1 passed (1)
     Tests  9 passed (9)
  Duration  265ms
```

### 전체 테스트 (`npm run test`)
```
Test Files  2 failed | 70 passed (72)
     Tests  2 failed | 899 passed | 6 expected fail | 3 todo (910)
```
- 2 failed = `__tests__/m1-1117-e-slip-flow.test.ts`. stash 교차 검증: 본 PR 베이스라인 (315a3b8 · #219 tip) 에서도 동일하게 2 fail — 본 PR **무관**.
- `npx tsc --noEmit` 신규 파일 (`lib/printer/logo-fetch.ts` · `__tests__/m0-1121-a-logo-print.test.ts` · `app/checkout/success/[orderId].tsx`) 에러 **0**. pre-existing 전체 에러는 FlashList/global.css 등 본 PR 무관.

## Kyu 실기 (PR 본문에 상세 기재 · 요약)

1. Metro 브랜치 교체: `git checkout --detach origin/fix/M0-1121-A-ble-logo && npm start`
2. OPPO Reload → 결제 1건
3. 자동 영수증 확인:
   - 상단 로고 그래픽 자리에 **매장 이름 텍스트** (지금처럼 · 변동 없음)
   - 중간 품목·합계·결제·하단 QR **정상 인쇄**
   - Metro console 에 로그 **한 줄**:
     - `[print:<rcptId>] skip logo bitmap · logo decoder not wired (url=… · follow-up M0-1121-B)`
     - 또는 `[print:<rcptId>] skip logo bitmap · no store.logo_url in receipt snapshot`

## 머지 순서

PR #220 base = `master`. **#219 (fix/M0-1120-E-ble-mtu-chunk · R0-1121-A 리뷰 중) 머지 후 머지.** #219 브랜치엔 커밋 추가 안 함.

## native 변경

**없음** · EAS 재빌드 불필요 · `node_modules` 추가 없음.

## 기술 선택지 (PR 본문에 3줄 기재)

1. wiring 토대 + 실패 사유 로그 (**채택**) — 번들 리스크 0 · 디코더 선정 전 토대.
2. upng-js (pure-JS PNG) — follow-up · bundle-guard 통과 확인 후.
3. 서버측 pre-raster (R2 업로드 시 commerce-core 가 1-bit 바이트 미리 생성) — scope 크고 cross-repo · 보류.

## Follow-up

M0-1121-B — `prepareLogoBitmapForPrint` 에 fetch + PNG 디코더 + Atkinson dither + `escposRasterCommand` 체인 연결. `scripts/m2-1105-q-bundle-guard.mjs` (node:* 금지 가드) 통과 후 머지.

## 산출물

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/220
- Branch: `fix/M0-1121-A-ble-logo` @ `f2704e0` · base `fix/M0-1120-E-ble-mtu-chunk` (#219)
- Worktree: `/Users/kyu.lee/curiocity-live/fork-wts/M0-1121-A-wt`
