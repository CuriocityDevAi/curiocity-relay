# M2-1117-I 완료 리포트

## 브랜치
`fix/m2-1117-i-loyalty-consent-at` (HEAD: 28bd33f)

## [REQ 1] loyalty_consent 현재 저장 위치

- **파일**: `apps/commerce-core/src/lib/link-customer-order.ts`
- **기존 손님 업데이트**: 73-83행 — `consent && !customer.metadata?.loyalty_consent` 조건 시 `metadata.loyalty_consent: true` + `metadata.loyalty_consent_at: ISO string` 세팅
- **신규 손님 생성**: 97-98행 — 동의 시 동일 필드를 `createCustomers` metadata 에 포함
- **결론**: `customer.metadata` 에만 저장. order metadata 에는 loyalty_consent 관련 필드 없음.

## [REQ 2] toPosCustomer loyalty_consent_at 추가

**변경 파일**: `apps/commerce-core/src/api/admin/pos/customers/route.ts`

```typescript
// PosCustomer 인터페이스 추가
loyalty_consent_at: string | null;

// toPosCustomer 반환값 추가
loyalty_consent_at: (meta.loyalty_consent_at as string | undefined) ?? null,
```

## [REQ 3] 읽기 시 계산 (기존 손님 fallback)

현재 코드(`link-customer-order.ts`)는 consent 발생 시 항상 `customer.metadata` 를 업데이트함. 따라서 "주문에만 동의 기록이 있고 손님에는 없는" 시나리오는 현행 코드에서 발생하지 않음.

읽기 시 계산 = `metadata.loyalty_consent_at` 직접 읽기. null 이면 null 반환. 별도 order 조회 fallback 불필요 — 운영 DB 백필 없이 처리됨.

## [REQ 4] PR #174 필드명 확인

PR #174 diff 에 loyalty_consent_at 관련 내용 없음 (M3-1117-F = Orders 카드 채널 표기 작업). 필드명은 기존 metadata 키(`loyalty_consent_at`) 그대로 ISO string 사용.

## [REQ 5] 통합 테스트

`apps/commerce-core/integration-tests/pos/customers-pos-api.spec.ts` 에 2개 테스트 추가:
- "search: 동의 손님 → loyalty_consent_at 시각 포함" — metadata 에 `loyalty_consent_at` 세팅 후 search 응답 확인
- "search: 미동의 손님 → loyalty_consent_at null" — metadata 미세팅 손님의 search 응답 null 확인

## 미실행 (로그)

- 통합 테스트 실제 실행 미수행 (Medusa DB 필요 · 기존 패턴 그대로 작성)
- push/PR 미수행 (착지 명령 대기)

## Kyu 확인 항목

PR 본문 "같은 번호로 두 번째 방문 → 동의 체크 없이 Link":
- 첫 방문 시 consent 체크 → `loyalty_consent_at` 저장 → 이후 search 응답에 시각 포함
- POS 가 `loyalty_consent_at != null` 이면 체크박스 없이 Link 버튼 활성화

## 이연 순증감

없음 (신규 순증 0 · 처리 1건)
