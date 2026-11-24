COMPLETE (자기검증 항목 중 live-server 의존 2건은 "검증 보류" — 하단 명시)
PR: https://github.com/CuriocityDevAi/storeport/pull/416
Branch: feat/M2-1124-B-cd-live-phone

## 구현 요약

### REQ1 — 실시간 번호 입력 (phone_entry_state + phone_partial)
- `order_snapshot` DB 컬럼 추가: `phone_entry_state` check enum(waiting|typing|done|skipped) + `phone_partial` text
- `Migration20261124000001.ts` 생성
- 서비스 메서드 갱신:
  - `updatePhonePartial(id, partial)` 신설 → `phone_entry_state=typing` + `phone_partial` 세팅
  - `markSnapshotTyping` → `phone_entry_state=typing` 추가
  - `setSnapshotPhoneEntry` → `phone_entry_state=done` 추가
  - `skipSnapshot` → `phone_entry_state=skipped` 추가
- API PATCH `{ phone_partial }` 경로 추가
- `KeypadScreen.onDigitsChange?: (fullDigits: string) => void` prop 추가 → `useEffect` 로 digits 변화 시 호출
- `index.tsx`: 150ms debounce ref → `sendPhonePartial` PATCH fire-and-forget
- `snapshot-api.ts`: `sendPhonePartial` 함수 추가

### REQ2 — 손님 화면 구석 칩 번호 (#N)
- `order_snapshot.pos_order_num` integer nullable 필드 추가 (M1-1124-B POS 측이 세팅)
- API PATCH `{ pos_order_num }` 경로 추가
- `PosChipBadge` 컴포넌트 신설 (`src/components/PosChipBadge.tsx`, 우상단 절대 위치, `pos_order_num` null 이면 null 반환)
- 연결: CartScreen · QrisScreen · ReceiptScreen · KeypadScreen(wide+portrait 양쪽)
- MainScreen 에는 연결 없음 (대기 화면 미표시)

### REQ3 — 번호 입력 화면 잠금
- `display-machine.ts`: `leavingLoyalty` 조건 제거 →
  keypad 는 OK/Skip 로컬 이벤트 전까지 POS hint에 무관하게 잠금
- 기존 테스트 "loyalty_entry → cart_building 전이 중이면 keypad 끊고 cart 로 이동" →
  "loyalty_entry → cart_building 전이 중에도 keypad 유지 (M2-1124-B 잠금)"으로 갱신
- 신규 테스트 2건: `keypad 중 POS=payment_cash → keypad 유지`, `KEYPAD_SKIP + active → cart`

## 스냅샷 필드 매핑표 (M1-1124-B POS 쪽 참조용)

| 필드 | 타입 | 세팅 주체 | 세팅 조건 |
|---|---|---|---|
| `phone_entry_state` | `'waiting'\|'typing'\|'done'\|'skipped'\|null` | 손님 화면 (M2) | PATCH `{phone_partial}` → `typing` / OK → `done` / Skip → `skipped` |
| `phone_partial` | `string\|null` | 손님 화면 (M2) | PATCH `{phone_partial:'0813...'}` (150ms debounce 평문) |
| `pos_order_num` | `number\|null` | POS (M1-1124-B) | PATCH `{pos_order_num: N}` |

## 자기 검증 결과

### ✅ 자동 검증 완료
- typecheck 0 error: customer-display + commerce-core
- unit tests: customer-display 202 pass / commerce-core 539 pass
- display-machine 테스트: `loyalty_entry → payment_cash` keypad 유지 케이스 pass
- naming-check: PASS

### ⚠️ live-server 의존 검증 (보류 → 수동 확인 필요)
1. **API 응답 시간**: 손님이 `0-8-1-3` 입력 → snapshot PATCH 가 0.5초 안에 `phone_entry_state=typing` / `phone_partial=0813` 반환 확인
   - 검증 명령: 개발 서버 기동 후 `pnpm --filter customer-display e2e` 또는 직접 `curl -X PATCH .../snapshots/{id} -H "X-Device-Token: ..." -d '{"phone_partial":"0813"}'`
2. **#N 칩 스크린샷**: `pos_order_num=5` 세팅 후 CartScreen/KeypadScreen 우상단 `#5` 표시 시각 확인
   - 검증 명령: mock 모드 `?mock=1` 에 `pos_order_num` 주입 또는 dev-server 실기

## 파일 변경 목록

| 파일 | 변경 |
|---|---|
| `apps/commerce-core/src/modules/register_session/order_snapshot/model.ts` | phone_entry_state · phone_partial · pos_order_num 필드 추가 |
| `apps/commerce-core/src/modules/register_session/migrations/Migration20261124000001.ts` | 신규 마이그레이션 |
| `apps/commerce-core/src/modules/register_session/lifecycle.ts` | serializeSnapshot 에 세 필드 포함 |
| `apps/commerce-core/src/modules/register_session/service.ts` | updatePhonePartial 신설 / markSnapshotTyping·setSnapshotPhoneEntry·skipSnapshot 갱신 |
| `apps/commerce-core/src/types/customer-display.ts` | OrderSnapshot DTO 에 세 필드 추가 |
| `apps/commerce-core/src/api/customer-display/snapshots/[id]/route.ts` | phone_partial · pos_order_num PATCH 처리 추가 |
| `apps/customer-display/src/types/order-snapshot.ts` | 클라이언트 타입 갱신 |
| `apps/customer-display/src/lib/snapshot-api.ts` | sendPhonePartial 추가 |
| `apps/customer-display/src/screens/KeypadScreen.tsx` | onDigitsChange prop · useEffect 추가, PosChipBadge 연결 |
| `apps/customer-display/src/components/PosChipBadge.tsx` | 신규 컴포넌트 |
| `apps/customer-display/src/screens/CartScreen.tsx` | PosChipBadge 연결 |
| `apps/customer-display/src/screens/QrisScreen.tsx` | PosChipBadge 연결 |
| `apps/customer-display/src/screens/ReceiptScreen.tsx` | PosChipBadge 연결 |
| `apps/customer-display/src/lib/display-machine.ts` | keypad lockout (leavingLoyalty 제거) |
| `apps/customer-display/src/lib/__tests__/display-machine.test.ts` | 테스트 갱신 + 신규 2건 |
| `apps/customer-display/app/index.tsx` | 150ms debounce handleDigitsChange + onDigitsChange prop 연결 |
| `docs/feature-map.yaml` | Migration20261119000001 · Migration20261124000001 · PosChipBadge 등록 |
