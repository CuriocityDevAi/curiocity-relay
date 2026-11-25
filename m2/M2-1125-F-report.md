PASS

# M2-1125-F — Manager PIN 감사 로그 Admin 화면 Round CD-E

**Branch**: `feat/M2-1125-F-manager-pin-audit`
**PR**: https://github.com/CuriocityDevAi/storeport/pull/428
**Commit**: f0c8abc

---

## 구현 요약

### REQ 1 — 기록 항목 확정 (decision-cd-ask-phone-20261118.md 준거)
- 시각 (`occurred_at`) · 매장 (`store_id`) · 캐셔 (`cashier_user_id`) · 기능 (`feature`) · 주문번호 (`custom_display_id` 우선 → `display_id` fallback) · 성공/실패 (`outcome`)
- PIN 값 자체 저장 없음 — 테스트 어설션으로 보장

### REQ 2 — PIN 검증 경로 전수 기록
기존 `recordPinAudit` 호출이 이미 있던 경로:
- `POST /admin/pos/orders/:id/void` (CASH tender)
- `POST /admin/pos/orders/:id/refund` (CASH tender)
- `POST /admin/pos/orders/:id/return` (CASH tender)
- `POST /admin/pos/orders/:id/refund-retry` (CASH/fallback)
- `POST /admin/pos/manager-pin/verify`
- `lib/link-customer-order.ts` (late_loyalty_link)

이번 PR 추가: `custom_display_id` 필드를 각 경로의 `recordPinAudit` 호출에 추가.

### REQ 3 — Admin 화면 기능
- **날짜 범위** (`date_from` / `date_to` input)
- **기능 필터** (feature select: All / Void / Refund / Return / Refund Retry / Late Customer Link / Verify PIN)
- **매장 필터** (store select: `/admin/stock-locations` lazy-load)
- **주문번호 클릭 → 주문 상세** (`/orders/:id` href 링크 · custom_display_id 우선)
- **영어 UI** (기존 Admin 언어 유지)

### REQ 4 — 테스트

#### 단위 테스트 (17건 PASS)
파일: `src/modules/pin_audit/__tests__/pin-audit.unit.spec.ts`

```
recordPinAudit — createLog 호출 패턴
  ✓ success: outcome=success 로 호출된다
  ✓ pin_mismatch: outcome=pin_mismatch 로 호출된다
  ✓ locked: outcome=locked 로 호출된다
recordPinAudit — PIN 값 미저장 보장
  ✓ createLog 에 전달된 객체에 pin 필드가 없다
listByFilter 필터 로직
  ✓ date_from + date_to 범위 — 2026-11-20 ~ 2026-11-21 → r1·r2·r3
  ✓ feature=void 필터 → r1·r3
  ✓ store_id=sl_pim 필터 → r1·r2·r4
  ✓ feature=void + store_id=sl_pim → r1만
  ✓ date_from 단독
  ✓ date_to 단독
  ✓ custom_display_id null 행 포함 → display_id fallback
recordPinAudit — 기록 실패 시 non-fatal
  ✓ createLog reject → recordPinAudit resolve
  ✓ container.resolve throw → recordPinAudit resolve
wibDateKey
  ✓ UTC 11:00 → 같은 날 WIB
  ✓ UTC 17:30 → 다음날 WIB
verifyManagerPin + recordPinAudit 통합
  ✓ 정답 → outcome=success
  ✓ 오답 → outcome=pin_mismatch
Tests: 17 passed
```

#### Playwright Admin Smoke Screen 5 (3건 PASS)
```
✓ Manager PIN 표시 · 필터 UI 존재 · 로그 테이블 렌더링 (518ms)
✓ feature filter — Void 선택 시 API 재요청 (755ms)
✓ 빈 로그 — empty 메시지 표시 (401ms)
```

스크린샷: `e2e/screenshots/admin-smoke/05-manager-pin-audit.png`

---

## 변경 파일 목록

| 파일 | 내용 |
|------|------|
| `src/modules/pin_audit/models/pin-audit-log.ts` | `custom_display_id` 필드 추가 |
| `src/modules/pin_audit/migrations/Migration20261125000000.ts` | 신규 마이그레이션 |
| `src/modules/pin_audit/service.ts` | `custom_display_id` + `listByFilter` (date range + feature + store) |
| `src/modules/pin_audit/__tests__/pin-audit.unit.spec.ts` | 단위 테스트 17건 (신규) |
| `src/lib/manager-pin.ts` | `recordPinAudit` 입력에 `custom_display_id` 추가 |
| `src/api/admin/pos/manager-pin/audit/route.ts` | `date_from`/`date_to`/`feature` 쿼리 파라미터 지원 |
| `src/api/admin/pos/orders/[id]/void/route.ts` | `custom_display_id` 감사 기록 추가 |
| `src/api/admin/pos/orders/[id]/refund/route.ts` | `custom_display_id` 감사 기록 추가 |
| `src/api/admin/pos/orders/[id]/return/route.ts` | `custom_display_id` 감사 기록 추가 |
| `src/admin/routes/manager-pin/page.tsx` | 필터 UI (date range, feature select, store select) 추가 |
| `e2e/admin/admin-smoke.spec.ts` | Screen 5 — Manager PIN Audit smoke 3건 추가 |
| `e2e/admin/harness-smoke/main.tsx` | `?page=manager-pin` 경로 추가 |
| `docs/feature-map.yaml` | 신규 파일 등록 |

---

## Kyu 실기 항목 (PR 머지 전 확인 필요)

- [ ] Admin → Manager PIN 화면 로드 확인
- [ ] 날짜 범위 변경 → 해당 범위 로그 갱신
- [ ] feature=Void 선택 → Void 기록만 필터
- [ ] 매장 필터 선택 → 해당 매장만 필터
- [ ] 주문번호(custom_display_id) 클릭 → 주문 상세 화면 이동
- [ ] DB migration 적용 후 `custom_display_id` 컬럼 확인
