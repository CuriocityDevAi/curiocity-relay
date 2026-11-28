# R0-1128-E · fork#292 리뷰 결과

**CHANGES · 바이트 diff ≠ 0 (5종 전체)**

## REQ-1 · 5종 ESC/POS 바이트 비교

fork master(`origin/master` = 73ae612) vs PR#292 head(`e768836`)에서 동일 fixture로 `renderReceiptEscPos` 직접 실행 비교.

| 케이스 | 바이트 동일 여부 |
|--------|----------------|
| sample | ✗ |
| card   | ✗ |
| qris   | ✗ |
| refund-s | ✗ |
| void-s   | ✗ |

**전체 5종 모두 차이 있음.**

## REQ-2 · 차이 항목 (모두 PR이 프린터 기준에서 벗어남)

| # | 항목 | fork master (매장 프린터) | PR #292 | 프린터 기준 |
|---|------|--------------------------|---------|------------|
| 1 | 통화 포맷 (5종 전체) | `IDR 15,000` (쉼표·IDR) | `Rp 15.000` (점·Rp) | 프린터 벗어남 |
| 2 | 메타 블록 `pos_order_num=null` | `Order #100` (order_display_id) | 해당 줄 없음 | 프린터 벗어남 |
| 3 | 메타 블록 `pos_order_num=7` | `Order #100` (order_display_id) | `#7` (pos_order_num 2회) | 프린터 벗어남 |
| 4 | QR 하단 텍스트 | `No. R-261127-0001` | `Scan to pay / verify` | 프린터 벗어남 |
| 5 | 구분선 구조 | tender 뒤 rule 없음 | tender 뒤 rule 추가 | 프린터 벗어남 |
| 6 | QRIS issuer | `  GoPay` (들여쓰기 plain) | `Issuer  GoPay` (KV) | 프린터 벗어남 |
| 7 | QRIS reference 라벨 | `Ref  REF001` | `Ref No.  REF001` | 프린터 벗어남 |
| 8 | 세금 라벨 | `PB1` | `PB1 10%` | 프린터 벗어남 |

**storeport@13014336 개선 3건은 master와 일치 ✓**: 카드 `****1234` 공백 없음 · Original No. 줄 · 메타 TextLine 형식.

**이전 리포트 표의 4개 차이(f33eef82 → 13014336)는 "옛 패키지 대비" 차이였음** — 그 중 3건은 master 쪽으로 수렴. 나머지 8건의 불일치는 storeport@13014336 이후에도 해소되지 않은 fork vs storeport 구조 차이다.

## REQ-3 · CI에서 skip되는 5건이 실제로 지키는 것

`m1-1127-m-receipt-lines-sync.test.ts`의 sha256 비교 5건은 `../storeport/packages/receipt-lines/src` 경로가 없으면 skip. CI(fork standalone)에서는 경로 없음 → 전부 skip. **CI는 `RECEIPT_LINES_VENDORED_FROM = "13014336"` 상수 값과 파일 존재 여부만 확인하며, vendored 파일과 storeport 원본의 바이트 동일성은 검증하지 않는다.** 즉 CI green이어도 vendored 파일이 storeport 원본과 다를 수 있다.

## REQ-4 · PR 코멘트

CHANGES 코멘트 제출 완료 (PR#292 · `e768836` · `CuriocityDevAi/agilo-medusa-pos-fork`).
