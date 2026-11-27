# M2-1127-S Report

## PASS · 브랜치 `feat/M2-1127-P-receipt-printer-parity` · 남은 차이 0

---

## REQ 1 — 10곳 fork 프린터 패리티 수정

`packages/receipt-lines/src` 3개 파일 수정.

### 변경 내역 (M1-1127-M §REQ 3 표 대응)

| # | 항목 | 변경 전 (storeport) | 변경 후 (fork 패리티) |
|---|------|--------------------|--------------------|
| 1 | 헤더 앞 BlankLine | `BlankLine` 추가 | 제거 (rule 직전) |
| 2 | 영수증 번호 | `KVLine("No.", "R-xxx")` 우측정렬 | `TextLine("No. R-xxx")` 왼쪽정렬 |
| 3 | 날짜 | `KVLine("Date", "YYYY-MM-DD HH:mm WIB")` 우측정렬 | `TextLine("Date YYYY-MM-DD HH:mm WIB")` 왼쪽정렬 |
| 4 | `#N` 메타줄 | 없음 | `TextLine("#42")` (queue block 뒤 메타에 추가) |
| 5 | Cashier | `KVLine("Cashier", "이름")` 우측정렬 | `TextLine("Cashier 이름")` 왼쪽정렬 |
| 6 | void/refund Cashier | `KVLine("Cashier", "이름")` | `TextLine("Processed by 이름")` |
| 7 | void/refund 배너 meta | `BannerLine(meta:"Original No. …")` | `BannerLine(meta:undefined)` + `TextLine("Original No. …")` |
| 8 | void/refund 메타 블록 | 없음 | `KVLine("Method", "CASH")` + `KVLine("Refund total", "-Rp N")` + rule (품목 앞) |
| 9 | CARD 상세 | `{label:'Brand', value:'Visa'}` + `{label:'Card', value:'**** 1234'}` (KV 2줄) | `{label:'', value:'  Visa ****1234'}` (1줄 평문) |
| 10 | footer 앞/뒤 | footer 앞 BlankLine + footer 뒤 rule | 양쪽 제거 (footer가 마지막 줄) |

### 추가: `TextLine` 타입 신설

- `packages/receipt-lines/src/line-types.ts` — `TextLine` 추가 · `ReceiptLine` 유니온에 편입
- `packages/receipt-lines/src/render-text.ts` — `renderText()` 추가 · `renderTender` empty-label 패치
- `packages/receipt-lines/src/index.ts` — `TextLine` export 추가

---

## REQ 2 — 패리티 테스트 전 종류

`packages/receipt-lines/tests/parity.test.ts` 에 5가지 종류 추가. 모두 32칸 텍스트 렌더 → frozen 샘플 byte-for-byte 비교.

| 종류 | 샘플 파일 | 결과 |
|------|-----------|------|
| sale | `docs/testing/receipt-escpos-sample.txt` | PASS |
| CARD sale | `docs/testing/receipt-escpos-card.txt` | PASS |
| QRIS sale | `docs/testing/receipt-escpos-qris.txt` | PASS |
| void | `docs/testing/receipt-escpos-void-s.txt` | PASS |
| refund | `docs/testing/receipt-escpos-refund-s.txt` | PASS |

검증의 검증 (품목 순서 변경 시 패리티 깨짐 테스트) 포함.

CARD 상세 1줄 inline (`  Visa ****1234`) 검증.
void/refund Method+Refund total 블록 위치 (품목 앞) + footer 마지막 검증.

---

## REQ 3 — 손님 화면(customer-display) 영향 없음

`apps/customer-display` 는 `@storeport/receipt-view-model` 패키지 사용 — `@storeport/receipt-lines` 와 독립.
`receipt-view-model` 은 `receipt-lines` 에 의존하지 않음 → 이 변경으로 customer-display 렌더 영향 없음. 스냅샷 갱신 불필요.

---

## 테스트 결과

```
Test Files  3 passed | 1 skipped (4)
     Tests  43 passed | 5 skipped (48)
```

TypeScript: 에러 0 (`pnpm --filter receipt-lines typecheck`)

새로 추가된 테스트: 7개 (parity 5종 × byte-for-byte + 추가 단위 2개)
기존 수정된 테스트: 5개 (실패→통과 전환)
