#220 APPROVE · 번들 안전 O · 실패 경로 O

## 체크리스트

| 항목 | 결과 |
|------|------|
| 로고 체인 (자동 인쇄) | ✅ wired |
| 로고 체인 (재인쇄) | ✅ wired |
| 실패 경로 → 영수증 나머지 인쇄 | ✅ |
| 캐시 · in-flight 공유 | ✅ |
| 번들 안전 (정적 grep) | ✅ 0 위반 |
| 번들 안전 (Metro iOS 번들) | ✅ 15.9s |
| native 변경 | ✅ 0 |
| diff 범위 (로고 관련만) | ✅ 7 파일 |
| 하드코딩 색 | ✅ 0 |
| 테스트 17건 | ✅ 17/17 |
| 기존 프린터 테스트 | ✅ 42/42 |

---

## 1. 로고 체인

### `lib/printer/logo-fetch.ts` (신규 190 L)

```
prepareLogoBitmapForPrint(url)
  → logoUrl 없음/공백 → { kind: 'skip', reason: 'no store.logo_url …' }
  → 캐시 히트 → { kind: 'ok', bitmap }   (네트워크 0)
  → fetchShared(url)  [in-flight Promise 공유]
      fetch(url)
        → !res.ok → skip 'fetch <status>'
        → arrayBuffer()
      detectFormat(bytes)
        → png  → UPNG.decode → toRGBA8 → resampleRgbaNearestNeighbor
                 → fitLogoDimensions(srcW,srcH) → rgbaToGrayscale → atkinsonDitherToOneBit
                 → { kind: 'ok', bitmap }  · bitmapCache.set(url, entry)
        → jpeg | webp | unknown → skip 'unsupported logo format · <fmt>'
      catch → skip 'fetch error · <msg>' | 'PNG decode error · <msg>'
  → timeout 3000ms → skip 'timeout 3000ms · logo cache cold'  (bg fetch 계속)
```

### `receipt-escpos.ts:81` `logoSlot`

```typescript
if (logoBitmap && logoBitmap.widthPx > 0 && logoBitmap.heightPx > 0 && logoBitmap.oneBit.length > 0) {
  b.alignCenter();
  const bytes = escposRasterCommand(logoBitmap.oneBit, logoBitmap.widthPx, logoBitmap.heightPx);
  b.raw(bytes);   // → GS v 0 (1D 76 30) raster
  b.lf(BLOCK_GAP_LINES);
  return;
}
// fallback: store.name 또는 'MEROS'
```

### Call site — 자동 인쇄 (`[orderId].tsx:178`)

```typescript
void prepareLogoBitmapForPrint(logoUrl)
  .then((res) => {
    if (res.kind === 'skip') {
      console.warn(formatSkipLog(receipt.id, res.reason));
      return printReceipt(receipt);                  // logoBitmap 없이 → 텍스트 fallback
    }
    return printReceipt(receipt, { logoBitmap: res.bitmap });  // GS v 0 경로
  })
  .then((ok) => { if (!ok) setPrintFailed(true); });
```

### Call site — 재인쇄 (`[orderId].tsx:221`)

```typescript
const res = await prepareLogoBitmapForPrint(logoUrl);
if (res.kind === 'skip') console.warn(formatSkipLog(receipt?.id, res.reason));
const ok = await printReceipt(receipt, res.kind === 'ok' ? { logoBitmap: res.bitmap } : undefined);
```

`printReceipt(receipt, opts)` → `renderReceiptEscPos(receipt, opts)`:55 → `logoSlot(b, snapshot, opts?.logoBitmap)`:81 — 체인 완결.

---

## 2. 실패 경로

| 조건 | skip reason | 영수증 |
|------|-------------|--------|
| URL 없음/null/공백 | `no store.logo_url …` | ✅ 계속 |
| JPEG magic (FF D8 FF) | `unsupported logo format · jpeg` | ✅ 계속 |
| WebP magic (RIFF…WEBP) | `unsupported logo format · webp` | ✅ 계속 |
| HTTP 404/4xx/5xx | `fetch <status>` | ✅ 계속 |
| 네트워크 오류 | `fetch error · <msg>` | ✅ 계속 |
| 3초 타임아웃 (캐시 cold) | `timeout 3000ms · logo cache cold` | ✅ 계속 |

모든 skip 경로: `console.warn` 1줄 → `printReceipt(receipt)` (logoBitmap 없음) → 텍스트 fallback → 영수증 나머지 출력.

---

## 3. 캐시

- 모듈 레벨 `Map<url, CacheEntry>` · `Map<url, Promise>` (in-flight)
- `startLogoCachePreload(url)` — receipt 로드 즉시 useEffect 에서 호출, bg fetch 시작.
  - 같은 render 에서 auto-print effect 가 겹쳐도 Promise 1 개 공유 → fetch 1회.
- 두 번째 호출(재인쇄 등) → `bitmapCache.get(url)` 히트 → 즉시 ok.
- URL 바뀌면 자동 새 entry. 이전 entry는 Map 에서 삭제 없이 GC — 모듈 레벨이므로 앱 세션 내 각 URL 당 1 entry 유지 (메모리 누수 없음; 로고 URL 수는 1개).

---

## 4. 번들 안전

```
$ cd /tmp/wt-M0-1121-review && node scripts/m2-1105-q-bundle-guard.mjs
[guard] (1) 정적 grep · lib/** · components/** · app/**
  · lib/ · 38 파일
  · components/ · 140 파일
  · app/ · 31 파일
[guard]   ✓ 정적 grep 0 건 위반
[guard] (2) Metro iOS 번들 · expo export → /var/folders/.../m2-bundle-check-gNBM8N
[guard]   ✓ Metro iOS 번들 해석 성공 · 15.9s

[guard] ✓ 전체 통과
```

- upng-js 2.1.0 · pako 1.0.11: `require('pako')` 만 (node:* 없음). 정적 grep 0 위반. Metro 번들 통과.
- native 변경 0: `android/` · `ios/` 미수정. EAS 재빌드 불필요.

---

## 5. diff 범위

변경 7 파일 · 모두 로고 관련:

| 파일 | +/- | 용도 |
|------|-----|------|
| `lib/printer/logo-fetch.ts` | +190 | 신규: fetch+decode+캐시 파이프라인 |
| `__tests__/m0-1121-a-logo-print.test.ts` | +357 | 신규: REQ-1~9 (17 테스트) |
| `app/checkout/success/[orderId].tsx` | +26/-4 | 자동/재인쇄 call site wiring + preload hook |
| `types/native-modules.d.ts` | +28 | upng-js 타입 shim |
| `package.json` | +2 | upng-js + pako |
| `package-lock.json` | +17 | 잠금 |
| `docs/M0-1121-B-logo-preview.png` | added | Atkinson dither 결과 미리보기 |

하드코딩 색 0.

---

## 6. 테스트 실행 로그

### 신규 테스트 (`__tests__/m0-1121-a-logo-print.test.ts`)
```
$ cd /tmp/wt-M0-1121-review && npx vitest run __tests__/m0-1121-a-logo-print.test.ts

 RUN  v5.1.0 /private/tmp/wt-M0-1121-review

 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  08:26:33
   Duration  360ms (tests 50%, transform 31%, import 18%, worker 1%)
```

### 기존 프린터 테스트
```
$ cd /tmp/wt-M0-1121-review && npx vitest run tests/flows/m3-1118-j-printer.test.ts __tests__/m0-1120-e-ble-chunk.test.ts

 RUN  v5.1.0 /private/tmp/wt-M0-1121-review

 Test Files  2 passed (2)
      Tests  42 passed (42)
   Start at  08:26:38
   Duration  171ms
```

---

## 환경

- Worktree: `/tmp/wt-M0-1121-review` · HEAD `5b08a5a` (Merge branch 'master' into fix/M0-1121-A-ble-logo)
- node_modules: worktree 내 `npm install` (upng-js 2.1.0 · pako 1.0.11 포함)
- 플랫폼: darwin · Node 20
