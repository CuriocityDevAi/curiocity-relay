# M0-1105-AT 완료 리포트

## 항목별 표 (파일:줄 · 커밋)

| # | 항목 | 파일:줄 | 커밋 | 결과 |
|---|------|---------|------|------|
| 1 | 화면 ReceiptCard QR 블록 (Sale/VOID/REFUND · order_id 가드 · receipt_no 작은 글씨) | `components/receipt/ReceiptCard.tsx:355-368` | 5d598ae | ✓ |
| 2 | 프린터 ESC/POS GS v 0 raster · 384dot 가운데 · quiet zone 4모듈 | `lib/printer/receipt-escpos.ts:233-243` | 5d598ae | ✓ |
| 3 | lib/qr.ts: orderQrSvg + orderIdToQrBitmapCentered | `lib/qr.ts:62-130` | 5d598ae | ✓ |
| 4 | escposBytesToText GS v 0 디코더 | `lib/printer/receipt-escpos.ts:320-331` | 5d598ae | ✓ |
| 5 | 어설션: m0-1105-at 38/38 pass | `scripts/m0-1105-at-receipt-qr-assertions.mjs` | 5d598ae | ✓ |
| 6 | 어설션: m2-1105-m 39/39 pass (회귀 없음) | `scripts/m2-1105-m-receipt-escpos-assertions.mjs` | 5d598ae | ✓ |
| 7 | 자기검증 PNG/SVG (Sale/VOID ESC/POS + 화면) | `docs/testing/m0-1105-at-*.{png,svg}` | 5d598ae | ✓ |

## 용지 증가

- QR raster: **384×222px** → **27.8mm** @203DPI
- quiet zone 4모듈(24px each side) 포함 결과 (목표 20~25mm 대비 약 3mm 초과는 ISO 최소 quiet zone 준수 우선)

## WhatsApp 공유 확인

- `app/orders/[orderId].tsx` 및 `app/checkout/success/[orderId].tsx` 의 `onShare` 는 모두 `Share.share({ message: text })` — **텍스트 방식**. 이미지 캡처 없음 → QR 미포함. **범위 밖** (리포트 기재).

## PR 번호 (stacked)

- **PR #102** — base: `feat/m0-1105-as-order-qr-scan`
- URL: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/102

## `git ls-tree`

```
feat/m0-1105-at-receipt-qr HEAD 5d598ae
주요 신규:
  docs/testing/m0-1105-at-escpos-sale-qr.png
  docs/testing/m0-1105-at-escpos-void-qr.png
  docs/testing/m0-1105-at-screen-sale-qr.svg
  docs/testing/m0-1105-at-screen-void-qr.svg
  scripts/m0-1105-at-escpos-qr-preview.mjs
  scripts/m0-1105-at-receipt-qr-assertions.mjs
```

## 이연 순증감

- 없음 (신규 기능 추가)
