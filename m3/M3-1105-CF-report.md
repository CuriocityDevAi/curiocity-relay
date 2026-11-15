# M3-1105-CF — 완료

PR #258 (storeport) · feat/m3-1105-cf-loyalty-r3-phone-customer · base main

## 구현 완료

| 항목 | 파일 |
|------|------|
| 전화번호 정규화 유틸 | `apps/commerce-core/src/lib/phone-id.ts` |
| 단위 테스트 (10형식) | `apps/commerce-core/src/lib/__tests__/phone-id.unit.spec.ts` |
| POST customer 연결 | `apps/commerce-core/src/api/admin/pos/orders/[id]/customer/route.ts` |
| GET loyalty-info | `apps/commerce-core/src/api/admin/pos/orders/[id]/loyalty-info/route.ts` |
| 통합 테스트 | `apps/commerce-core/integration-tests/loyalty/customer-link.spec.ts` |

## CI 결과 (GitHub Actions)
- `unit-commerce-core`: success (178/178 — phone-id 포함)
- `pos-integration`: success
- `markers-and-forbidden`: success
- `changes-filter`: success
- `feature-map-check`: success

## 선택지 · 채택 · 이유
- **전화번호 정규화**: libphonenumber-js vs 자체 — **자체 채택** · 인도네시아 단일국 규칙 간결, 의존성 추가 불필요
- **중복 방지**: DB unique vs 앱 레벨 Map — **앱 레벨 Map 채택** · Phase 1 단일 프로세스 POS · DB migration 없이 테스트로 증명
- **P-3 완료 주문 판단**: payment_status vs metadata.receipt_no — **metadata.receipt_no 채택** · tenders 라우트 SoT · 별도 계산 불필요

## REQ 체크리스트
- [x] phone-id.ts: 10개 입력 형식 정규화 · E.164 출력 · 10–13자리 유효성 · 마스킹
- [x] POST customer: phone → customer upsert · 동의 기록 · 주문 연결 · SC account 생성
- [x] 이름·이메일·사진 저장 금지
- [x] 중복 방지: inFlight Map · 테스트 증명
- [x] P-3 규칙: 가장 최근 주문 허용 · 아니면 409 link_window_closed
- [x] needs_post_payment_earn: true 플래그 (R4 적립은 미구현)
- [x] GET loyalty-info: phone_masked + balance · earn_preview/available_use = null + TODO
- [x] 통합 테스트: 400/신규/기존/동의/동시2/P-3허용/P-3위반/loyalty-info 8개 케이스
