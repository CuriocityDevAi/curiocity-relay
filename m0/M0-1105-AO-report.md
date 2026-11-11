# M0-1105-AO Report

## 시나리오별 결과

| 시나리오 | 설명 | 결과 |
|---|---|---|
| (a) | 현금 결제 → Void(PIN) 성공 | ✅ 통과 |
| (b) | 결제 → fulfill(hand_over) → Void 성공 (M1-1105-AS) | ✅ 통과 |
| (c-i) | 오답 4회 → 정답 성공 (counter 리셋) | ✅ 통과 |
| (c-ii) | 오답 5회 → 정답 시도 → 423 locked | ✅ 통과 |
| (d) | 현금 결제 → 품목 1개 반품(PIN) | ✅ 통과 |
| (e) | 다른 교대에서 Refund(PIN) | ✅ 통과 |
| (f) | 나눠 결제 Cash 40k + Card 60k → 전체 반품 → CASH-first | ✅ 통과 |
| (g) | CARD 실패 주입 → partial → retry → completed · 2번 retry = 이중 환불 없음 | ✅ 통과 |

**실패 시나리오 없음** — 8/8 통과 (로컬 2회 모두).

## 실행 로그

### 1차 실행
```
PASS integration-tests/pos/p6-e2e.spec.ts (17.101 s)
  M0-1105-AO · P6 flow E2E (Admin PIN from API)
    ✓ (a) 현금 결제 → Void(PIN) 성공 (1533 ms)
    ✓ (b) 결제 → fulfill(hand_over) → Void 성공 (1394 ms)
    ✓ (c-i) 오답 4회 → 정답 성공 (counter 리셋) (830 ms)
    ✓ (c-ii) 오답 5회 → 정답 시도 → 423 locked (811 ms)
    ✓ (d) 현금 결제 → 품목 1개 반품(PIN) (664 ms)
    ✓ (e) 다른 교대에서 Refund(PIN) (921 ms)
    ✓ (f) 나눠 결제 Cash 40k + Card 60k → 전체 반품 → CASH-first (1101 ms)
    ✓ (g) CARD 실패 주입 → partial → retry → completed · 2번 retry = 이중 환불 없음 (909 ms)
Tests: 8 passed, 8 total  Time: 17.179 s
```

### 2차 실행
```
PASS integration-tests/pos/p6-e2e.spec.ts (15.116 s)
  M0-1105-AO · P6 flow E2E (Admin PIN from API)
    ✓ (a) 현금 결제 → Void(PIN) 성공 (1146 ms)
    ✓ (b) 결제 → fulfill(hand_over) → Void 성공 (1237 ms)
    ✓ (c-i) 오답 4회 → 정답 성공 (counter 리셋) (836 ms)
    ✓ (c-ii) 오답 5회 → 정답 시도 → 423 locked (643 ms)
    ✓ (d) 현금 결제 → 품목 1개 반품(PIN) (617 ms)
    ✓ (e) 다른 교대에서 Refund(PIN) (639 ms)
    ✓ (f) 나눠 결제 Cash 40k + Card 60k → 전체 반품 → CASH-first (1086 ms)
    ✓ (g) CARD 실패 주입 → partial → retry → completed · 2번 retry = 이중 환불 없음 (1118 ms)
Tests: 8 passed, 8 total  Time: 15.184 s
```

## PR

- **PR #217**: https://github.com/CuriocityDevAi/storeport/pull/217
- Base: `main`
- Branch: `test/m0-1105-ao-p6-e2e-admin-pin`
- 메모: `#216 머지 뒤 머지`

## PR 본문 확인 항목

- [x] `#216 머지 뒤 머지` 명시
- [x] `processes: [pos.manager_pin, pos.void, pos.refund, pos.return]` 포함
- [x] 로컬 2회 통과 명시

## 이연 순증감

- 신규 이연 없음
- 기존 이연 변동 없음 (M0-1105-AO 완료로 AL-AN-AO-CARRYOVER 항목 중 AO 완결)
