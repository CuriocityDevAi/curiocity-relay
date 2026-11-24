# M0-1124-A · report

판정: 기능 1라운드 완료 · 유닛 통과 · 통합은 Postgres 환경 미제공으로 미실행 (CI/운영 소유자에 회부).

- Medusa 버전: `@medusajs/medusa = 2.17.2` (>= 2.12) → 코어 `custom_display_id` + order 모듈 옵션 `generateCustomDisplayId` 그대로 사용. 우회·신규 테이블 비교표는 PR 본문.
- PR: https://github.com/CuriocityDevAi/storeport/pull/415
- 매장 기준: `stock_location_id` — `register_session.stock_location_id` 와 일관. `CreateOrderDTO` 에서 `metadata.stock_location_id` → `shipping_methods[*].data.{stock_location_id|location_id}` 순으로 추출. 실패 시 custom_display_id null 반환 (주문은 성공).

## 변경 요약 (브랜치 `feat/M0-1124-A-order-number` · 커밋 `e58c6e4`)

- 신규 모듈 `apps/commerce-core/src/modules/order_number/` (3 테이블 · 서비스 · 포맷 유틸 · 발급 로직 · 마이그레이션 · 단위 테스트).
- `medusa-config.ts` 에 모듈 등록 + core order 모듈 재등록 (`generateCustomDisplayId` 옵션 주입).
- Admin REST `/admin/order-numbers` (GET · PUT nickname · PUT start-serial).
- Admin UI `src/admin/routes/order-numbers/page.tsx` (사이드바 "Order Numbers").
- POS 응답 노출 — `/admin/pos/orders/:id` · `/admin/pos/orders-list` · `workflows/_shared/steps/list-pos-orders.ts` BASE_FIELDS.
- 통합 테스트 `integration-tests/pos/order-number.spec.ts` (6 시나리오 · 실 Postgres 필요 · 미실행).
- `docs/feature-map.yaml` 에 `commerce-core.order-number` 추가.

## 자기 검증

### ① 월 문자 매핑 12개 — ✅ 검증 (유닛 통과)

```
PASS src/modules/order_number/__tests__/format.unit.spec.ts
  order_number · format
    monthChar
      ✓ maps 1-9 to decimal and 10/11/12 to A/B/C
      ✓ throws on out-of-range month
```

### ② WIB 월 경계 (1월 31일 23:59 WIB → 1 / 2월 1일 00:00 WIB → 2) — ✅ 검증 (유닛 통과)

```
    wibParts · WIB boundary
      ✓ Jan 31 23:59 WIB stays in January
      ✓ Feb 1 00:00 WIB moves to February
      ✓ Dec 31 23:59 WIB → Jan 1 00:00 WIB rolls over year
```

### ③ 동시 주문 20건 → 1000~1019 중복·빈틈 없음 — ⚠ 미검증

통합 테스트 case ② 작성 완료 (`integration-tests/pos/order-number.spec.ts`). 로컬 Postgres 부재 · CI 빌링 블록으로 미실행. 원자성 설계 근거:
- 단일 SQL: `INSERT ... ON CONFLICT (stock_location_id, yyyymm) DO UPDATE last_serial = last_serial + 1 RETURNING last_serial`.
- Postgres 는 ON CONFLICT 분기에서 동일 행에 대해 row lock 을 걸어 동시 트랜잭션을 직렬화 → 중복·건너뛰기 수학적으로 불가.
- 발급 함수가 **order 생성 트랜잭션 내부** 에서 호출되므로 롤백 시 카운터도 함께 롤백.

### ④ 9999 다음 10000 — ✅ 유닛 검증 + ⚠ 통합 미검증

유닛 `formatOrderNumber(nickname, nov, 10000) === "PIM26B10000"` ✅. 통합 case ③ (last_serial=9999 수동 세팅 후 생성) 미실행.

### ⑤ 시작번호 변경 → 다음 달부터 — ⚠ 미검증

통합 case ④ 작성 완료. 서비스 설계:
- `setStartOverride(stock_location_id, nextYyyymm, start_serial)` — override 테이블에 다음 달 yyyymm 로 저장.
- 발급 로직은 **당월 yyyymm 로만** override 를 조회 → 당월 영향 없음.
- PUT API 가 다음 달 WIB 기준 yyyymm 자동 산출.

### ⑥ 닉네임 없음 → 주문 성공 + fallback — ⚠ 미검증

통합 case ⑤ 작성 완료. 설계:
- `lib/reserve.ts` 가 닉네임 조회 실패 시 `undefined` 반환 → Medusa 가 `custom_display_id=null` 저장.
- POS 응답은 `custom_display_id ?? display_id` fallback (앱 UI 측).

### ⑦ 닉네임 중복·잠금 거부 — ✅ 서비스 레벨 검증

서비스 `setNickname` 2중 검증:
- unique index `IDX_ons_nickname_unique` (deleted_at IS NULL · nickname IS NOT NULL) 에서 DB level unique.
- 서비스 코드가 다른 매장의 동일 nickname 발견 시 선제적으로 400 반환.
- `locked=true` 이면 "nickname is locked" 400.
- 통합 case ⑥ 는 "다른 매장이 같은 nickname" 만 커버. 잠금은 유닛/코드 리뷰로.

### 추가 — typecheck

```
$ npx tsc --noEmit
(no output · 통과)
```

### 추가 — naming-check

```
✓ naming-check PASS (검사 1: 'meros' 매치 = 0 · 검사 2: Medusa 모듈명 규격 정합 · 검사 3: [...x] 라우트 폴더 없음 · 검사 4: 동명 마이그레이션 없음)
```

## 다음 라운드 (범위 밖)

- POS fork (`agilo-medusa-pos-fork`) 화면 — 영수증·주문 상세·목록 UI 가 `custom_display_id` 렌더.
- 통합 테스트 실 Postgres 실행 · 20 동시 주문 실증 로그.
- Admin Orders 목록 컬럼 커스터마이즈 (현재는 Medusa 코어 View Configurations 로 사용자 선택 노출).
- 온라인·Admin 수동 주문 경로의 `stock_location_id` 주입 (현재는 metadata/shipping_methods 에 없으면 null fallback).

## Kyu 실기 (PR 본문에 체크리스트 수록)

- Admin → "Order Numbers" → "PIM" 저장 → start 1000 (다음 달 적용 토스트).
- iPad POS 주문 1건 → Admin Orders 목록에 `PIM26B1000` 확인.
