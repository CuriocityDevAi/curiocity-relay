fork PR #167 · W9·S7 교체 완료 · 테스트 22 pass

## 결과 요약

- **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/167
- **브랜치**: `fix/m3-1117-a` (from origin/master)
- **vitest**: 38 files · 456 pass (신규 22개)
- **playwright**: 4 pass · 스크린샷 3장 (`screenshots-m3-1117-a/`)
- **tsc**: 내 파일 에러 0 (기존 에러 무변화)
- **lint**: errors 0

## 변경 파일

| 파일 | 역할 |
|------|------|
| `lib/phone-id.ts` (신규) | storeport `normalizePhone`·`maskE164` 포팅 (sync 주석 포함) |
| `api/hooks/customers.ts` | `useCustomers` → `/admin/pos/customers/search`; `useCreateCustomer` → phone 있으면 `/admin/pos/customers` POST |
| `app/customer-lookup.tsx` | phone refine·PhoneNumpadField·toast·필드에러·phone_display |
| `__tests__/m3-1117-a-phone.test.ts` (신규) | 22 테스트 |
| `scripts/m3-1117-a-playwright.mjs` (신규) | 스크린샷 스크립트 |

## REQ 대사

1. ✅ `customerFormSchema.phone`: `normalizePhone` refine · "Please enter a valid Indonesian mobile number"
2. ✅ 번호 칸 = 앱 내 `NumericKeypad` 기본 · 시스템 키보드 없음
3. ✅ phone 있으면 `POST /admin/pos/customers` · created:false → "Existing customer found" 토스트 · 400/409 → 필드 에러
4. ✅ `useCustomers` → `GET /admin/pos/customers/search` · `phone_display` 표시
5. ✅ 테스트: 081380442480 / 0813-8044-2480 / +62 813 8044 2480 세 형식 → 동일 e164 · 엔드포인트 분기 · created:false · invalid → error · search URL · sdk.admin.create 0회

## 금지 항목 준수

- draft-orders.tsx / _layout.tsx: 미수정 ✅
- orders.tsx / orders.ts: 미수정 ✅
- loyalty-link.ts / Link 시트 / 결제 화면: 미수정 ✅
- NumericKeypad 파일: import만, 수정 없음 ✅
- 서버(storeport) 수정: 없음 ✅

## 미검증 항목

- 실제 iPad에서의 숫자패드 렌더링 (web Playwright에서 확인, 실기기 미테스트)
- storeport M0-1117-A 미배포 상태이므로 서버 연동 실기 미검증

## Kyu 질문

없음 (기존 email 필수 규칙 등 그대로 유지)

## 이연 순증감

- 신규 파일: +3 (`lib/phone-id.ts`, `__tests__/m3-1117-a-phone.test.ts`, `scripts/m3-1117-a-playwright.mjs`)
- 수정 파일: 2 (`api/hooks/customers.ts`, `app/customer-lookup.tsx`)
- 삭제: 없음
