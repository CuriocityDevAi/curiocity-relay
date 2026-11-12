# R0-1105-CC 리뷰 리포트 — fork #100 · QR 생성 유틸 + Scan 탭 QR 분기

작성일: 2026-11-12  
대상 PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/100  
브랜치: feat/m0-1105-as-order-qr-scan → master

---

## 판정: **CHANGES**

`scan.tsx:89` setErrorMessage('Order not found') — 바코드(상품) 스캔 경로의 else 분기에 잘못된 메시지. 훅의 onSuccess가 이미 'Product not found'를 설정하므로 그것이 덮어써진다.

---

## 검증 표

| # | 항목 | 판정 | file:line |
|---|------|------|-----------|
| 1 | `orderQrPayload` → `merospos://orders/{id}` | ✅ | `lib/qr.ts:19` |
| 2 | `parseScanPayload` order 분기 (merospos://orders/ 접두어) | ✅ | `lib/qr.ts:67-70` |
| 3 | `parseScanPayload` barcode 분기 (그 외 모든 값) | ✅ | `lib/qr.ts:72` |
| 4 | 이상한 URL → type=barcode (다른 앱 QR) | ✅ | `lib/qr.ts:67` (startsWith 미충족 → barcode) |
| 5 | 확장 자리 주석 (membership 등) | ✅ | `lib/qr.ts:63-69` |
| 6 | `barcodeTypes`에 `'qr'` 추가 | ✅ | `app/(tabs)/scan.tsx:133` |
| 7 | 주문 QR → `/orders/{orderId}` router.push | ✅ | `app/(tabs)/scan.tsx:72` |
| 8 | 연속 중복 이동 방지 (scannedBarcodeRef, 1.5s 리셋) | ✅ | `app/(tabs)/scan.tsx:65-77` |
| 9 | 없는 주문 처리 → `/orders/[orderId]` 라우트가 404 담당 | ✅ | 라우트 위임 |
| 10 | 기존 상품 바코드 동작 불변 | ✅ | `app/(tabs)/scan.tsx:80-95` |
| 11 | **setErrorMessage('Order not found') — 바코드 경로 버그** | ❌ | `app/(tabs)/scan.tsx:89` |
| 12 | GS v 0 LogoBitmap 타입 호환 | ✅ | `lib/qr.ts:28-55`, `lib/printer/receipt-escpos.ts:L10-15` |
| 13 | 58mm(384px) 적합 · 174px QR | ✅ | `lib/qr.ts:29` (CELL_PX=6, 29mod×6=174px) |
| 14 | QR PNG 샘플 git ls-tree 커밋 | ✅ | `docs/testing/m0-1105-as-qr-sample.png` (blob f041b82) |
| 15 | 어설션 20/22 PASS | ⚠️ | 2 fail = prettier 사전이슈 (아래 §번들) |
| 16 | `app.json` scheme `merospos` 등록 | ✅ | `app.json:"scheme":"merospos"` |

---

## 번들 안전 근거

`qrcode@1.5.4` Metro 번들 체크 결과:

- `package.json browser` 필드: `"./lib/index.js": "./lib/browser.js"` — Metro browser-field 우선 로드 ✅
- `browser.js` 직접 의존(`canvas.js`, `svg-tag.js`, `can-promise.js`, `core/qrcode.js`): `fs`/`stream`/`node:` import 0건 ✅
- `fs` require가 있는 파일(`renderer/png.js`, `renderer/svg.js`, `renderer/utf8.js`, `renderer/terminal.js`)은 `lib/server.js` 경로 전용 — `browser.js`에서 require 안 함 ✅
- `lib/qr.ts`는 `create as qrCreate`만 import — `browser.js`의 `exports.create = QRCode.create` 직접 사용 ✅
- R0 체크 ⑦ 충족

**prettier 실패 근거**: `prettier-plugin-tailwindcss` 가 프로젝트 내 `.ts`/`.tsx` 파일에서 `SyntaxError: Unexpected token (66:3)` 를 일으키는 사전 이슈. 이 PR 이전에 `lib/printer/logo-bitmap.ts` (master)에서도 동일 에러 재현됨 — PR 귀책 아님. 별도 수정 필요.

---

## #98 관계

PR #98(`fix/m3-1105-aw-void-ui`) 는 **이미 머지** 완료 (state: MERGED). `ReceiptCard.tsx` 충돌 우려 해소. 이 PR 머지 차단 없음.

---

## QR PNG 경로 (Kyu 휴대폰 실기)

```
docs/testing/m0-1105-as-qr-sample.png
```

내용: `merospos://orders/01JT9XABCDEF1234567890AB`  
크기: 300×300 PNG (RGBA, non-interlaced)

---

## CHANGES 필수 수정

### scan.tsx:89 — setErrorMessage('Order not found') 삭제

**문제**: `scanBarcodeMutation.mutate(data, { onSuccess })` 의 else 분기(상품 미발견)에서 'Order not found' 메시지를 설정함. 그러나 `useScanBarcode` 훅에 이미 `onSuccess(null)` → `setErrorMessage('Product not found')` + haptics error 처리가 있음. 인라인 콜백이 나중에 실행되어 올바른 메시지를 덮어쓴다.

**수정 전** (`app/(tabs)/scan.tsx:85-94`):
```ts
} else {
  setErrorMessage('Order not found');
  setTimeout(() => {
    scannedBarcodeRef.current = false;
  }, 2000);
}
```

**수정 후**:
```ts
} else {
  setTimeout(() => {
    scannedBarcodeRef.current = false;
  }, 2000);
}
```

ref 리셋 타이머는 유지(barcode not found일 때도 ref 해제 필요). 에러 메시지·haptics는 훅 onSuccess가 담당.

---

## 이연 순증감

| 항목 | 증감 |
|------|------|
| 패키지: `qrcode@1.5.4` (~40KB browser 엔트리) | +1 |
| `lib/qr.ts` (신규 79줄) | +1 |
| `app/(tabs)/scan.tsx` (+21줄 수정) | ± |
| 신규 API 엔드포인트 | 0 (deeplink 직접 라우팅) |
| Round 2 의존성 (#98 선행) | ✅ 해소됨 (merged) |

---

## 착지 명령

```bash
cp /tmp/R0-1105-CC-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CC-report.md && git commit -m "r0: R0-1105-CC" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CC done "CHANGES: scan.tsx:89 setErrorMessage('Order not found') 삭제 — 바코드 경로 else 분기 오메시지(훅 onSuccess가 이미 Product not found 처리)"
```
