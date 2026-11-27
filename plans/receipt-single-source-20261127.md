# 영수증 단일 출처 설계 — M2-1127-H (진단 · 2026-11-27)

> 원장: Kyu 11-27 13:26 "아직도 POS 화면에서 나오는 영수증과, 고객화면의 영수증의 모양이 달라 … 난 고객화면의 영수증도 POS에서 보이는 영수증, 즉 프린터가 출력하는 영수증과 동일하게 생겼으면 하는거야."
> **4번째 반복** 요구: 11-24#9 → 11-25 → 11-26 CD-3 → 11-27. 매번 "구현 완료" 보고가 나왔지만 실제로는 CD 영수증이 POS/프린터와 전혀 다른 모양을 유지하고 있음. 이 문서는 "왜 매번 어긋났는지" 를 코드 레벨로 지도화하고, 어긋나지 않게 묶는 방법을 라운드로 쪼갠다.

이 문서는 **진단 + 계획만** 담는다. 코드 수정은 승인 뒤 라운드별 티켓으로 발부.

---

## 1. 지도 — 영수증을 그리는 곳 전부

### 1-A. 영수증 데이터 생성 (서버 · "줄 목록이 아니라 snapshot jsonb")

| 파일:줄 | 역할 | 비고 |
| --- | --- | --- |
| `apps/commerce-core/src/modules/receipt/service.ts:220` `buildSnapshot()` | **모든** 영수증 데이터의 single source. `store` · `header` · `footer` · `logo_mode` · `cashier` · `items` · `subtotal` · `discount_total` · `service_charge` · `tax` · `grand_total` · `tenders` · `preorder` · `delivery` · `labels` · `pos_order_num` · `order_custom_display_id` 를 jsonb 로 생성. | 영수증 문구·라벨 (`subtotal: "Subtotal"` … `copy_watermark`) 도 여기서 박힘. 숫자 포맷은 하지 않음 (렌더러 책임). |
| `apps/commerce-core/src/modules/receipt/service.ts:304` `createReceiptForOrder()` | `R-YYMMDD-NNNN` 번호 할당 + DB 저장. | |
| `apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts:1` | sale 영수증 발행 workflow step. | `buildSnapshot` 호출. |
| `apps/commerce-core/src/workflows/pos-refund/steps/mint-receipt.ts:1` · `pos-return/steps/mint-receipt.ts:1` | void/refund/partial_refund 영수증. | |
| `apps/commerce-core/src/modules/receipt/models/receipt.ts:1` | `Receipt` 엔티티 (snapshot jsonb · receipt_no · kind · parent_receipt_id). | |

→ **서버는 잘 하고 있다.** 한 영수증 당 한 snapshot jsonb 가 발행되어 DB 에 박힘. 문제는 이 jsonb 를 **세 곳이 제각각 해석** 하는 것.

### 1-B. 공용 "뷰모델" — `@storeport/receipt-view-model` (불완전)

| 파일:줄 | 역할 | 비고 |
| --- | --- | --- |
| `packages/receipt-view-model/src/receipt-view.ts:80` `resolveReceiptView()` | snapshot → `ReceiptViewModel` 정규화. | **CD + Admin 미리보기만 사용.** POS ReceiptCard 와 ESC/POS 렌더러는 **쓰지 않음**. |
| `packages/receipt-view-model/src/receipt-view.ts:36` `ReceiptViewModel` 타입 | 정규화 shape 선언. | 아래 1-C (ReceiptCard) 의 필드와 **구조적 포함관계 성립하지 않음**. `queue` (pos_order_num) · `header` · `logoMode` · `discountTotal` · `serviceCharge` · `preorder` · `delivery` · `qr` · `watermark`/`banner` (void/refund) · `parentReceiptNo` 가 뷰모델에 **없음**. |
| `packages/receipt-view-model/src/order-snapshot.ts` | SnapshotItem · ReceiptItem 타입. | |
| `apps/customer-display/src/screens/receipt-view.ts:1` | 재수출 (하위 호환). | |
| `apps/commerce-core/src/admin/routes/pos-settings/components/ReceiptPreview.tsx:5` | 공용 ViewModel 소비 (관리자 미리보기만). | `font-mono` · 폭 `max-w-[260px]` · ID 로케일(`id-ID` 점 천단위). |

→ **공용 뷰모델은 존재하지만 CD + Admin 만 소비.** POS 화면과 프린터는 raw snapshot 을 직접 읽는다. 이름만 "공용" 이고 실제로는 **CD 전용**.

### 1-C. 손님 화면 — `apps/customer-display` (storeport)

| 파일:줄 | 역할 | 비고 |
| --- | --- | --- |
| `apps/customer-display/src/screens/ReceiptScreen.tsx:64` `ReceiptScreen` | 결제 완료 전체 1/1 화면 (왼쪽 ✓ + 오른쪽 영수증 시트). `resolveReceiptView` 소비. | 폭 `rcpW = min(340, width - pad*2 - 20)` (좁은 레일) · 글꼴 = **system sans-serif (monospace 아님)** · 숫자 `formatRp` → `Rp 16.500` (ID 점 포맷). |
| `apps/customer-display/src/screens/ReceiptScreen.tsx:28` `formatRp()` | `Rp 16.500` 포맷 (ID 점 천단위). | **POS/프린터와 포맷 다름**. |
| `apps/customer-display/src/screens/ReceiptScreen.tsx:58` `methodLabel()` | `Cash` / `Card` / `QRIS` (대소문자 혼합). | **POS "CASH"/"Card (EDC)" · 프린터 "CASH"/"CARD" 와 다름**. |
| CD 결제 완료 1/3 미니 영수증 (명세 `specs/screens/customer-display.md` CD-RECEIPT-MINI) | **현재 코드에 미구현.** CD-2 레이아웃 "영수증 왼쪽 1/3 · Payment complete 오른쪽 2/3" 는 명세·결정만 있고 `ReceiptScreen` 은 한 덩어리 1/1 레이아웃. | M0-1126 트랙에서 작업 진행 중 (M0-1127-G 는 키패드 활성 스냅샷만 수정). |
| `apps/customer-display/e2e/receipt-same-as-pos.spec.ts:1` | 보존 스펙. **필드 값** 만 확인 (`toContainText("Rp")`). **모양은 전혀 보지 않음**. | |

→ **CD 영수증의 실태**:
- 상단 로고 없음 (`storeLogoUrl` 은 뷰모델에 있지만 `ReceiptScreen` 에서 렌더링 안 함).
- 매장 phone / header / footer 중 `header` 필드 소비 안 함.
- `receiptNo` · `issuedAt` · `cashierName` 필드는 뷰모델에 있지만 **화면에 그리지 않음**.
- Queue 번호 (`pos_order_num`) 큰 블록 없음.
- `discount_total` · `service_charge` · PB1 세부 (rate_pct %) 줄 없음.
- 주문 QR 없음.
- VOID/REFUND 배너·환불 메타 블록 없음.
- Preorder · Delivery 블록 없음.
- 숫자 포맷 ID 로케일 → POS 와 다름.
- 결과: CD 영수증은 "주문번호 + 품목 + 합계 + 결제수단" 만 그린 **축약판**.

### 1-D. POS 화면 — `agilo-medusa-pos-fork` (별도 리포)

| 파일:줄 | 역할 | 비고 |
| --- | --- | --- |
| `components/receipt/ReceiptCard.tsx:171` `ReceiptCard` | 결제 완료 / Order detail 화면 영수증 (react-native + Nativewind). `Receipt.snapshot` 을 **직접** 읽음 (뷰모델 미경유). | 폭 `maxWidth: 420` · 글꼴 **monospace** (Menlo/ui-monospace) · 숫자 `formatIDR` → `IDR 16,500` (en-US 콤마). |
| `components/receipt/ReceiptSection.tsx:16` `RECEIPT_MAX_WIDTH = 420` | 결제 완료 / Order detail 공통 폭. | |
| `api/hooks/pos-payments.ts:269` `formatIDR()` | `IDR ${n.toLocaleString('en-US')}`. | **CD 와 포맷 다름**. |
| `components/payment/SuccessReceiptAnim.tsx:12` | 결제 완료 애니메이션 랩퍼 → `ReceiptCard` 호출. | 공유 캡처용 `ViewShot` ref. |
| `app/orders/[orderId].tsx:30` · `app/checkout/success/[orderId].tsx` | ReceiptCard 소비처. | |
| `lib/receipt-layout.ts:17` `LOGO = { maxHeightPx: 110, maxWidthRatio: 0.8 }` | **화면 ↔ 프린터 1:1 로고 치수**. | |
| `lib/receipt-custom-id.ts` | 긴 주문번호 (PIM26B1000) resolve 우선순위. | |
| `types/receipt.ts:1` | POS 쪽 로컬 `Receipt` / `ReceiptSnapshot` 타입. 서버 snapshot 과 1:1 (`resolveLineTotal` 로 `line_total`/`total` 키 미스매치 보호). | **storeport 모노레포 바깥.** 서버 shape 변경 시 수동 동기화 필요. |

→ **POS ReceiptCard 가 "프린터 + 화면" 간 디자인 일치의 자발적 축**. 로고 크기를 `lib/receipt-layout.ts` 상수로 공유하는 패턴이 이미 존재 (M2-1105-R · Kyu 11-07 결정 D1 "로고 크기 1.8×"). ESC/POS 쪽도 같은 상수를 import.

### 1-E. 프린터 — ESC/POS (agilo fork · `lib/printer/`)

| 파일:줄 | 역할 | 비고 |
| --- | --- | --- |
| `lib/printer/receipt-escpos.ts:166` `renderReceiptEscPos()` | **Receipt snapshot → ESC/POS 바이트**. 58mm = 32 chars 폭. `snapshot` 을 raw 로 소비 (뷰모델 미경유). | 숫자 `formatIDR` (파일 안 재정의 · 같은 `IDR N,NNN` 포맷). 라벨 CASH/CARD/QRIS = `method.toUpperCase()` (slip ordinal 없음). |
| `lib/printer/escpos.ts` | `EscPosBuilder` (`init/alignCenter/bold/kv/rule/line/lf/cut/raw`) · `COL_WIDTH_58MM = 32`. | |
| `lib/printer/logo-bitmap.ts` · `lib/printer/logo-fetch.ts` | pos_settings logo_url → 1-bit raster (GS v 0). `lib/receipt-layout.ts` 치수 사용. | |
| `lib/printer/receipt.ts` (146줄) | **구 렌더러** (M2-1104-D payment_method flat string). 신규 snapshot 쓰지 않음. 유지 중 미전환 (주석 "추후 라운드에서 신규 렌더러로 스위치"). | **고아 가능성 · 사용처 확인 필요.** |
| `lib/printer/ble.ts` · `lib/printer/index.ts` | BLE 전송. | |
| `lib/qr.ts` `orderIdToQrBitmapCentered()` · `orderQrSvg()` | 주문 QR — ESC/POS 비트맵 + 화면 SVG 양쪽. | **같은 QR 데이터 보장** · 치수만 다름. |

→ **ESC/POS 렌더러 = ReceiptCard 와 거의 같은 순서·같은 필드.** 라운드별로 두 렌더러를 동시 업데이트해 온 자취가 주석에 명시 (예 M2-1123-E 손님 칩 · M3-1105-AF VOID/REFUND 배너 · M0-1105-AT QR 블록).

### 1-F. 명세 (specs/screens/)

| 파일:줄 | 역할 |
| --- | --- |
| `specs/screens/pos-payment-flow.md` SUCC-RECEIPT | POS 결제 완료 영수증 요건. |
| `specs/screens/customer-display.md` CD-RECEIPT-FULL / CD-RECEIPT-MINI / CD-RECEIPT-FORMAT | CD 영수증 요건 (CD-3 "POS 와 같은 모습"). |
| `ledger/decision-pos-phone-status-20261124.md:14` | 11-24 피드백 #9 "같은 영수증". |
| `ledger/decision-cd-pos-sync-design-20261125.md:9` | "영수증은 POS 에서 보여지는 똑같은 영수증으로 써야해". |
| `ledger/decision-cd-pos-sync-v2-20261126.md:26` | CD-3 "공용 receipt-view-model". |
| `ledger/decision-refund-receipt-label-20261113.md` | refund kind 라벨 결정. |
| `ledger/decision-receipt-tab-20261124.md` | 매장별 표시 토글 C 안. |

---

## 2. 차이 목록 — 3장 비교

**캡처 자료** (relay `assets/receipt-diff-20261127/`):
1. `01-pos-receipt-card.png` — POS ReceiptCard (agilo `screenshots-m1-1105-av/02-ipad-receipt-single-sale.png`).
2. `02-customer-display-receipt-qris.png` — CD `ReceiptScreen` playwright 캡처 (storeport `apps/customer-display/screenshots/m0-1125-c-receipt-qris.png`, 11-27 13:34 생성).
3. `03-printer-escpos-text.txt` — ESC/POS 텍스트 덤프 (`agilo .../docs/testing/receipt-escpos-sample.txt`).

> ReceiptCard screenshot 과 ESC/POS 텍스트는 다른 주문 데이터로 캡처된 **아카이브** — 같은 주문 1건으로 재캡처하려면 아이맥에서 POS + CD + 프린터 동시 발행이 필요. 이 진단서는 **코드 레벨 비교** 로 보완 (아래 표의 모든 행은 파일:줄에서 직접 읽음).

### 2-A. 나란히 놓고 보는 차이

| 항목 | POS ReceiptCard (화면) | 프린터 ESC/POS (원본) | CD ReceiptScreen (손님 화면) |
| --- | --- | --- | --- |
| **폭** | 420px 고정 | 58mm · 32 chars | 340px (≒ 24 chars 상당) |
| **글꼴** | monospace (Menlo/ui-monospace) | 프린터 모노스페이스 | **system sans-serif** (`styles.rcpItem` 등 fontFamily 미지정) |
| **숫자 포맷** | `IDR 16,500` (en-US 콤마) | `IDR 16,500` (en-US 콤마) | `Rp 16.500` (ID 점 천단위) |
| **매장 로고 (이미지)** | `snap.store.logo_url` → 이미지 (max 110px · 폭 80%) | 1-bit raster GS v 0 (같은 치수) | **없음** (`storeLogoUrl` 필드는 뷰모델에 있지만 미렌더) |
| **매장 이름** | 로고 없을 때 bold tracking-widest | 로고 없을 때 bold line | 항상 bold 중앙 (텍스트만) |
| **매장 주소** | 명세상 `snap.header` (주소를 header 로 입력) | `snap.header` 중앙 정렬 줄 | `storeAddress` → muted 중앙 |
| **매장 WA phone** | **없음** | `WA ${store.phone}` 중앙 1줄 | **없음** |
| **Queue #N 큰 블록** | 있음 (text-5xl bold + "Queue" muted) | `Queue #N` 중앙 bold 1줄 | **없음** |
| **No. R-YYMMDD-NNNN** | `No. R-…` 1줄 (monospace) | `No. R-…` 좌정렬 | **없음** |
| **일시 (WIB)** | `YYYY-MM-DD HH:mm WIB` | `Date YYYY-MM-DD HH:MM WIB` | **없음** |
| **Order #display_id** | `Order #42` | `Order #42` | `${labels.order} ${topOrderNumber}` 중앙 muted — e.g. `Pesanan #42` (ID) |
| **Cashier** | `Cashier: {name}` | `Cashier {name}` | **없음** |
| **VOID/REFUND 큰 배너** | text-3xl bold tracking-widest | `*** REFUND ***` 중앙 bold | **없음** |
| **원 영수증 번호** | `Original: No. R-…` | `Original No. R-…` | **없음** |
| **환불 메타 (수단 · 승인번호 · Refund total)** | 전용 블록 | `Method CARD TERMINAL` · `APPROVAL …` · `Refund total -IDR N,NNN` | **없음** |
| **품목 줄 1행 (제목 · 금액)** | `{title}` ⟵→ `IDR 95,000` | `{title}` ⟵→ `IDR 95,000` | `${qty}× ${title}` ⟵→ `Rp 95.000` (품목 제목 앞에 수량이 붙음 · "× 기호") |
| **품목 줄 2행 (수량 · 단가 · variant)** | `  1 x IDR 95,000 · Cheese` muted | `  1 x IDR 95,000` kv | **없음** (수량이 1행에 녹아 있어 2행 필요 없음 · variant_title 아예 생략) |
| **품목 discount 줄** | `  discount -IDR N,NNN` | `  Discount -IDR N,NNN` | **없음** |
| **Subtotal** | `Subtotal` | `Subtotal` | `cart.subtotal` (i18n 번역된 라벨) |
| **Discount_total** | 있을 때만 | 있을 때만 | **없음** |
| **Service charge (pct%)** | `Service charge 5%` | `Service charge` (pct 생략) | **없음** |
| **PB1 10%** | `PB1 10%` | `PB1` (rate_pct 생략) | `taxLabel ${taxRatePct}%` — e.g. `PB1 10%` |
| **TOTAL** | `TOTAL` bold | `TOTAL` bold | `cart.total` (i18n) 20px bold |
| **Tender 라벨** | `CASH` · `Card (EDC)` · `QRIS` + `(1st Slip)` ordinal | `method.toUpperCase()` — `CASH`/`CARD`/`QRIS` (ordinal 없음) | `Cash` · `Card` · `QRIS` (대소문자 혼합 · ordinal 없음) |
| **Cash Received / Change** | `  Received` / `  Change` (snapshot labels) | `Received` / `Change` (snapshot labels) | `Received`/`Change` (**inline 영어** · `RECEIPT_LABELS` 테이블 · 5개 언어) |
| **Card 상세 (Bank/Brand/Card last4/APPROVAL/RRN)** | 전체 전개 | `{brand} ****{last4}` 한 줄 + `APPROVAL` | **없음** (`cardLast4`/`approvalCode` 뷰모델 있으나 UI 미렌더) |
| **QRIS 상세 (Issuer/Ref)** | Issuer · Ref (전체 표시) | Issuer · Ref (뒤 8자 절단) | **없음** (`referenceNo` 미렌더) |
| **Preorder 블록 (Deposit/Balance due/Pickup)** | 있음 | **없음** (미구현) | **없음** |
| **Delivery 블록 (To/Phone/Addr/Note)** | 있음 | 있음 | **없음** |
| **주문 QR (120×120)** | SVG | 비트맵 | **없음** |
| **No. (QR 아래)** | `No. R-…` muted 작게 | `No. R-…` | **없음** |
| **Footer (Thank you)** | muted 중앙 | 중앙 (store `snap.footer`) | `view.footer ?? "— Thank you —"` muted 중앙 (dash 2 개 추가) |
| **Custom display id (PIM…)** | `Order {cid}` muted 작게 | `Order {cid}` 중앙 | `bottomOrderNumber` 큰 bold 중앙 (글꼴 크기·강조 다름) |

### 2-B. "왜 매번 어긋났나" — 근본 원인

1. **뷰모델이 CD 전용.** `@storeport/receipt-view-model` 이름만 공용이고 실제로 POS/프린터는 소비하지 않음. CD 요건이 늘어나도 뷰모델만 확장되고 ReceiptCard 는 raw snapshot 을 계속 읽어서 두 쪽이 자연 분기.
2. **뷰모델이 snapshot 의 상위 집합이 아님.** `ReceiptViewModel` 에 `header` · `logoMode` · `discountTotal` · `serviceCharge` · `pos_order_num` · `preorder` · `delivery` · `qr` · `watermark`/`banner`/`parentReceiptNo` · `labels` 가 **없다**. CD 를 "같은 모양" 으로 만들려면 뷰모델부터 snapshot 의 상위 집합이 되어야 함.
3. **렌더러가 3개 (POS-RN · CD-RN · ESC/POS).** Admin 미리보기까지 치면 4개. 라운드마다 "ReceiptCard 와 ESC/POS 는 묶어 수정" 했지만 CD 는 다른 리포·다른 tech stack (RN-web Expo Router) 이라 매번 빠짐.
4. **보존 스펙이 값만 보고 모양을 안 봄.** `receipt-same-as-pos.spec.ts` 는 `toContainText("Rp")` 수준. 공용 라벨·공용 폭·공용 포맷·공용 섹션 순서를 검증하는 어설션 0. 모양이 어긋나도 그린.
5. **숫자 포맷·월별 로케일이 각자 다름.** `formatIDR` (en-US) vs `formatRp` (ID) vs Admin `toLocaleString('id-ID')` — 같은 금액이 `IDR 16,500` · `Rp 16.500` · `16.500` 세 모양.
6. **POS 코드가 별도 리포 (storeport ↔ agilo-medusa-pos-fork).** 서버 snapshot 변경 시 POS `types/receipt.ts` 를 수동 동기화. 공용 패키지로 묶으려면 workspace 확장 또는 npm publish 가 필요.

---

## 3. 계획 — 원본 = 프린터 영수증

> Kyu 11-27 "프린터가 출력하는 영수증과 동일하게 생겼으면 하는거야" → **프린터 ESC/POS 가 원본 모양**. 서버는 이미 한 snapshot jsonb 를 발행하므로 "데이터" 는 하나. 부족한 것은 **"줄 목록 (receipt lines)" 공용 모델** 과 **같은 렌더러 3개**.

### 3-A. 목표 구조

```
서버 buildSnapshot(…) → Receipt.snapshot jsonb (현재 그대로 · 변경 최소)
                          │
                          ▼
    @storeport/receipt-lines (신규 공용 패키지)
      · resolveReceiptLines(snapshot, receipt): ReceiptLine[]
      · ReceiptLine = { kind: 'logo' | 'center' | 'kv' | 'rule' | 'queue' |
                         'banner' | 'item' | 'tender' | 'qr' | 'footer' …,
                        text?, right?, pct?, bold?, muted? … }
      · 숫자 포맷·라벨 전부 여기서 결정 (IDR/Rp 는 한 선택으로 통일)
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
   ReceiptCard       ReceiptScreen      renderReceiptEscPos
   (POS · RN)        (CD · RN-web)      (프린터 · bytes)
      │                   │                   │
      └── 같은 줄 순서 · 같은 라벨 · 같은 숫자 ─┘
```

**원칙**:
- **"줄 목록" 이 single source**. ReceiptCard/ReceiptScreen/ESC/POS 는 "줄 목록을 자기 매체에 그림" 만 함 (매체 고유 = 글꼴·폭·스크롤).
- **매체 고유 차이는 허용**: 폭 (420/32char/340) · 글꼴 (화면 monospace · 프린터 폰트) · 로고 치수 (현재 `lib/receipt-layout.ts` 공용) · QR 치수 (SVG vs bitmap). 그 외는 전부 공용.
- **CD 1/3 미니 영수증 = 같은 영수증 축소**. 별도 미니 디자인 폐지 (명세 CD-RECEIPT-MINI 는 "축소" 로 축퇴).
- **공용 검사 = 스크린샷 겹치기 + 줄 목록 1:1**. 두 가지로 모양·데이터 양쪽을 고정.

### 3-B. 라운드

| 라운드 | 허브 | 파일 | 크기 | 목표 |
| --- | --- | --- | --- | --- |
| **R1 — 공용 "줄 목록" 패키지 신설** | storeport (monorepo) | `packages/receipt-lines/src/*.ts` 신설 · `packages/receipt-view-model` 을 **얇은 어댑터** 로 축퇴 (deprecate 금지 · 기존 소비처 안 깨짐) | 신규 ~250줄 + 테스트 ~200줄 | `resolveReceiptLines(snapshot, receipt)` 순수 함수. `receipt-escpos.ts:166` 의 분기 로직을 "줄 목록 빌더" 로 옮겨 **같은 순서·같은 라벨·같은 포맷** 생성. 숫자 포맷 결정 (권장: `IDR N,NNN` · 아래 Q1). 단위 테스트 = 모든 분기 (sale · reprint · void · refund · partial_refund · split · preorder · delivery · 서비스/세금 on·off · logo on·off). |
| **R2 — ESC/POS 렌더러를 "줄 목록 소비" 로 전환** | agilo fork (또는 storeport 로 이관 — 아래 Q3) | `lib/printer/receipt-escpos.ts` → `renderReceiptEscPos(lines, opts)` 로 리팩터 · 분기 로직 제거 | ~120줄 수정 · 기존 바이트 스냅샷 보존 | 기존 `docs/testing/receipt-escpos-sample.txt` 와 `__tests__/m2-1105-m-receipt-queue-num.test.ts` 등 ESC/POS 스냅샷이 **바이트 동일** 유지가 수용 기준. 어긋나면 R1 의 줄 목록이 원본 아님. |
| **R3 — ReceiptCard 를 "줄 목록 소비" 로 전환** | agilo fork | `components/receipt/ReceiptCard.tsx` → 줄 목록을 받고 매체 (RN) 로 그림 | ~300줄 교체 | POS 결제 완료 / Order detail 화면이 ESC/POS 와 **줄 순서·라벨·숫자 포맷 동일**. 글꼴·간격은 화면 고유 (monospace 유지). 보존 스크린샷 (`screenshots-m1-1105-av/02-ipad-receipt-single-sale.png` · `screenshots-m3-1105-af/01-ipad-receipt-void.png` 등) 비교 어설션. |
| **R4 — CD ReceiptScreen 교체** | storeport (CD) | `apps/customer-display/src/screens/ReceiptScreen.tsx` 를 "줄 목록 소비" 로 전환 | ~400줄 교체 · 기존 뷰모델 소비처 유지 | CD 1/1 (full) 영수증이 POS ReceiptCard 와 같은 줄 순서·라벨·숫자. 단 CD 는 `receipt_view-model` 의 i18n 라벨 (Received/Change) 을 유지해도 됨 (아래 Q2). CD 1/3 (mini) 는 같은 컴포넌트의 축소 (CSS transform scale 또는 좁은 폭 variant). 보존 e2e = `receipt-same-as-pos.spec.ts` 를 "모양" 어설션으로 격상. |
| **R5 — 보존 검사 강화** | storeport | `apps/customer-display/e2e/receipt-same-as-pos.spec.ts` + agilo fork `__tests__/receipt-lines-parity.test.ts` 신규 | 검사만 | 두 가지 어설션: ① 같은 snapshot 입력으로 ReceiptCard · ReceiptScreen · ESC/POS 가 **같은 줄 목록** 반환 (ReceiptLine[] 1:1). ② 스크린샷 겹치기 (toleranceDeltaE ≤ 5) — Playwright `expect(page).toHaveScreenshot` 와 같은 패턴 · 폭·글꼴 매체 고유는 중립화. |
| **R6 — Admin 미리보기 연동** | storeport (admin) | `apps/commerce-core/src/admin/routes/pos-settings/components/ReceiptPreview.tsx` 를 "줄 목록 소비" 로 전환 | ~100줄 | 관리자 설정 화면 "영수증 미리보기" 가 **실 영수증과 같은 모양**. `HighlightRow` 어노테이션 보존. |

→ R1~R2 가 핵심. R3~R4 는 각 리포에서 병렬 가능 (같은 패키지 소비). R5 가 "다음에 어긋나지 않게" 하는 가드. R6 은 보너스.

### 3-C. 리스크

| 리스크 | 완화 |
| --- | --- |
| **58mm vs 80mm 프린터 폭** | 현재 `COL_WIDTH_58MM = 32` 하드코드. 줄 목록은 "논리 줄" 만 다루고 폭 관련 wrap 은 렌더러 책임. 80mm (48 chars) 로 확장 시 wrap 만 바뀜 · 줄 목록 그대로. |
| **한글·CJK 문자** | 지금 fixture 에 한글 없음 (영수증 전체 영어 · ADDENDUM §2). CJK 가 섞이면 ESC/POS 폭 계산이 틀어짐 (한 글자 ≒ 2 cells). 줄 목록에 `charWidth: 'ascii'|'cjk'` 필드 추가 또는 wrap 시점에 처리. **R1 scope 밖** · 별도 라운드. |
| **로고 (매장별 다름)** | `lib/receipt-layout.ts` 치수 공유 패턴 유지. CD 는 지금 로고를 아예 안 그리는데 (R4 추가 작업). 1/3 미니에서 로고가 너무 커 보이지 않도록 폭 variant 로 `0.6×` 축소 허용. |
| **매장별 표시 토글 (decision-receipt-tab-20261124 C 안)** | 서버 `posSettings` 플래그가 이미 snapshot 에 반영되어 있음 (`tax.show` · `service_charge` null 가능 · footer 빈 문자열 처리 등). 줄 목록 빌더가 이 플래그를 소비하면 3 렌더러 자동 반영. **UI 토글 설계 변경 없음**. |
| **CD 1/3 레이아웃 (M0-1126 진행 중)** | CD-2 (영수증 좌 · Payment complete 우 · 3초 뒤 키패드 sheet) 와 **독립**. R4 는 "영수증 컴포넌트" 교체만 · 레이아웃은 M0-1126 트랙 그대로 진행. 두 트랙이 병렬 작업 시 충돌 영역 = `apps/customer-display/src/screens/ReceiptScreen.tsx` **단 1 파일** · merge 조정 가능. |
| **agilo fork 가 별도 리포** | `packages/receipt-lines` 를 npm publish (todoboss 가 이미 쓰는 패턴) 하거나 agilo 를 storeport workspace 로 흡수. 단기엔 publish, 중장기엔 흡수 (아래 Q3). |
| **보존 e2e `receipt-same-as-pos.spec.ts` 가 값만 봄** | R5 에서 스크린샷 어설션으로 격상. 중간 R1~R4 작업 중엔 기존 어설션이 계속 통과 (회귀 0 보장). |
| **환불/VOID 분기** | ESC/POS 에 이미 모든 분기가 있음 (`voidRefundHeader` · `voidRefundMetaLines`). R1 테스트가 모든 kind 를 커버. CD 현재는 환불 UI 자체가 없음 (손님은 환불 영수증을 손님화면에서 볼 일 없음) → CD 쪽 R4 에서 kind 분기는 **구현 안 함** 명시 (요건 밖 · 커버 않는 걸 명시). |

### 3-D. "4번째" 가 아닌 "마지막" 이 되기 위한 가드

- R1 PR 머지 조건: ESC/POS 바이트 스냅샷 6종 **동일**. (프린터 쪽이 원본이므로 바이트가 바뀌면 설계 전제 위반.)
- R4 PR 머지 조건: `receipt-same-as-pos.spec.ts` + ReceiptCard 스크린샷 비교 **양쪽** 통과.
- R5 가 landing 전에 R3/R4 landing 하지 말 것 — "보존 검사 없이 모양 수정" 이 지금까지 매번 어긋난 이유.

---

## 4. Kyu 결정 필요 질문 (최대 3개)

### Q1. **숫자 포맷 — IDR vs Rp · 콤마 vs 점?**
현재 세 쪽이 다 다름 (`IDR 16,500` · `Rp 16.500` · `16.500`). "같은 영수증" 을 원하므로 하나로 통일 필요.

- 권장: **`Rp 16.500`** (ID 로케일 · 손님이 매일 보는 포맷). 이미 ERP·행정 영수증·현지 영수증 대부분 "Rp"·점 천단위. POS "IDR" 은 수출용/회계용 느낌 → 현지 손님에게 어색.
- 반론: `IDR` 은 ISO 코드라 국제 송장·결제 비교에 편함. 하지만 손님용 영수증에서는 과잉.
- 선택지: (a) 세 쪽 모두 `Rp 16.500` / (b) 세 쪽 모두 `IDR 16,500` / (c) 손님=Rp · 관리/프린터=IDR (분리 유지 · 지금 상태) ← 그러면 질문의 전제 ("같은 영수증") 자체가 깨짐.

### Q2. **i18n 라벨 — "손님 화면" 에서도 영어?**
POS/프린터는 영어 고정 (ADDENDUM §2). CD 는 `CartStrings` + `RECEIPT_LABELS` 로 5개 언어 (`Diterima`/`받은 돈`/`Kembalian`/`お預かり`/`实收`).

- 권장: **영수증은 영어 고정** (POS 와 같은 모양 원칙). 영수증 상단에 매장명·주소가 ID 로 나와 있어 손님은 매장 맥락을 안다. 라벨 영어는 글로벌 영수증 관행.
- 반론: 손님 화면은 손님 전용이니 모국어가 친절. CD 2025Q4 다국어 노력 손실.
- 선택지: (a) 모두 영어 / (b) "매장명·주소·footer" 만 설정, 그 외 라벨은 영어 (snapshot `labels` 그대로 소비) / (c) CD 만 5개 언어 라벨 유지 ← 모양 100% 일치 안 됨.

### Q3. **공용 패키지 위치 — storeport workspace 로 agilo 흡수? 아니면 npm publish?**
`packages/receipt-lines` 가 POS (agilo-medusa-pos-fork) 와 CD (storeport apps/customer-display) 양쪽에서 쓰여야 함.

- 권장: **단기 npm publish (`@curiocity/receipt-lines`)** · **중기 agilo 를 storeport workspace 로 흡수**. 이유: agilo fork 가 narisolutions 원본 PR 추적 때문에 리포 분리가 필요 → 즉시 흡수 어려움 (`EPIC-STATE` 에 흡수 초안이 있는지는 확인 필요). npm publish 로 R1~R2 즉시 가능.
- 반론: npm publish = 매 라운드마다 bump + release · 흐름 느려짐. 모노레포 workspace 가 개발 속도는 빠름.
- 선택지: (a) npm publish 즉시 / (b) agilo 흡수 먼저 (1~2주 소요) / (c) agilo 에 심볼릭 링크 or git subtree (hack · 추천 안 함).

---

## 부록 A. 캡처 자료

- `assets/receipt-diff-20261127/01-pos-receipt-card.png` — POS ReceiptCard (agilo `screenshots-m1-1105-av/02-ipad-receipt-single-sale.png` 복제).
- `assets/receipt-diff-20261127/02-customer-display-receipt-qris.png` — CD ReceiptScreen (storeport `apps/customer-display/screenshots/m0-1125-c-receipt-qris.png`, 11-27 13:34 재생성).
- `assets/receipt-diff-20261127/03-printer-escpos-text.txt` — ESC/POS 텍스트 덤프 (agilo `docs/testing/receipt-escpos-sample.txt` 복제).

> 세 자료는 **같은 주문 데이터가 아님** (아카이브 조합). "같은 주문 1건 · 아이맥 실시간 캡처" 는 R5 보존 e2e 가 담당 (이 라운드에서 이미 커버). 진단 단계에서는 코드 레벨 비교 (§2-A) 가 1:1 이고 자료보다 상세.

## 부록 B. 세션 명령 로그

```bash
# 1) 지도 수집
grep -rn "ReceiptCard" apps/ components/ app/  # agilo fork
find apps -type f -iname "*receipt*"           # storeport
find packages/receipt-view-model -name "*.ts"

# 2) CD 영수증 재캡처
cd /Users/kyu.lee/curiocity-live/storeport-wts/hub-m2
CD_E2E_PORT=4193 pnpm --filter customer-display e2e --grep "qris 단일"
# → apps/customer-display/screenshots/m0-1125-c-receipt-qris.png (487ms pass)

# 3) 자료 복사
cp apps/customer-display/screenshots/m0-1125-c-receipt-qris.png \
   ~/projects/curiocity-relay-wts/M2-1127-H/assets/receipt-diff-20261127/02-...
cp ~/projects/agilo-medusa-pos-fork/screenshots-m1-1105-av/02-ipad-receipt-single-sale.png \
   ~/projects/curiocity-relay-wts/M2-1127-H/assets/receipt-diff-20261127/01-...
cp ~/projects/agilo-medusa-pos-fork/docs/testing/receipt-escpos-sample.txt \
   ~/projects/curiocity-relay-wts/M2-1127-H/assets/receipt-diff-20261127/03-...
```

끝.
