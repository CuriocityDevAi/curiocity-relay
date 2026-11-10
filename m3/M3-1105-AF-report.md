# M3-1105-AF — P6 영수증 (Void / Refund 화면 + ESC/POS 출력) 리포트

- 원장: `ledger/decision-p6-20261110.md` (Kyu 11-10 15:43 · 환불 수단 규칙 · Q5 품목 단위)
- 서버 PR: storeport #207 (void/refund 영수증 kind + snapshot) · #208 (return / 반품 줄 수량 단위)
- 브랜치: `feat/m3-1105-af-void-refund-receipt` (origin/master 최신 리베이스 완료)

## 범위
- `types/receipt.ts`  — `ReceiptSnapshot.parent_receipt_no?: string | null` 선택 필드 추가 (서버 배포 전 undefined 허용 · sale 회귀 0).
- `components/receipt/ReceiptCard.tsx`  — 상단 큰 `VOID` / `REFUND` 배너 · 원 영수증 번호 줄 (`Original: No. R-...`) · `Processed by` 접두 · 환불 메타 블록 (`Method` · `APPROVAL` · `Refund total` 음수 bold).
- `lib/printer/receipt-escpos.ts`  — `*** VOID ***` / `*** REFUND ***` 배너 (center · bold) · 헤더에 원 영수증 번호 줄 · 메타 블록 (`Method`, `Refund total`) · 32 자 폭 유지 · 로고 공용 상수 (`LOGO`, `BLOCK_GAP_LINES`, `TAIL_FEED_LINES`) 그대로.
- fixture 2 종 (`fixtures/pos-receipt-void-card-terminal.json` · `fixtures/pos-receipt-refund-partial-cash.json`) — 서버 void/return route 가 호출하는 `receiptSvc.buildSnapshot` 산출물 + `kind` + `parent_receipt_no` 를 그대로 받아 실재 shape.
- 어설션 `scripts/m3-1105-af-assertions.mjs` · 스샷 `scripts/m3-1105-af-screenshots.mjs`.
- 미출력(not touched): `app/orders/**` · `app/checkout/**` — 파일 주인 규칙대로 보호.

## 서버 #207 / #208 필드 매핑

| Kyu 요구 필드 | 노출 위치 (화면 · ESC/POS) | 서버 소스 |
|---|---|---|
| 원 영수증 번호 | `receipt-parent-no` 줄 · `Original No. R-...` | `snapshot.parent_receipt_no` (M3-1105-AF 가 신설 · 서버 배포 뒤 채움). `undefined` 면 줄 생략. |
| 환불 수단 (card_terminal / cash) | `Method` 줄 · `CARD TERMINAL` / `CASH` | `snapshot.tenders[0].method` (card ↔ card_terminal · cash ↔ cash) |
| 승인번호 | APPROVAL 줄 (card 분기 tender detail) | `snapshot.tenders[0].approval_code` (void route line 308 · return route line 498) |
| 반품 줄 (이름·수량·금액) | items 목록 (기존 ReceiptCard · ESC/POS 분기) | `snapshot.items[]` · return route 는 `lineRefunds` 만 포함 (Q5 품목 단위) |
| 환불 합계 | `Refund total -IDR N,NNN` bold | `sum(|snapshot.tenders[i].amount|)` (서버가 음수로 저장 → 절대값 합산) |
| 처리자 | `Processed by: <name>` | `snapshot.cashier.name` (sale 과 동일 경로 · void/refund 는 접두만 교체) |
| 시각 | `Date YYYY-MM-DD HH:MM WIB` | `receipt.issued_at` (Intl.DateTimeFormat Asia/Jakarta) |

## 어설션 (run-all)
- `scripts/m3-1105-af-assertions.mjs` → **30/30 pass**
  - V1 32 자 폭 가드 · V2 void 필드 노출 10 항목 · V3 raw hex 0
  - R1 32 자 폭 가드 · R2 refund 필드 7 항목 · R3 raw hex 0
  - S1 sale 회귀 8 항목 (배너·메타·`Processed by`·`Original No.` 미노출 · 기존 `Cashier` · `IDR 95,000` 유지)
- `scripts/m2-1105-m-receipt-escpos-assertions.mjs` → **39/39 pass** (sale 영수증 회귀 0 · `Service charge` · `PBJT` · card/qris tender · 긴 품목 wrap 포함)
- `scripts/m2-1104-d-escpos-assertions.mjs` → **29/29 pass**
- `scripts/m2-1105-p-logo-bitmap-assertions.mjs` → **37/37 pass**

## 미리보기 (수동 리뷰)
- ESC/POS 텍스트
  - `docs/testing/receipt-escpos-void.txt`  — `*** VOID ***` + MEROS + No/Date/Original/Order/Processed + Method/Refund total + Cheese Bread + Subtotal/TOTAL + CARD -IDR 95,000 + APPROVAL 123456 + Thank you.
  - `docs/testing/receipt-escpos-refund.txt` — `*** REFUND ***` + 동일 shape, 수단 CASH · total -IDR 60,000 (품목 수량 1 · 부분 환불).
- Playwright 웹 스샷 (iPad 1366x1024)
  - `screenshots-m3-1105-af/01-ipad-receipt-void.png` — ReceiptCard "VOID" 큰 배너 (danger 색) · 헤더 · 메타 블록 · 품목 · tender · Hand over / Share / Reprint 버튼.
  - `screenshots-m3-1105-af/02-ipad-receipt-refund-partial-cash.png` — ReceiptCard "REFUND" 배너 · cash 분기 (APPROVAL 줄 미노출 검증) · 반품 줄 수량 1.

## 서버 배포 전·후 동작
- 서버 #207 / #208 배포 **전**: `snapshot.parent_receipt_no` 가 undefined → 화면·ESC/POS 에서 `Original` 줄 자동 생략. 나머지 환불 메타는 tenders / items / cashier 에서 그대로 파생 → 즉시 동작.
- 서버 배포 **후**: 서버가 `parent_receipt_no` 를 snapshot 에 채우면 `Original No. R-...` 가 추가로 노출 (코드 변경 없이 즉시 반영).

## Kyu 실기 체크
- Kyu 실기 = **storeport #207 · #208 배포 뒤** POS 에서 void / 부분 환불을 실행하고 (a) 화면 ReceiptCard "VOID"/"REFUND" 배너 · 원 영수증 번호 · 환불 수단 · 승인번호 · 환불 합계 · 처리자 · 시각 7 요소 모두 노출 (b) BLE 프린트 ESC/POS 가 동일 내용을 32 자 폭으로 출력.

## PR 본문 요약 (3 줄)
```
서버 #207/#208 void/refund 영수증 — 화면 ReceiptCard + 58mm ESC/POS 에 큰 "VOID"/"REFUND" 배너 · 원 영수증 번호 · 환불 수단 · 승인번호 · 반품 줄 · 환불 합계(음수) · 처리자 · 시각 7 요소 노출.
파일 주인 범위 안: types/receipt.ts · components/receipt/** · lib/printer/receipt-escpos.ts · 어설션/스샷. parent_receipt_no 선택 필드로 추가 (sale 회귀 0).
Kyu 실기 = 서버 #207 · #208 배포 뒤 void / 부분 환불 시 화면/프린트 7 요소 노출.
```
