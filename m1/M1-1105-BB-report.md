# M1-1105-BB 보고서 — 영수증 QR → Scan 탭 주문 열기

작성일: 2026-11-12

---

## 1. 대사표

### 코어·스타터 있음 (우회 없이 재사용)

| 항목 | 파일 | 비고 |
|------|------|------|
| Receipt 타입 (`order_id` 포함) | `types/receipt.ts` | `Receipt.order_id` 필드 직접 있음 — QR 생성 시 별도 조회 불필요 |
| ESC/POS 비트맵 raster | `lib/printer/logo-bitmap.ts` | `escposRasterCommand(oneBit, w, h)` — GS v 0 명령, 이미 로고에 사용 중 |
| 프린터 렌더러 옵션 구조 | `lib/printer/receipt-escpos.ts` L20-32 | `RenderReceiptOptions { logoBitmap? }` — 동일 패턴으로 `qrBitmap?` 추가 가능 |
| 화면 영수증 컴포넌트 | `components/receipt/ReceiptCard.tsx` | `Receipt` 전체 객체 수신 → `order_id` 접근 가능 |
| react-native-svg | `package.json` v15.16.0 | QR SVG 라이브러리 의존성 충족 |
| Scan 탭 카메라 | `app/(tabs)/scan.tsx` | `CameraView` + `onBarcodeScanned` 핸들러 존재 |
| 주문 상세 라우트 | `app/orders/[orderId].tsx` | `router.push('/orders/'+orderId)` 바로 사용 가능 |

### 우회 필요 (기존 코드 소규모 수정)

| 항목 | 현재 상태 | 우회 방법 |
|------|-----------|-----------|
| barcodeTypes에 `qr` 없음 | `['ean13','ean8','upc_a','upc_e','code128','code93','code39']` (`scan.tsx` L117) | 배열에 `'qr'` 추가 1줄 |
| Scan 핸들러 — 상품만 처리 | `handleBarcodeScanned` → `useScanBarcode` → `/product-details` 고정 | 접두어 분기 추가 (아래 §2 참고) |
| ESC/POS에 GS ( k 없음 | `escpos.ts`에 미구현 | 불필요 — GS v 0 비트맵으로 대체 (로고와 동일 경로) |

### 신규 필요

| 항목 | 비고 |
|------|------|
| QR 생성 → 1-bit raster 유틸 | `lib/qr.ts` 신규. `qrcode` npm (순수 JS, 비트맵 직접 출력) 권장 |
| `receipt-escpos.ts` QR 블록 | 합계·결제 블록 아래, footer 위에 삽입 |
| `ReceiptCard.tsx` QR 이미지 블록 | `react-native-qrcode-svg` 컴포넌트 삽입 |
| display_id → order_id 역조회 API | **불필요** (§2 QR 내용 권장안: order_id 직접 인코딩) |

---

## 2. QR 내용 권장

### 옵션 비교

| 형식 | 예시 | 길이 | 역조회 API | 보안 | 인쇄 크기 |
|------|------|------|-----------|------|-----------|
| receipt_no | `MEROS:R-261112-0005` | ~20자 | 신규 필요 | ✅ (무의미) | QR v2 |
| order display_id | `MEROS:#12345` | ~13자 | 신규 필요 | ✅ | QR v1 |
| **deeplink (order_id)** | **`meros://orders/01JT9XABCD...`** | **~50자** | **불필요** | **✅ UUID만 노출** | **QR v3** |

**권장: `meros://orders/{orderId}`**

- Scan 탭이 `meros://orders/` 접두어 감지 → `router.push('/orders/'+orderId)` 직접 라우팅
- 역조회 엔드포인트 신규 개발 불필요 — `useOrder(orderId)` 훅 그대로 사용
- 고객이 카메라 앱으로 찍어도 UUID만 보임 (내부 가격·재고 정보 없음)
- 58mm 용지 QR v3 ≈ 29×29 모듈 → 약 200×200px @ 8px/module → 충분히 읽힘

### Scan 탭 분기 로직 (의사코드)

```ts
if (data.startsWith('meros://orders/')) {
  router.push('/orders/' + data.replace('meros://orders/', ''));
} else if (data.startsWith('meros://membership/')) {
  // 추후 멤버십 QR 확장 자리
} else {
  // 기존: 상품 바코드 처리
  scanBarcode(data);
}
```

---

## 3. 영수증 레이아웃 안

**위치**: 합계·결제 줄(Tender 블록) 아래 — Thank you / footer 위  
**VOID 영수증**: QR 미포함 (VOID는 재주문 불필요)  
**용지 증가**: 약 32mm (QR 25mm + 상단 라벨 1줄 + 여백)

### 텍스트 목업 (32자 폭 · 프린터)

```
--------------------------------
   Rp 150,000
--------------------------------
  TUNAI         150,000
  Kembali             0
================================
   Scan untuk buka pesanan:
        [████████████]
        [██  ██  ████]
        [████████████]
        [████████████]
--------------------------------
  Terima kasih! / Thank you!
```

### 화면 (ReceiptCard)

- `react-native-qrcode-svg` `<QRCode value={...} size={160} />` 센터 정렬
- 위아래 8px 여백, 라벨 텍스트("Scan untuk buka pesanan" or 커스텀) 위에 표시

---

## 4. 구현 라운드

### Round 1 — QR 생성 인프라 *(#98 선행 불필요)*

| 파일 | 작업 | 허브 |
|------|------|------|
| `package.json` | `qrcode` 추가 (브라우저/RN 겸용 순수 JS) | M1 |
| `lib/qr.ts` (신규) | `orderIdToQrBitmap(orderId)` → `LogoBitmap` 반환 | M1 |
| `__tests__/qr.test.ts` (신규) | QR 내용 인코딩 어설션 (`meros://orders/` 접두어, UUID 포함) | M1 |

### Round 2 — 영수증 QR 블록 *(#98 머지 선행 권장 — ReceiptCard.tsx 겹침)*

| 파일 | 작업 | 허브 |
|------|------|------|
| `lib/printer/receipt-escpos.ts` | Tender 블록 뒤 `qrBitmap` 삽입 로직, `RenderReceiptOptions`에 `qrBitmap?` 추가 | M1 |
| `components/receipt/ReceiptCard.tsx` | `<QRCode>` 컴포넌트 블록 (kind≠'void'일 때만) | M1 |
| `package.json` | `react-native-qrcode-svg` 추가 (화면용) | M1 |
| `app/checkout/success/[orderId].tsx` | `renderReceiptEscPos` 호출 시 `qrBitmap` 옵션 전달 | M1 |
| `app/orders/[orderId].tsx` | 동일 | M1 |

> **#98 선행 이유**: #98이 `ReceiptCard.tsx` VOID 색 수정 포함 → 동시 수정 시 충돌 발생 가능

### Round 3 — Scan 탭 QR 분기 *(#98 선행 불필요)*

| 파일 | 작업 | 허브 |
|------|------|------|
| `app/(tabs)/scan.tsx` L117 | `barcodeTypes`에 `'qr'` 추가 | M1 |
| `app/(tabs)/scan.tsx` | `handleBarcodeScanned`에 접두어 분기 로직 추가 | M1 |
| `__tests__/scan-routing.test.ts` (신규) | 스캔 → 라우팅 어설션 (`meros://orders/` → push `/orders/[id]`) | M1 |

### Round 4 — WA 공유 텍스트 deeplink 추가 *(선택, 독립)*

| 파일 | 작업 |
|------|------|
| `app/checkout/success/[orderId].tsx` L63 | 공유 텍스트에 `meros://orders/{orderId}` 한 줄 추가 |
| `app/orders/[orderId].tsx` L630 | 동일 |

### Round 5 — BLE 실기 QR 인쇄 테스트

- 프린터(BT-58D) 도착 후 진행
- 검증: QR 크기, 모듈 선명도, 스마트폰 카메라 인식 거리

---

## 5. Kyu에게 물을 것 (최대 2개)

1. **앱 deeplink 스킴**: `meros://` 스킴이 `app.json` / `expo` 설정에 이미 등록돼 있나요? (없으면 Round 3 전 `app.json`에 `scheme: "meros"` 추가 필요)

2. **QR 블록 on/off 옵션화**: 영수증 QR을 스토어 설정(서버)에서 on/off할 필요가 있나요? 아니면 항상 표시해도 되나요?

---

## 6. 이연 순증감

| 항목 | 증감 |
|------|------|
| 패키지: `qrcode` (~40KB) | +1 |
| 패키지: `react-native-qrcode-svg` (~15KB) | +1 |
| 신규 API 엔드포인트 | 0 (deeplink 방식으로 불필요) |
| 영수증 용지 소비 | +32mm/장 (QR 블록) |
| Scan 카메라 초기화 오버헤드 | 미미 (QR type 추가만) |
| 허브 M2 범위 영향 | 0 (결제 화면 무관) |
| #98 의존성 | Round 2만 선행 머지 필요 |
