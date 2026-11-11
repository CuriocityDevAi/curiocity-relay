# M1-1105-AV 리포트 — 나눠 결제 영수증

## 대사표

| 항목 | 화면 (ReceiptCard) | 프린터 (ESC/POS) | 비고 |
|---|---|---|---|
| Sale: 수단 두 줄 (Cash+Card) | **이미 됨** | **이미 됨** | `tenders.map` / `for` loop |
| Sale: 현금 받은돈/거스름돈 | **이미 됨** | **이미 됨** | TenderBlock cash branch |
| Sale: 카드 끝4자리/승인번호 | **이미 됨** | **이미 됨** | TenderBlock card branch |
| Void/Refund: 수단별 금액 (현금 먼저) | **안 됨 → 구현** | **안 됨 → 구현** | meta block이 `tenders[0]`만 참조 → 수정 |
| 테스트 fixture (split payment sale) | 없음 → 추가 | 없음 → 추가 | `pos-receipt-split-sale.json` |
| 테스트 fixture (split payment refund) | 없음 → 추가 | 없음 → 추가 | `pos-receipt-split-refund.json` |

**서버(storeport #212) 영수증 응답 필드**: `types/receipt.ts:101` — `tenders: ReceiptTender[]` (기존 배열 타입으로 이미 지원). Cash: `method:'cash'`, `amount`, `received_amount?`, `change?` (`types/receipt.ts:10-16`). Card: `method:'card'`, `amount`, `card_last4?`, `approval_code?` (`types/receipt.ts:17-28`).

## 변경 요약

### 구현한 부분 (REQ 2 — 안 된 부분)

**`components/receipt/ReceiptCard.tsx`**
- `refundMetaFromTenders`: 단일 tender → 기존 동작 유지. 복수 tender → `splitRows: [{label, amount}]` 반환 (현금 먼저 정렬).
- 렌더링: `splitRows` 있으면 각 행 `{label} IDR {|amount|}` 표시; 없으면 기존 `Method + Approval + Refund total`.

**`lib/printer/receipt-escpos.ts`**
- `voidRefundMetaLines`: 단일 tender → 기존 `Method LABEL + Refund total`. 복수 tender → 현금 먼저 각 `LABEL IDR |amount|` + `Refund total`.

### 추가 파일
- `fixtures/pos-receipt-split-sale.json` — storeport #212 split payment (Cash+Card) 응답 shape
- `fixtures/pos-receipt-split-refund.json` — storeport #212 split refund (Cash+Card 음수)
- `scripts/m1-1105-av-assertions.mjs` — ESC/POS 어설션 34개
- `scripts/m1-1105-av-screenshots.mjs` — iPad 1180×820 스샷 스크립트
- `docs/testing/receipt-escpos-split-sale.txt` — ESC/POS 텍스트 덤프
- `docs/testing/receipt-escpos-split-refund.txt` — ESC/POS 텍스트 덤프

## PR 번호

**#93** — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/93

## PR 본문 확인 (실기 항목)

**iPad: 나눠 결제 후 영수증에 수단 두 줄**
- `screenshots-m1-1105-av/01-ipad-receipt-split-sale.png`: CASH IDR 50,000 (Received/Change) + Card (EDC) IDR 50,000 (Bank BCA, Brand VISA, Card ****5678, APPROVAL SPLIT1) ✅

## Playwright 실행 결과

직접 실행 완료:
```
--- (1) 나눠 결제 Sale 영수증 (Cash+Card) ---
  📸 01-ipad-receipt-split-sale.png
--- (2) 단일 결제 Sale 영수증 (Cash only · 회귀) ---
  📸 02-ipad-receipt-single-sale.png
M1-1105-AV screenshots OK
```

## 어설션 결과

```
34/34 passed · 0 failed
```

(S1~S4) 나눠 결제 Sale — 수단 두 줄, 현금 Received/Change, 카드 끝4자리/승인번호, 합계=주문금액  
(R1~R4) 나눠 결제 Refund — REFUND 배너, 메타 블록 현금 먼저, CARD TERMINAL 금액, 환불 합계  
(W1~W2) 32자 폭 가드  
(REG) 단일 tender sale/void/refund 회귀 0

## ESC/POS 텍스트 덤프

**split-sale**:
```
CASH                  IDR 50,000
Received              IDR 50,000
Change                     IDR 0
CARD                  IDR 50,000
  VISA ****5678
APPROVAL                  SPLIT1
```

**split-refund** (메타 블록):
```
CASH                  IDR 50,000
CARD TERMINAL         IDR 50,000
Refund total        -IDR 100,000
```

## 이연 순증감

- `m3-1105-d-assertions.mjs` (3개), `m3-1105-ad-assertions.mjs` (2개), `m3-1105-ae-assertions.mjs` (1개) → 기존 미해결 (본 PR 범위 외)

## 착지 명령

```
cp /tmp/M1-1105-AV-report.md ~/projects/curiocity-relay/m1/ && cd ~/projects/curiocity-relay && git add m1/M1-1105-AV-report.md && git commit -m "m1: M1-1105-AV" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M1-1105-AV done "나눠 결제 영수증 — Void/Refund 메타 블록 현금 먼저 · PR #93"
```
