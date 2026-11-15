# M3-1105-CS Report

## Remaining 출처(파일:줄) · 왜 #273으로 안 고쳐졌나 · 수정 PR · 테스트

**Remaining 출처**: `app/checkout/split-tender/[draftOrderId].tsx:132`  
`const remaining = firstResponse?.remaining ?? 0;`  
→ `firstResponse` 는 QRIS POST `/tenders` 응답 (캡처 전).

**왜 #273으로 안 고쳐졌나**:  
#273 은 `GET /admin/pos/orders/:id` 의 `paid_so_far` 계산 수정.  
앱은 step 2 진입 시 GET을 재호출하지 않고 `firstResponse.remaining` (QRIS 세션 생성 응답)을 그대로 사용.  
POST `/tenders` QRIS 단락 (`route.ts:1054-1055`) 은 `paidSoFarBefore=0`(캡처 전) → `remaining=orderTotal` 반환.  
두 경로가 독립 → GET 수정만으로는 앱 버그 미해결.

**수정 PR**:
- 앱 (fork): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/146  
  - `remaining = grandTotal - firstResponse.amount` (서버 cached 값 무시 · 항상 정확)
  - `step='qris-confirmed'` 중간 화면 추가 (체크 아이콘 · QRIS IDR 50,000 · Remaining · Continue 버튼)
- 서버 (storeport): https://github.com/CuriocityDevAi/storeport/pull/283  
  - POST `/tenders` QRIS 단락 `paid_so_far = paidSoFarBefore + amount`, `remaining = orderTotal - paid_so_far`
  - 통합 테스트 `#69b` 어설션 정정 (`remaining=50000` → `0`)

**테스트**:
- `vitest run`: 27 files, 307 passed | 6 expected fail ✓
- 추가 테스트 4개: QRIS remaining 계산 (서버 버그값 vs 앱 올바른 계산 대조)
- 실기 (Simulate payment → 확인 → Continue → 2nd Remaining): **미검증** (로컬 서버 미실행)

## 확인 항목

| 항목 | 상태 |
|------|------|
| Remaining 출처 파일:줄 확정 | ✓ split-tender/[draftOrderId].tsx:132 |
| 왜 #273으로 안 고쳐졌나 | ✓ GET/POST 경로 독립, 앱 재조회 없음 |
| 앱 remaining 수식 수정 | ✓ grandTotal - firstResponse.amount |
| QRIS 1차 성공 피드백 화면 | ✓ QrisConfirmedStep 컴포넌트 추가 |
| 서버 paid_so_far 수정 | ✓ storeport PR #283 |
| vitest 통과 | ✓ 27 files, 307 tests |
| 실기 확인 | 미검증 |

## 이연 순증감

없음.
