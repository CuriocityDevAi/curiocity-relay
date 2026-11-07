---
round: M2-1105-P
pr:
  fork: agilo-medusa-pos-fork#59
commit: 47990424262c21b4cee9c6e5ae991c347cbdcb43
outcome: 로고 비트맵 (GS v 0) + Cashier 줄 + 하단 여백 · 32/32 단위 어설션 · PNG 2장 · CI 전부 green
kyu_checks: 0 (lib/printer + docs 만 · 결제 UI 미건드림)
ci_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42378148742
ci_duration_s: 504
lint_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42378148739
lint_duration_s: 65
---

# M2-1105-P · receipt-escpos 로고 비트맵 + Cashier + 여백

**일자**: 2026-11-07 · **허브**: M2 · **base**: `master = b19539a` · **open-requirements.md**: 영수증 v2 완성

## 1. 산출물

| 파일 | 변경 |
|------|------|
| `lib/printer/logo-bitmap.ts` (신규 · 184라인) | pure 함수 (네이티브 모듈 0) · RGBA→gray · threshold · Atkinson dither · GS v 0 · 1-bit→PNG (zlib + 직접 CRC32) |
| `lib/printer/escpos.ts` | `EscPosBuilder.raw(bytes)` 메서드 추가 |
| `lib/printer/receipt-escpos.ts` | `RenderReceiptOptions.logoBitmap` 수용 · **Cashier 줄** · 하단 **LF×3 여백** |
| `lib/printer/index.ts` | `printReceipt(receipt, opts?)` · 타입 re-export |
| `scripts/m2-1105-p-logo-bitmap-assertions.mjs` (신규) | 32 어설션 · 8 블록 · PNG 2장 자동 산출 |
| `scripts/m2-1105-m-receipt-escpos-assertions.mjs` | tsc input + `--types node` 패치 (receipt-escpos 가 logo-bitmap 가져옴) |
| `docs/testing/logo-threshold.png` · `logo-dither.png` | 디스크 384×96 fixture · 1-bit grayscale PNG |
| `docs/testing/m2-1105-p-receipt-bitmap-sample.txt` | GS v 0 포함 영수증 디코드 텍스트 |

**제품 코드 미수정** · Settings "Test print" 미건드림 · success 화면 Reprint 미배선 (M3 소유).

## 2. 결정: default = **dither** (Atkinson)

384×96 디스크 radius 0.38 fixture 측정:
- threshold black=0.1136 · dither black=0.1137 · delta<0.02 (평균 밝기 보존 확인)

| 모드 | 장점 | 단점 | 적합 |
|------|------|------|------|
| threshold | 명도 cut 뚜렷 · 선명 | soft edge jagged · gradient 손실 | 모노 아이콘 (SVG 라인 전용) |
| **dither** (Atkinson 6/8) | 평균 밝기 보존 · gradient 매끄럽 · soft edge OK | 아주 세밀한 line art 는 약간 noisy | **로고 default** |

## 3. 바이트 스냅샷 (어설션 §7 결과)

- `renderReceiptEscPos(receipt, { logoBitmap: { widthPx: 384, heightPx: 64, oneBit } })`
- 산출 바이트에 **GS v 0 명령 (0x1D 0x76 0x30 …)** 포함 확인
- 디코드 후 텍스트에 `No. R-` · `Cashier Kyu Lee` · `Subtotal` · `TOTAL` · `CASH` 유지

### 디코드 샘플 (`docs/testing/m2-1105-p-receipt-bitmap-sample.txt`)

```
MEROS
Jakarta Main
Jl. Melati 1
--------------------------------
No. R-261107-0001
Date 2026-11-07 17:15 WIB
Order #42
Cashier Kyu Lee
--------------------------------
Cheese Bread
  1 x IDR 95,000      IDR 95,000
--------------------------------
Subtotal              IDR 95,000
TOTAL                 IDR 95,000
--------------------------------
CASH                  IDR 95,000
Received             IDR 100,000
Change                 IDR 5,000
--------------------------------
Thank you
```

(logoBitmap 주입 시 "MEROS" 자리에 GS v 0 raster 바이트 · 텍스트 디코더는 바이너리를 공백 처리)

## 4. 어설션 커버리지 (32/32)

- (1) rgbaToGrayscale BT.601 · 5건
- (2) thresholdToOneBit packed 1-bit + padding · 3건
- (3) atkinsonDitherToOneBit gradient 평균 밝기 보존 · 4건
- (4) escposRasterCommand GS v 0 (h>255 경계 포함) · 5건
- (5) 디스크 fixture PNG 2장 산출 + 서명/크기/black 비율 · 7건
- (6) 결정 default=dither (로그 가드) · 1건
- (7) renderReceiptEscPos + logoBitmap 통합 (GS v 0 · Cashier · Subtotal/TOTAL/CASH) · 4건
- (8) 하위 호환 (logoBitmap 없이 MEROS 텍스트 · 숫자 cols arg) · 3건

## 5. 검증 로그

| 체크 | 결과 |
|------|------|
| `node scripts/m2-1105-p-logo-bitmap-assertions.mjs` | **32/32 PASS** · 0.5s |
| `node scripts/run-all.mjs assertions` | **16/16 PASS** · 2.5s |
| `npx expo export -p web` | BUILD SUCCEEDED |
| `node scripts/run-all.mjs playwright` | **17/17 PASS** · 269s |
| isolated `npm ci --legacy-peer-deps` | exit 0 |
| `npx tsc --noEmit` | clean (기존 global.css 경고만) |
| fork CI `Lint` | ✓ **65s** |
| fork CI `assertions + playwright` | ✓ **8m20s** (504s) |

## 6. 설계 메모

- **pure Node only** — `node:zlib` 외 의존 0 · RN · canvas · sharp 없음 · 어설션 Node 즉시 import
- **1-bit 포맷** · bit 7 = leftmost · 1 = black (ESC/POS 표준)
- **CRC32 직접 구현** — zlib.crc32 가 Node 에 미노출 · 256-entry lazy table
- **snapshot-first 유지** — `logoBitmap` 은 호출자 책임 (RN 측 react-native-svg → raster 변환은 별도 라운드)
- **하위 호환** — `renderReceiptEscPos(receipt, cols=32)` 숫자 arg 계속 동작

## 7. 범위 밖 (후속)

- RN 측 `react-native-svg` → raster 어댑터 (M3 또는 M1 영수증 화면 소유)
- BT-58D 실측 로고 품질 (threshold vs dither · dev-client 빌드 뒤)
- M3 success/orders 화면의 Reprint 버튼 → `printReceipt` 배선

## 8. 참고

- fork PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/59
- 브랜치: `feat/m2-1105-p-logo-bitmap` · 커밋 `4799042`
- CI 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42378148742 (8m20s)
- Lint 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42378148739 (65s)
- 선행: M2-1105-M (snapshot → ESC/POS 렌더러) · M1-1105-Q (Cashier 컨트랙트)
