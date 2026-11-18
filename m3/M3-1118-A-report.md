PR #363 · 경계 경고 19건(계획 15) · lint exit 0 · build exit 0

## 결과

| 항목 | 결과 |
|---|---|
| PR | https://github.com/CuriocityDevAi/storeport/pull/363 |
| 경계 경고 | **19건** (계획 15건) |
| lint | exit 0 (경고만) |
| build | exit 0 |
| unit | 46 suites · 532 tests · all passed |

## 경고 목록 (파일:줄)

| # | 파일 | 줄 | 위반 import |
|---|---|---|---|
| 1 | src/lib/link-customer-order.ts | 18 | ../modules/register_session |
| 2 | src/lib/link-customer-order.ts | 19 | ../modules/register_session/service |
| 3 | src/lib/loyalty/__tests__/earn-offset.unit.spec.ts | 7 | ../../../modules/pos_settings |
| 4 | src/lib/loyalty/__tests__/snapshot-earn.unit.spec.ts | 12 | ../../../modules/pos_settings |
| 5 | src/lib/loyalty/earn.ts | 26 | ../../modules/pos_settings |
| 6 | src/lib/loyalty/snapshot-earn.ts | 22 | ../../modules/pos_settings |
| 7 | src/modules/payment_xendit/__tests__/qris-simulate-bk.unit.spec.ts | 17 | ../../../api/admin/pos/orders/[id]/qris-simulate/route |
| 8 | src/modules/payment_xendit/__tests__/qris-xendit-bd.unit.spec.ts | 22 | ../../../api/admin/pos/_shared/xendit-refund |
| 9 | src/modules/payment_xendit/__tests__/qris-xendit.unit.spec.ts | 15 | ../../pos_settings/lib/xendit-creds |
| 10 | src/modules/payment_xendit/lib/config.ts | 3 | ../../pos_settings/lib/xendit-creds |
| 11 | src/modules/payment_xendit/services/xendit-qris-provider.ts | 36 | ../../pos_settings/lib/xendit-creds |
| 12 | src/modules/payment_xendit/services/xendit-qris-provider.ts | 37 | ../../pos_settings |
| 13 | src/modules/payment_xendit/services/xendit-qris-provider.ts | 38 | ../../pos_settings/service |
| 14 | src/subscribers/__tests__/order-snapshot-paid.unit.spec.ts | 6 | ../../modules/register_session |
| 15 | src/subscribers/loyalty-earn-on-paid.ts | 5 | ../modules/register_session |
| 16 | src/subscribers/loyalty-earn-on-paid.ts | 6 | ../modules/register_session/service |
| 17 | src/subscribers/order-snapshot-paid.ts | 4 | ../modules/register_session |
| 18 | src/subscribers/order-snapshot-paid.ts | 5 | ../modules/register_session/service |
| 19 | src/subscribers/register-session-order-attribution.ts | 3 | ../modules/register_session |

## 계획 15건 vs 실제 19건 차이

| 출처 → 목적 | 계획 | 실제 | 비고 |
|---|---|---|---|
| payment_xendit → pos_settings | 3 | 5 | config.ts·qris-xendit.spec.ts §4.2 작성 후 추가 |
| payment_xendit → api/admin/pos | 2 | 2 | 일치 |
| subscribers → register_session | 6 | 6 | 일치 |
| lib → pos_settings/register_session | (§4.2 표 미기재) | 6 | lib/는 공용 영역 → 신규 감지 |
| workflows/pos-fulfill → api/admin/pos/_shared | 1 | **0** | POS→POS · SHARED_FILES 외부 · 미감지 |
| workflows/pos-void → api/admin/pos/_shared | 1 | **0** | POS→POS · SHARED_FILES 외부 · 미감지 |
| **합계** | **15** | **19** | — |

workflows/pos-* violations은 POS 전용 영역 → POS 공유 유틸 형태로 "공용→POS" 경계 룰 범위 외. R-B3에서 lib/ 이동 후 자동 해소.

## 기술 메모

- `@medusajs/eslint-plugin` 미설치 → `typescript-eslint` base 파서로 대체 (TS 파싱만, rules 없음)
- ESLint `ignore` 패키지가 `../` 상대경로를 거부 → `no-restricted-imports` `regex` 옵션 사용
- `files` 패턴에 `*.{ts,tsx}` 확장자 명시 필요 (미명시 시 TypeScript 파일 무시)
