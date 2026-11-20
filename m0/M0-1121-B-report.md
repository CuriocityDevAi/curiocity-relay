로고 인쇄 연결 O · 디코더 upng-js · 로고 포맷 PNG (1024×1024 → 112×110 dot) · 래스터 1548 B · native 변경 X · bundle-guard O · tests 17/17 (+ 전체 907/907 신규 pass, 사전 실패 2건은 M0-1121-B 무관)

## 요약

M0-1121-A 가 wiring 토대만 넣었던 상태 (호출 0 · 로고 미출력) 를 디코더 실연결로
끝냈다. 이제 `prepareLogoBitmapForPrint(url)` 가 fetch → PNG 디코드 → dither →
LogoBitmap 반환 → `renderReceiptEscPos` 가 GS v 0 raster 로 영수증에 박는다.

## 체인 연결 (파일별)

| 파일 | 역할 |
|------|------|
| `lib/printer/logo-fetch.ts` | fetch → PNG magic 검사 → UPNG.decode → fitLogoDimensions 리샘플 → grayscale → Atkinson dither → LogoBitmap · 메모리 캐시 · 3s 타임아웃 · `startLogoCachePreload` |
| `app/checkout/success/[orderId].tsx` | receipt 데이터 도착 즉시 `startLogoCachePreload` preload useEffect 추가 · 기존 두 call-site (자동 · reprint) 는 그대로 `prepareLogoBitmapForPrint` 경유 |
| `types/native-modules.d.ts` | upng-js shim (`decode` · `toRGBA8` · `encode`) |
| `package.json` · `package-lock.json` | upng-js 2.1.0 + pako 1.0.11 (둘 다 pure JS · node:* 없음) |
| `__tests__/m0-1121-a-logo-print.test.ts` | REQ-1~9 확장 (17건) |
| `docs/M0-1121-B-logo-preview.png` | 종이에 찍힐 Atkinson dither 모양 샘플 (112×110) |

## 설계 결정

### 디코더 = upng-js 2.1.0 (오케 결정)

- pure JS · `require('pako')` 만 (node:* 없음). pako 1.0.11 도 pure JS · 상대 경로
  require 만.
- 번들 가드 (`scripts/m2-1105-q-bundle-guard.mjs`) 통과 — 정적 grep 0 위반 + Metro
  iOS 번들 해석 16.6s OK.
- 서버 pre-raster 안은 보류 (scope 큼 · cross-repo). 디코드 오버헤드가 저전력 폰에서
  체감되면 재검토 — 현재는 캐시 + 선주입으로 체감 지연 0 목표.

### 포맷 지원

- **PNG 만**. magic bytes (89 50 4E 47 0D 0A 1A 0A) 검사.
- JPEG (FF D8 FF ...) · WebP (RIFF ... WEBP) 는 skip + 사유 명시. 운영 R2 가 PNG
  로 normalize 되는 전제. 실측 포맷은 Kyu 실기 때 Metro 로그로 확인 가능 (현재
  dev env 에 R2 URL 없음).

### 캐시 전략

- 모듈 레벨 `Map<url, CacheEntry>`.
- `startLogoCachePreload(url)` — receipt 데이터 도착 즉시 백그라운드 fetch 시작.
  자동 인쇄 effect 와 같은 render 에 겹쳐도 in-flight Promise 공유 → fetch 1회.
- 두번째 호출 (reprint 등) → 네트워크 0 · 즉시 ok.
- URL 바뀌면 자동으로 새 entry · 이전 entry GC.

### 타임아웃 = 3초

- 캐시 cold + 느린 네트워크에서도 결제-인쇄 간 지연 체감 상한 보장.
- 넘으면 `skip('timeout 3000ms · logo cache cold')` + 영수증 나머지 인쇄.
  백그라운드 fetch 는 계속 → 다음 인쇄 (재시도/reprint) 에선 캐시 hit.

## 측정

`assets/images/icon.png` (1024×1024 테스트 샘플 · 운영 R2 로고 URL 은 dev env
에 없음) 체인 통과:

| 항목 | 값 |
|------|----|
| src | 1024 × 1024 |
| dst | 112 × 110 dot |
| bytesPerRow | 14 |
| GS v 0 raster 길이 | **1548 B** (헤더 8 + 14×110) |
| 알고리즘 | Atkinson dither (에러 확산 6/8) |

실제 운영 로고 (Soopsok Sweets · aspect ≠ 1:1) 로 돌아가면 w/h 는 달라지나 동일
경로. 1.8배 정책 (`LOGO.maxHeightPx = 110` · M0-1107 Kyu 결정) 그대로 적용.

## 번들 안전

```
$ node scripts/m2-1105-q-bundle-guard.mjs
[guard] (1) 정적 grep · lib/** · components/** · app/** · 0 위반
[guard] (2) Metro iOS 번들 · expo export -p ios · 16.6s · ✓
[guard] ✓ 전체 통과
```

- upng-js · pako 는 `node_modules/` 에만. 번들 가드 scan roots (`lib` · `components`
  · `app`) 에 포함 X — static grep 대상은 아니나 Metro 실번들은 해석.
- native 변경 0. `android/` · `ios/` 미수정. EAS 재빌드 불필요.

## 테스트

```
$ npx vitest run __tests__/m0-1121-a-logo-print.test.ts
Test Files  1 passed (1)
     Tests  17 passed (17)
  Duration  373ms
```

- REQ-1~4 (M0-1121-A 유지): URL 유무 skip · fallback · GS v 0 raster 등장.
- REQ-5: PNG URL → ok · dst = fitLogoDimensions · oneBit len 일관.
- REQ-6: JPEG/WebP magic → skip + 포맷 명시.
- REQ-7: HTTP 404 / network error → skip.
- REQ-8: 캐시 두번째 호출 네트워크 0 · preload 후 timeoutMs=0 ok.
- REQ-9: 느린 fetch + timeoutMs=50 → skip('cache cold') · 1s 이내 응답.

전체 vitest:
```
Test Files  2 failed | 70 passed (72)
     Tests  2 failed | 907 passed | 6 expected fail | 3 todo (918)
```
- 2 failed = `__tests__/m1-1117-e-slip-flow.test.ts` (상태 격리 이슈) +
  `docs/plans/splitview-capture.spec.ts` (playwright 가 vitest 에 잡힘). **M0-1121-B
  무관** · master 에서도 동일 실패 (stash 교차 검증 완료).

typecheck:
```
$ npx tsc --noEmit | grep -c "error TS"
15
```
- master baseline 과 동일 · 본 라운드 신규 TS 에러 0. (사전 15건은 FlashList,
  global.css 등 무관 항목.)

## PR 상태

- **PR #220** · fix/M0-1121-A-ble-logo
- master 최신 (`ba74a8d`) merge 완료 (`79a374d`).
- 커밋 추가: `df567fb` (코드) + `a5ef2ca` (preview PNG docs).
- 제목/본문 갱신 — Kyu 실기 절차 4단계 (checkout → npm install → Reload → 결제
  1건) + 체인 다이어그램 + 측정표 + 테스트 로그.
- URL: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/220

## Follow-up 후보

- 운영 R2 URL 로 실측 bit map 크기 수집 (Kyu 실기 Metro 로그로 Soopsok 로고
  w×h 확인 후 report 갱신).
- JPEG/WebP 지원 필요성 재검토 — 현재는 운영 업로드가 PNG normalize 전제.
- iOS/저전력 Android 에서 UPNG decode 시간 측정 (현재 iOS 시뮬 수백 ms 예상).
