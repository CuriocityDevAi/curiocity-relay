---
name: R0-1105-AC · 허브-1107-AC fork #61 긴급 핫픽스 리뷰 (M2-1105-Q)
description: fork #61 (M2-1105-Q · node:zlib 제거 + RN 번들 가드) · base master b332508 · Kyu 실기 4차 "Unable to resolve module node:zlib" 회귀 핫픽스 · APPROVE · 실측 iOS 번들 해석 성공 + 가드 역검증 FAIL 1회 확인
author: R0
dated: 2026-11-07
---

# R0-1105-AC · fork #61 핫픽스 리뷰 (M2-1105-Q)

**스코프**: fork PR #61 (`feat/m2-1105-q-bundle-hotfix` HEAD `d9c469d` · base `master b332508` = #59 머지 직후).
**직전**: R0-1105-AA → #59 APPROVE 당시 §B.3 "node:zlib deferred risk" 를 "M3 wire-up 라운드에서 분리" 로 보류 → 11-07 21:30 Kyu 실기 4차에서 RN 번들 로드가 실제로 깨짐 → 본 PR 이 선제 핫픽스.
**claim**: `status/claims/R0-1105-AC.json` (runner started 기록 · 리포트 push 수동).
**금지**: 코드 수정 · 커밋.

## 판정

| PR | head | 판정 |
| --- | --- | --- |
| **fork #61** (M2-1105-Q · node:zlib 제거 + 번들 가드) | `d9c469d` | **APPROVE** — `lib/printer/**` Node 전용 import **0** (실측 grep) · PNG writer `scripts/m2-logo-preview.mjs` 로 정확히 이전 · `escposRasterCommand` 함수 **바이트-동등** (#59 와 diff 0) · 32/32 어설션 PASS · 가드 **역검증 FAIL 1회 확인** (exit 1) · 실측 `npx expo export -p ios --dev` **BUILD SUCCEEDED 14.8s** · 번들 artifact 에 `node:*` 리터럴 **0** · PrinterRow/lib/printer 심볼 bundle 내 **30 참조** · master `b332508` 와 merge-tree clean (tree `52273b2`) |

핫픽스 스코프(§B.3 분리)만 정확히 실행 · 금지 영역 변경 0 · 기능 회귀 0 (ESC/POS 출력 바이트 동일).

---

## §A · 실측 검증

### §A.1 · `lib/printer/**` Node 전용 import 0 (실측 grep)

좌표:
```
Grep pattern: node:|require|from ... fs|path|zlib|crypto|child_process|os|url|stream|buffer|http|https|net|tls|dns|module|vm|readline
path: lib/printer
```

매치 **3건** 전부 **주석 (설명)** — 실제 import 아님:
- `lib/printer/logo-bitmap.ts:2` — `// M2-1105-Q · node:zlib + PNG writer 제거 → ...`
- `lib/printer/logo-bitmap.ts:6` — `// node:* / Node 전용 심볼은 Metro 가 해석 못해...`
- `lib/printer/logo-bitmap.ts:7` — `// (11-07 21:30 Kyu 실기 4차: "Unable to resolve module node:zlib")`

**실행 가능한 Node-only import = 0** ✓. `Buffer`/`process`/`global`/`__dirname`/`__filename` 전부 0 (`lib/printer/ble.ts:185-187` 은 "RN 에 Buffer 없음 → atob/btoa 사용" 주석 — 오히려 RN-safe 설계 재확인).

### §A.2 · PNG 인코딩 `scripts/` 로 이전

- 신규: `scripts/m2-logo-preview.mjs` (91 라인) · Node 전용 (`import { deflateSync } from 'node:zlib'` 스크립트 top · OK — 어설션 러너는 Node).
- `scripts/m2-1105-p-logo-bitmap-assertions.mjs:27` — `const { oneBitToPngGrayscale } = await import('./m2-logo-preview.mjs')` 로 교체 (PR body 와 일치).
- `lib/printer/logo-bitmap.ts` 에서 `oneBitToPngGrayscale` · `buildChunk` · `writeU32BE` · `crc32` · `CRC_TABLE` **5개 심볼 전부 제거** (85 deletions). 공개 API: `rgbaToGrayscale` · `thresholdToOneBit` · `atkinsonDitherToOneBit` · `escposRasterCommand` + fixture 유틸만 남음 (§B.1 R0-1105-AA 와 동일 shape).

### §A.3 · ESC/POS raster 바이트 스냅샷 ≡ #59 (기능 회귀 0)

**실측 diff** (`git diff master..pr-61`):

| 파일 | 변경 |
| --- | --- |
| `lib/printer/escpos.ts` | **0 바이트** 변경 |
| `lib/printer/receipt-escpos.ts` | **0 바이트** 변경 |
| `lib/printer/index.ts` | **0 바이트** 변경 |
| `lib/printer/ble.ts` | **0 바이트** 변경 |
| `lib/printer/receipt.ts` | **0 바이트** 변경 |
| `lib/printer/logo-bitmap.ts` | PNG writer + `node:zlib` 삭제 · `escposRasterCommand` · `rgbaToGrayscale` · `thresholdToOneBit` · `atkinsonDitherToOneBit` **함수 본체 0 변경** (grep 재확인) |

→ **GS v 0 raster 출력 바이트 = #59 와 bit-identical**.

**어설션 실행 (`node scripts/m2-1105-p-logo-bitmap-assertions.mjs`)**: **32/32 PASS · 0 failed** (stdout 꼬리 보존):
- (4a-4e) `GS v 0` 헤더 `1D 76 30 00` · `xL=48 xH=0` · `yL=48 yH=0` · `h=300 → yL=44 yH=1 (0x12C)` ✓
- (5e-5g) threshold/dither black 비율 = `0.1136/0.1137` · `|Δ|<0.02` · 디스크 면적 π·0.38²/1 ≈ 0.113 근사 ✓
- (7a) renderReceiptEscPos 바이트에 `GS v 0` 포함 ✓
- (8b) logoBitmap 없이 cols=32 fallback → `GS v 0` 미포함 ✓

### §A.4 · 번들 가드 역검증 — "넣으면 빨강" 1회 확인

**임시 삽입** `lib/__guard_test/bad.ts`:
```ts
import { deflateSync } from 'node:zlib';
import fs from 'fs';
export const x = { deflateSync, fs };
```

**가드 실행** `M2_SKIP_BUNDLE=1 node scripts/m2-1105-q-bundle-guard.mjs`:
```
[guard] ✗ 2 건 위반 · RN 에서 돌 수 있는 것만
  lib/__guard_test/bad.ts:1 · node:-prefix · "zlib"
     import { deflateSync } from 'node:zlib';
  lib/__guard_test/bad.ts:2 · bare-node-core · "fs"
     import fs from 'fs';
EXIT=1
```

→ **node:-prefix + bare-node-core 둘 다 감지** · exit 1 ✓.

**원복**: `rm -rf lib/__guard_test` → `git status` clean (코드 변경 0 · 커밋 0).

가드 재실행 (clean 상태):
```
[guard] (1) 정적 grep · lib/** · components/** · app/**
  · lib/ · 9 파일 · components/ · 100 파일 · app/ · 28 파일
[guard]   ✓ 정적 grep 0 건 위반
```

**주석 skip 로직** (`scripts/m2-1105-q-bundle-guard.mjs:67`) — `trimmed.startsWith('//')` 이 §A.1 의 주석 3건을 올바르게 걸러냄 → false positive 0.

### §A.5 · 실측 Metro iOS 번들 해석 — BUILD SUCCEEDED

실행: `CI=1 EXPO_NO_TELEMETRY=1 npx expo export -p ios --dev --output-dir /tmp/ac-bundle-XXXX`

| 지표 | 값 |
| --- | --- |
| Metro Bundler | **iOS Bundled 14828ms** · 4938 modules |
| Exit code | **0** |
| Bundle 크기 | 22MB (`_expo/static/js/ios/entry-*.js`) |
| Assets | 32 |
| 번들 artifact 에 `'node:*'` 리터럴 (`grep -o`) | **0** (single + double quote 둘 다 0) |
| 번들 artifact 에 `PrinterRow\|lib/printer\|renderReceiptEscPos\|escposRasterCommand` 심볼 (`grep -c`) | **30** |

→ Settings 탭 `app/settings/printer.tsx` → `components/printer/PrinterRow.tsx` → `@/lib/printer` 체인 전체가 **Metro 해석 성공** · 심볼이 번들 내 실존 · "Unable to resolve module node:zlib" 회귀 완전 봉합.

**`@sentry/react-native/expo` organization/project missing** 경고 1건은 번들 실패 아님 (환경 변수 fallback 안내) · 핫픽스 스코프 밖.

### §A.6 · 금지 영역 변경 0 · master merge-tree clean

변경 **6 파일** 전부 핫픽스 스코프:
- `lib/printer/logo-bitmap.ts` (modified · +8 -85)
- `scripts/m2-logo-preview.mjs` (new · +91)
- `scripts/m2-1105-p-logo-bitmap-assertions.mjs` (modified · +6 -2)
- `scripts/m2-1105-q-bundle-guard.mjs` (new · +180)
- `docs/testing/logo-threshold.png` (regenerated · 바이트는 zlib defaults 로 재현 불가라 재커밋 — PR body 명시)
- `docs/testing/logo-dither.png` (regenerated · 동일)

`app/**` · `components/**` · `hooks/**` · `api/**` · `types/**` · `package.json` **변경 0건** ✓ · printer public API (`renderReceiptEscPos` · `escposRasterCommand` · `printReceipt`) signature 동일.

`git merge-tree --write-tree master pr-61` → `52273b21138ebc5f330f44d0d17791caf7a502cf` (tree-only · 충돌 메시지 0) ✓.

---

## §B · CI 상태

| 축 | 상태 |
| --- | --- |
| GitHub `pull_request.mergeable_state` | **clean** (API 응답 실측) |
| check-runs API | **403 Resource not accessible by integration** — MCP 통합 권한 제한 (R0-1105-AA §C 와 동일 사유). 머지 전 Actions 탭 수동 재확인 권장 |
| PR body 자가 보고 | `m2-1105-p-logo-bitmap-assertions 32/32 PASS` · `m2-1105-q-bundle-guard 0 위반` · `expo export -p ios --dev 37.3s PASS` · `m2-1105-c-settings-playwright 8/8 PASS` · `run-all` CI 에서 확인 |
| **R0 실측 재현** | 어설션 32/32 · 가드 정적 grep 0 위반 · 가드 역검증 exit=1 · `expo export -p ios --dev` exit=0 (14.8s) · 번들 node:* 리터럴 0 · PrinterRow 심볼 30 — **5/5 재현 통과** |

---

## §C · APPROVE 사유 요약

1. **스코프 정합**: R0-1105-AA §B.3 에서 "M3 wire-up 때 처리" 로 보류했던 `node:zlib` 모듈-top import 를 Kyu 실기 4차 전에 선제 분리 → §B.3 의 **정확한** 해법 (`scripts/m2-logo-preview.mjs` 로 Node-only 코드 이전).
2. **기능 회귀 0**: `escposRasterCommand` · threshold · dither 함수 본체 diff 0 · 어설션 32/32 PASS · 출력 바이트 bit-identical to #59.
3. **가드 유효성 자체 증명**: 임시 bad.ts 삽입 → exit 1 + 두 종류 위반 모두 감지 (node: prefix + bare node core) → 역검증 OK · 원복 clean.
4. **실 번들 해석 OK**: `npx expo export -p ios --dev` exit 0 · 22MB 번들에 `node:*` 리터럴 0 · PrinterRow/lib/printer 심볼 30건 확인 → Settings 탭 PrinterRow 포함 경로 전체 Metro 해석 가능.
5. **금지 영역 변경 0** · `mergeable_state: clean` · merge-tree clean (`52273b2`).

**머지 시**: fast-forward 가능 (master `b332508` 위 1 커밋). 머지 후 Kyu 실기 5차 시 iPad 시뮬레이터 로드 재검증 권장 (Metro iOS 번들 성공은 실측 확인되었으나 디바이스 실행은 R0 리소스 밖).

---

## §D · 다음 R0 대기

- Kyu 실기 5차 (fork #61 머지 후 iPad 시뮬레이터 실제 로드 재현) 결과 수집.
- M3 (영수증 Reprint wire-up · P3 거래 종류/잔금/Delivery) R0 리뷰 발부 예상.
- 가드 CI 통합 추적 — `run-all.mjs` 의 `-guard.mjs` 패턴에 자동 포함되는지 다음 라운드 CI 로그에서 확인.

---

## §E · 원장 대사 체크 (open-requirements.md)

- 🔴 **Kyu 실기 4차 앱 크래시 (#59 node:zlib)** → **본 PR #61 머지로 해소 착지** · 가드가 regression 재주입 봉쇄 (역검증 완료).
- 🔴 영수증 로고(프린터) → #59 에서 GS v 0 raster 지원 · **본 PR 로 번들 호환 복원** · 기능 회귀 0.
- 규칙 ⑨ (Kyu 실기 재현 가능하도록) 재언급 유지 — 본 PR 이 **"어설션 통과 ≠ 실제 번들 통과"** 를 가드로 성문화.

---

## 링크

- fork #61: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/61
- base: fork master `b332508` (#59 M2-1105-P 머지 직후)
- 직전: `curiocity-relay/r0/R0-1105-AB-report.md` (보유 시) · R0-1105-AA §B.3 (deferred risk 원주)
- claim: `curiocity-relay/status/claims/R0-1105-AC.json`
