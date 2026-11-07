---
round: M2-1105-R
pr:
  fork: agilo-medusa-pos-fork#63
commit: cc8830d1143de59950f8660286db4ef504eb3006
outcome: 영수증 로고 D1 (60 → 110px · 1.833×) · 공용 `lib/receipt-layout.ts` · 37/37 어설션 · 18/18 run-all · PNG 2장 · CI 전부 green
kyu_checks: 0 (lib/** + scripts/** + docs/testing/** 만 · 화면·API 미건드림)
ci_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42391386241
ci_duration_s: 573
lint_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42391386216
lint_duration_s: 48
---

# M2-1105-R · 영수증 로고 ~1.83× + 공용 `receipt-layout`

**일자**: 2026-11-07 · **허브**: M2 · **base**: `master = a0bfcd6` · **open-requirements.md**: 🔴 Kyu 실기 7차 (11-07 23:01)

## 1. 왜

Kyu 실기 7차 (11-07 23:01) · *"영수증 로고가 너무 작음 — 최소 1.8배(위아래로)"* (D1).

ReceiptCard 는 `height: 60` 하드코드 · 프린터는 `384px` 폭을 다른 자리에서 각자 알고 있었다. 수치가 한 자리에 없으면 다음 조정이 또 흩어진다 → **`lib/receipt-layout.ts`** 로 올리고 화면·프린터 둘 다 같은 값을 import 하도록 통일한다. 이번 라운드는 파일 생성 + 프린터 쪽 배선 + 검증만 (화면은 M3).

## 2. 산출물

| 파일 | 변경 |
|------|------|
| `lib/receipt-layout.ts` (신규 · 55라인) | **pure 상수/함수 (JS core 만)** · `PRINTER_WIDTH_DOTS=384` · `LOGO={maxHeightPx:110, maxWidthRatio:0.8}` · `logoMaxHeightDots=110` · `logoMaxWidthDots=304` · `BLOCK_GAP_LINES=1` · `TAIL_FEED_LINES=3` · `fitLogoDimensions(srcW,srcH)` |
| `lib/printer/logo-bitmap.ts` | `resampleRgbaNearestNeighbor(rgba, srcW, srcH, destW, destH)` 추가 (pure) |
| `lib/printer/receipt-escpos.ts` | `BLOCK_GAP_LINES` · `TAIL_FEED_LINES` import (바이트 결과 동일 · 숫자 리터럴 제거) |
| `scripts/m2-1105-p-logo-bitmap-assertions.mjs` | §9 블록 +5 → **37/37 PASS** (`receipt-layout` + resample 포함) |
| `scripts/m2-1105-r-logo-size-preview.mjs` (신규) | aspect 2.5:1 모의 로고 → OLD 60 vs NEW 110 PNG 2장 산출 |
| `docs/testing/m2-1105-r-logo-old-60.png` · `m2-1105-r-logo-new-110.png` | 1-bit Atkinson dither 결과 · 세로 1.833× 실측 |

**화면 미수정** · `components/**` · `api/**` · 네이티브 모듈 0건.

## 3. 결정: `LOGO = { maxHeightPx: 110, maxWidthRatio: 0.8 }`

- **maxHeightPx 110** — 이전 60 의 **1.833×** (Kyu 요구 "최소 1.8배" 상회).
- **maxWidthRatio 0.8** — 58mm 384dot 기준 `384 × 0.8 = 307.2` → **÷8 floor = 304** (packed 1-bit `ceil(w/8)` 바이트/줄 안전).
- 화면 CSS px ↔ 프린터 dot **1:1** — 영수증 화면이 물리 용지를 모사하므로 환산 계수 없이 같은 숫자로 의도 전달.

## 4. `fitLogoDimensions` 동작

| 입력 (srcW × srcH · aspect) | 결과 (w × h) | 왜 |
|------|------|------|
| 400 × 200 (2:1 · 가로형) | **224 × 110** | h=110 로 올림 → w=220 → 8배수 ceil 224 (≤304) |
| 200 × 600 (1:3 · 세로형) | **40 × 110** | h=110 · w=37 → 8배수 ceil 40 (폭 상한 미도달) |
| 600 × 240 (2.5:1 · 매장 로고 유사) | **280 × 110** | h=110 · w=275 → 8배수 ceil 280 (≤304 · preview 실측 1.833×) |
| 600 × 200 (3:1) | 304 × 101 | h=110 → w=330 > 304 → **폭 상한 clamp** · h=round(304/3)=101 |

가로로 아주 긴 로고(aspect > 2.76)는 폭 상한 때문에 1.83× 미만이지만, 실제 매장 로고 "숲속의 과자점" 은 2:1~2.6:1 범위라 D1 그대로 유효.

## 5. 어설션 커버리지 (37/37)

기존 32 (M2-1105-P) + 신규 **5** = **37**.

- (9a) `LOGO.maxHeightPx === 110` (이전 60 의 1.833×)
- (9b) `logoMaxWidthDots === 304` · 8배수 정렬
- (9c) `fit(400,200)` → `h=110 · w=224` (byte-aligned)
- (9d) `fit(200,600)` → `h=110 · w=40` · `BLOCK_GAP_LINES=1` · `TAIL_FEED_LINES=3`
- (9e) `resample 2×2→4×4` · 64바이트 · 좌상 red · 우하 yellow

## 6. 검증 로그

| 체크 | 결과 |
|------|------|
| `node scripts/m2-1105-p-logo-bitmap-assertions.mjs` | **37/37 PASS** · 0.7s |
| `node scripts/run-all.mjs assertions` | **18/18 PASS** · 51.9s (M2-1105-Q bundle guard 46.3s 포함) |
| `node scripts/m2-1105-r-logo-size-preview.mjs` | OLD 152×60 · NEW 280×110 · **1.833×** |
| `npx tsc --noEmit` | clean |
| fork CI `Lint` | ✓ **48s** |
| fork CI `assertions + playwright` | ✓ **9m33s** |

## 7. PNG 미리보기 (전/후)

- `docs/testing/m2-1105-r-logo-old-60.png` · 152 × 60 dot (OLD · `maxHeightPx=60`)
- `docs/testing/m2-1105-r-logo-new-110.png` · 280 × 110 dot (NEW · `maxHeightPx=110`)

실측 세로 비율 **1.833×** · (preview 스크립트 stdout).

## 8. 번들 가드 (M2-1105-Q 유지)

`lib/receipt-layout.ts` 는 Uint8Array·Math 만 사용 · `node:*` 0 · bare core 0.
`lib/printer/logo-bitmap.ts` 의 신규 `resampleRgbaNearestNeighbor` 도 pure JS.

M2-1105-Q 가드 그대로 통과:
- (1) 정적 grep · 0 건 위반
- (2) Metro iOS export (`expo export -p ios --dev`) · ✓ (CI 46.3s)

## 9. M3 안내 (한 줄)

> `ReceiptCard.tsx:128` 은 `import { LOGO } from '@/lib/receipt-layout'` 뒤 `height: 60` → `height: LOGO.maxHeightPx` 로만 교체하면 끝.

이번 PR 은 **화면 컴포넌트 미수정** (파일 주인 M3).

## 10. 범위 밖 (후속)

- 실 매장 로고 (숲속의 과자점) RGBA 바이트는 Admin 업로드 뒤 (M0) → 본 PR fixture 는 심볼+워드마크 유사 모의 (aspect 2.5:1).
- `ReceiptCard.tsx` LOGO.maxHeightPx 배선 (M3 · 다음 라운드).
- BT-58D 실측 로고 품질 (threshold vs dither · dev-client 빌드 뒤).

## 11. 참고

- fork PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/63
- 브랜치: `feat/m2-1105-r-logo-bigger` · 커밋 `cc8830d`
- CI 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42391386241 (9m33s)
- Lint 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42391386216 (48s)
- 선행: M2-1105-P (로고 비트맵) · M2-1105-Q (번들 가드)
