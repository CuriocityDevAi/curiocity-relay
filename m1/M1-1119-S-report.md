storeport PR #401 · quote header=snapshot header O · approval_code O · tender at O · IT 1/1 · tsc 0

## 작업 요약

### 브랜치
`feat/M1-1119-S-quote-receipt-header` → https://github.com/CuriocityDevAi/storeport/pull/401

### 변경 파일
- `apps/commerce-core/src/api/admin/pos/orders/[id]/quote/route.ts`
- `apps/commerce-core/integration-tests/pos/tenders.spec.ts` (IT #72 추가)

### 선행 작업 확인
- `feat/M1-1119-R-quote-receipt-header` 브랜치: 커밋 없음 (인터럽트 전 작업 없음) → 처음부터 구현.

### 구현 내용
1. `quote/route.ts` — `buildSnapshot` 과 동일한 CRLF→LF 정규화 로직으로 `header` 생성.  
   `footer`, `logo_mode`, `tenders`(metadata.tenders 전달 · approval_code · at 포함) 추가.  
   기존 필드 완전 유지(하위 호환).

2. IT #72 — `quote.header === snapshot.header` 문자열 완전 일치, card tender `approval_code` · `at` 검증.

### 검증 결과
- tsc --noEmit: 0 errors
- unit tests: 47 suites / 539 tests PASS

### 응답 예시 (추가 필드)
```json
{
  "header": "Soopsok Sweets\nPondok Indah Mall 3 LG\nWA : 0813-1234-5678",
  "footer": "Thank you",
  "logo_mode": "full",
  "tenders": [
    {
      "method": "card",
      "amount": 100000,
      "at": "2026-11-19T13:00:00.000Z",
      "bank": "Mandiri",
      "approval_code": "APPR-001",
      "card_last4": "9999"
    }
  ]
}
```
