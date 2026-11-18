PR #382 · 이동 1파일 · 로직 변경 0 O · 경계 warning 6→6 · it 3종 O · 마이그레이션 0 O

## 작업 요약

### 계획서 대사표 (pos-finish-shared.md §4.4 R-B2b)

| 항목 | 내용 |
|------|------|
| 이동한 파일 | `register_session/models/order-snapshot.ts` → `register_session/order_snapshot/model.ts` |
| 남긴 re-export | `models/order-snapshot.ts` → `export { default } from "../order_snapshot/model"` |
| 영향 import (파일:줄) | `service.ts:4` — `./models/order-snapshot` → `./order_snapshot/model` |
| ESLint 변경 | `eslint.config.ts` 주석 갱신 (R-B2b 반영) |
| 신규 테스트 | `integration-tests/pos/customer-display-me.spec.ts` · `integration-tests/pos/pin-audit.spec.ts` |

### 경계 warning 수 변화

R-B2a 후: **6건** → R-B2b 후: **6건 유지**

6건 모두 `payment_xendit → pos_settings` (R-B1 잔여). register_session 관련 위반 없음 (R-B2a에서 이미 `register_session/core`만 차단·나머지는 허용으로 처리됨).

### 로직 변경 없음 확인

- 동작 코드(로직) 수정 없음 — 파일 이동·경로·re-export만
- DB 테이블명 `order_snapshot` 유지
- `model.define("order_snapshot", {...})` 정의 불변 (필드·타입 동일)

## 검증 결과

### commerce-core typecheck

에러 0 (register_session 관련 TS 에러 없음)

### test 전체

```
Test Suites: 47 passed, 47 total
Tests:       539 passed, 539 total
```

### it.sh checkout-handover-smoke ✅

```
✓ cash: pos-complete → fulfill → Fulfilled · 재고 1 감소
✓ qris (invoice_number 6자리): 같은 흐름으로 Fulfilled · 재고 1 감소
통과: 1 / 1
```

### it.sh customer-display-me ✅ (신규)

```
✓ X-Device-Token 헤더 없음 → 401 missing_device_token
✓ 유효 device_token + 활성 스냅샷 → 200 + snapshot DTO
✓ 미등록 device_token → 401 device_token_revoked
통과: 1 / 1
```

### it.sh pin-audit ✅ (신규)

```
✓ Authorization 없음 → 401
✓ admin 인증 → PIN 형식 검증
✓ 올바른 PIN → { ok: true }
✓ 잘못된 PIN → 401 + remaining_attempts
통과: 1 / 1
```

## 마이그레이션 0 근거

`model.define("order_snapshot", {...})` 정의 불변 — 테이블명·필드·타입 모두 동일, 파일 이동만.
`.snapshot-register-session.json` 추적 테이블(register_session·cash_movement)에도 order_snapshot 없음.
새 migration 파일 생성 없음 (git diff 확인).
