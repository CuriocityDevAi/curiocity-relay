# M3-1105-BA Report — 2026-11-12

## 진단

### 0a. 서버가 부분 환불 뒤 REFUND 영수증을 만드는지
- **만든다.** `POST /admin/pos/orders/:id/return` (#208) 응답에 `receipt_id` / `receipt_no` 포함 (`api/hooks/pos-refunds.ts:107-108`).
- 단, 현재 서버는 `kind='refund'` 로 발행 — 부분/전액 구분 없음. `kind='partial_refund'` 는 **서버 업데이트 필요**.

### 0b. 앱이 왜 원거래 영수증을 보여주는지
- **파일:줄** `app/orders/[orderId].tsx:631-633` (수정 전)
- 원인: `receiptId` 체인이 `md.refund?.receipt_id ?? md.void?.receipt_id ?? md.receipt_id` 만 확인. 부분 환불의 `receipt_id` 는 `md.returns[].receipt_id` 에 저장되는데 이 경로를 체크하지 않아 최종 `md.receipt_id`(원거래) 로 fallback.

### 0c. 환불 완료 토스트
- AZ 브랜치에서 이미 해결됨. `VoidRefundSheet.tsx:submitPartial:186-202`, `submitFull:224-255` 모두 `onClose() → setTimeout(toastFn, 100)` 패턴 적용. `__tests__/void-toast-order.test.ts` 어설션 존재.

---

## 항목 표

| REQ | 항목 | 파일:줄 | 커밋 | 상태 |
|---|---|---|---|---|
| 1 | `kind='partial_refund'` 타입 추가 | `types/receipt.ts:130` | b96926e | ✅ |
| 1 | PARTIAL REFUND 배너(검정) ReceiptCard | `components/receipt/ReceiptCard.tsx:153-162,175` | b96926e | ✅ |
| 1 | PARTIAL REFUND 배너 ESC/POS | `lib/printer/receipt-escpos.ts:122-128,164` | b96926e | ✅ |
| 1 | `receiptId` 체인 → `md.returns[]` 추가 | `app/orders/[orderId].tsx:634-650` | 9598b5f | ✅ |
| 1 | 영수증 탭 선택 UI (OptionChip · 기본=최신) | `app/orders/[orderId].tsx:800-820` | 9598b5f | ✅ |
| 2 | Share = PNG 캡처 유틸 | `lib/receipt-share.ts` | bee2826 | ✅ |
| 2 | ViewShot 래퍼 + onShare PNG | `app/orders/[orderId].tsx:701-717,817-820` | 9598b5f | ✅ |
| 2 | 텍스트 메모 공유 제거 | `app/orders/[orderId].tsx:709-717` | 9598b5f | ✅ |
| 3 | 환불 완료 토스트 | (AZ에서 해결) | — | ✅ |
| 4 | BA 어설션 16개 | `scripts/m3-1105-ba-assertions.mjs` | 8ba81ac | ✅ |

---

## 서버 필요 목록

| 항목 | 비고 |
|---|---|
| `/return` route — `kind='partial_refund'` 로 영수증 발행 | 현재 `kind='refund'` → 클라이언트 준비 완료 |
| 부분 환불 snapshot 에 세금 배분(tax allocation) | 현재 fixture `tax: {show: false}` |
| 주문 QR 코드 — snapshot 에 QR 데이터 | ReceiptCard 에 QR 렌더 미구현 |

---

## 새 패키지

```
expo-sharing ~58.0.2       → lib/receipt-share.ts
react-native-view-shot ^3.8.0  → app/orders/[orderId].tsx
```

**Kyu Mac `npm install` 필요** (types/native-modules.d.ts 로 TS 오류는 임시 억제)

---

## PR

**#108** https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/108  
base: `chore/m3-1105-az-cleanup` (AZ 미머지 → stacked)

## Kyu 확인 항목

- [ ] `npm install` 후 iOS 시뮬레이터 실행
- [ ] 부분 환불 완료 뒤 영수증 탭(Sale / Return) 표시 여부
- [ ] Share → ReceiptCard PNG → iOS 공유 시트(WhatsApp 등) 동작
- [ ] 서버 `kind='partial_refund'` 배포 후 "PARTIAL REFUND" 배너(검정) 확인

---

## git ls-tree (BA 신규 파일)

```
100644 fixtures/pos-receipt-partial-refund.json  d941071
100644 lib/receipt-share.ts                       fba145a
100644 scripts/m3-1105-ba-assertions.mjs          9df02d2
100644 types/native-modules.d.ts                  0cfe5b2
100644 docs/testing/receipt-escpos-partial-refund.txt
screenshots-m3-1105-ba/.gitkeep
```

## 이연 순증감

| 종류 | 항목 |
|---|---|
| 신규 파일 +4 | `lib/receipt-share.ts`, `fixtures/pos-receipt-partial-refund.json`, `scripts/m3-1105-ba-assertions.mjs`, `types/native-modules.d.ts` |
| 수정 파일 +4 | `types/receipt.ts`, `components/receipt/ReceiptCard.tsx`, `lib/printer/receipt-escpos.ts`, `app/orders/[orderId].tsx` |
| 패키지 +2 | `expo-sharing ~58.0.2`, `react-native-view-shot ^3.8.0` |

---

## 착지 명령

```bash
cp /tmp/M3-1105-BA-report.md ~/projects/curiocity-relay/m3/ && cd ~/projects/curiocity-relay && git add m3/M3-1105-BA-report.md && git commit -m "m3: M3-1105-BA" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M3-1105-BA done "partial_refund kind · returns[] receipt_id 체인 · Share PNG · 영수증 탭 선택 · 어설션 16개 · PR#108"
```
