# R0-1128-B 리포트

**CHANGES (선택 1건) · parity 테스트 snapshot화 플래그 · 테스트 43/43 통과**

---

## 판정

| 항목 | 결과 |
|---|---|
| 전체 판정 | CHANGES (선택 1건) |
| parity 테스트 진짜 여부 | snapshot 테스트 (자기 일치) — fork 직접 출력 비교 아님 |
| npm test | 43 passed / 5 skipped |

---

## 1. resolve-receipt-lines.ts × fork 프린터 대조

fork `receipt-escpos.ts` (HEAD · pre-b6e0e66) 직접 대조:

| 항목 | 판정 |
|---|---|
| No./Date TextLine 왼쪽 정렬 | ✅ |
| Original No. TextLine (void/refund) | ✅ |
| `#42` meta줄 (b6e0e66 pos_order_num→"#N") | ✅ |
| Cashier / Processed by | ✅ |
| 카드 1줄 `  Visa ****1234` | ✅ |
| 헤더 앞 blank 제거 | ✅ |
| void/refund 메타 블록 (Method+Refund total) 품목 앞 | ✅ |
| footer 뒤 rule 제거 | ✅ |

모든 규칙이 fork 프린터 코드(`receipt-escpos.ts:99-217`)와 일치.

---

## 2. parity.test.ts — snapshot 테스트 여부

**결론: 자기 일치 테스트 (선택 CHANGES)**

- comment가 "fork 프린터 ESC/POS 렌더러 출력을 **직접 옮긴**" → "M2-1127-S fork 프린터 패리티 기준으로 **생성한**"으로 명시적으로 변경됨
- 신규 4개 fixture(card/qris/void-s/refund-s)는 `WRITE_SAMPLE=1` → `resolveReceiptLines + renderLinesAsText` 생성
- parity.test.ts는 resolveReceiptLines 출력 vs resolveReceiptLines 생성 fixture → snapshot 테스트
- 단, fork b6e0e66이 resolveReceiptLines 래퍼로 전환되어 아키텍처 레벨 패리티 유지
- fork의 `lib/receipt-lines`가 storeport `packages/receipt-lines`와 독립 관리 → drift 감지 불가

---

## 3. fixtures 5종 커버

sample · card · qris · refund-s · void-s — 5종 모두 커버 ✅

---

## 4. 테스트 로그

```
✓ tests/currency.test.ts (6 tests)
↓ tests/__write-sample.test.ts (5 tests | 5 skipped)
✓ tests/parity.test.ts (9 tests) 21ms
✓ tests/resolve-receipt-lines.test.ts (28 tests) 7ms

Tests  43 passed | 5 skipped (48)
```

---

## 5. PR 코멘트

storeport#485 에 COMMENT 제출 (자기 PR이라 REQUEST_CHANGES 불가).
