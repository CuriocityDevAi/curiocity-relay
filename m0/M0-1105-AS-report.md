# M0-1105-AS 완료 리포트 — QR 생성 유틸 + Scan 탭 QR 분기 (Round 1, 3)

작성일: 2026-11-12

---

## 1. 항목 1~4 표

| 항목 | 파일:줄 | 커밋 |
|------|---------|------|
| Round 1 · `orderQrPayload(orderId)` → `merospos://orders/{id}` | `lib/qr.ts:14` | 0961bbb |
| Round 1 · `orderIdToQrBitmap(orderId)` → `LogoBitmap` (GS v 0 raster · 174×174px · ~21.5mm@203DPI) | `lib/qr.ts:28` | 0961bbb |
| Round 1 · `orderIdToQrEscpos(orderId)` → `Uint8Array` (편의 함수) | `lib/qr.ts:55` | 0961bbb |
| Round 1 · `parseScanPayload(data)` → `{type:'order', orderId}` / `{type:'barcode', code}` | `lib/qr.ts:63` | 0961bbb |
| Round 3 · `barcodeTypes` 에 `'qr'` 추가 | `app/(tabs)/scan.tsx:118` | 0961bbb |
| Round 3 · `parseScanPayload` 분기 → `/orders/{orderId}` 이동 | `app/(tabs)/scan.tsx:69` | 0961bbb |
| Round 3 · 중복 이동 방지 (scannedBarcodeRef 1.5s 리셋) | `app/(tabs)/scan.tsx:67` | 0961bbb |
| Round 3 · 문구 "Scan receipt QR or barcode" | `app/(tabs)/scan.tsx:163` | 0961bbb |
| 테스트 · 22 assertions (payload·parse·bitmap·소스·prettier) | `scripts/m0-1105-as-qr-assertions.mjs` | 0961bbb |
| 자기 검증 QR PNG | `docs/testing/m0-1105-as-qr-sample.png` | 0961bbb |

---

## 2. 라이브러리·번들 안전 근거

`qrcode@1.5.4` Metro 번들 안전 확인:
- `package.json browser` 필드: `"./lib/index.js": "./lib/browser.js"` — Metro는 browser 필드 우선 사용
- `lib/browser.js`: `fs`/`stream`/`node:` 미사용. `QRCode.create` + SVG/Canvas 렌더러만
- `lib/core/*.js`: `grep -rn "node:" node_modules/qrcode/lib/core/` = 0 (변수명 `node` 1건만, import 아님)
- `create()` 함수: 순수 JS (Uint8Array·Map·Math 전용)
- R0 체크 ⑦ 충족

---

## 3. PR 번호

**PR #100** https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/100

---

## 4. PR 본문 Kyu 확인(실기) 항목

1. `docs/testing/m0-1105-as-qr-sample.png` — 휴대폰 카메라로 `merospos://orders/01JT9XABCDEF1234567890AB` 읽히는지
2. iPad 앱 Scan 탭 → "Scan receipt QR or barcode" 문구 확인
3. 영수증 QR 찍으면 주문 상세 열리는지 (Round 2 머지 뒤 실기 — PR #98 선행 필요)

---

## 5. Round 2에 넘길 것

- `lib/printer/receipt-escpos.ts`: Tender 블록 뒤 `qrBitmap` 슬롯 + `RenderReceiptOptions.qrBitmap?` 추가
- `components/receipt/ReceiptCard.tsx`: 화면 QR 블록 (`react-native-qrcode-svg` 사용)
- `app/checkout/success/[orderId].tsx`, `app/orders/[orderId].tsx`: `qrBitmap` 옵션 전달
- **선행 조건**: PR #98 머지 (ReceiptCard.tsx 겹침)

---

## 6. git ls-tree

```
100644 blob 581c228b  app/(tabs)/scan.tsx
100644 blob f041b824  docs/testing/m0-1105-as-qr-sample.png
100644 blob 7f006ecc  lib/qr.ts
100644 blob 6b6001ea  scripts/m0-1105-as-qr-assertions.mjs
```

---

## 7. 이연 순증감

| 항목 | 증감 |
|------|------|
| 패키지 `qrcode@1.5.4` (~40KB) | +1 |
| 신규 API 엔드포인트 | 0 (deeplink 직접 라우팅) |
| 영수증 용지 소비 | 0 (Round 2에서 발생) |
| Scan QR type 오버헤드 | 미미 |
| Round 2 의존성 | PR #98 머지 선행 필요 |
