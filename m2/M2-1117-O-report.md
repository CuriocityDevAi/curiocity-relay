PR #335 · earn 상계 · 테스트 6 통과 · 회귀 0

## 완료 항목

- `earn.ts`: `loyalty_negative.offset()` 호출 추가 (plugin credit 직전)
- ref 형식: `offset:earn:<order_id>` (멱등 가드)
- 빚 >= 적립 → `creditAccounts` skip (credited=0)
- 빚 < 적립 → 잔여분만 credit
- `metadata.loyalty_earn` 에 earned · offset · credited 3값 기록
- `EarnResult` 인터페이스에 offset · credited 필드 추가
- 모듈 미설치/장애 → non-fatal (try/catch · offset=0 fallback)
- 멱등: metadata.loyalty_earn.applied=true 재진입 시 offset/credit 중복 없음

## 테스트 (earn-offset.unit.spec.ts 신규 6건)

1. 전액상계: 빚(5k) > 적립(3k) → credited=0, creditAccounts 미호출 ✅
2. 부분상계: 빚(2k) < 적립(5k) → credited=3k, creditAccounts 호출 ✅
3. 빚없음: offset=0, credited=earned, creditAccounts 전액 호출 ✅
4. 재시도: loyalty_earn.applied=true → idempotent=true, 중복 없음 ✅
5. 모듈미설치: non-fatal, offset=0, 전액 credit ✅
6. 손님없는주문: skipped_reason=no_customer, offset 미호출 ✅

전체 400 테스트 PASS · 회귀 0

## 비고

서버 내부 로직 · Kyu 실기 불필요
PR: https://github.com/CuriocityDevAi/storeport/pull/335
브랜치: feat/M2-1117-O-earn-offset
