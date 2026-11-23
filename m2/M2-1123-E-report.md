PASS · PR #235 · mergeable=CLEAN

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/235

## 변경 파일

| 파일 | 내용 |
|------|------|
| `types/receipt.ts` | `ReceiptSnapshot.pos_order_num?: number \| null` 추가 |
| `components/receipt/ReceiptCard.tsx` | 로고 블록 아래 `#N` 큰 텍스트 + "Queue" 라벨 · `testID: receipt-queue-num / receipt-queue-block` |
| `lib/printer/receipt-escpos.ts` | `Queue #N` 가운데 굵게 · rule 구분 · pos_order_num 없으면 블록 생략 |
| `__tests__/m2-1123-e-receipt-queue-num.test.ts` | Vitest 단위 테스트 7개 · 모두 통과 |
| `e2e/flows/M2-1123-E-receipt-num.spec.ts` | Playwright 어설션 (pos_order_num=3 → `#3` 가시 · 미설정 → 블록 없음) |

## 자기 검증

- **단위 테스트**: `vitest run __tests__/m2-1123-e-receipt-queue-num.test.ts` → 7/7 PASS
- **TypeScript**: 에러 수 38 → 38 (신규 에러 0 · 기존 pre-existing 유지)
- **Playwright**: `e2e/flows/M2-1123-E-receipt-num.spec.ts` — 로컬 dev 서버 없이 CI 에서 검증 필요
- **실물 프린터**: ESC/POS 바이트 단위 검증 완료 · BT-58D 실물 출력은 "실기 필요"

## 설계 결정

- `pos_order_num`을 `ReceiptSnapshot`에 추가 → PR #233 미머지 상태에서 UI 독립 구현 가능
  (서버가 snapshot에 포함시키기 전까지는 undefined/null → 줄 생략 · 기존 주문 회귀 0)
- `SuccessReceiptAnim`은 `ReceiptCard`를 렌더하므로 별도 번호 표시 없음 (티켓 "1곳만" 준수)
- PR #234(fix/M0-1123-E-checkout-test1) 미머지 → master 기준 최소 diff · `app/checkout/success/*` 무변경
