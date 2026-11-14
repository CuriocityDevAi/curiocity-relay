APPROVE — i18n 공식 deepMerge 방식 ✓ · 키 실재 ✓ · 표기만 변경 ✓ · 타 화면 의미 충돌 없음 ✓ · CI 전 항목 통과 ✓

## REQ 1 — i18n 방식 · 키 실재 · 데이터 불변

**공식 방식 확인** (`@medusajs/dashboard@2.17.2` 실측):

```ts
// dashboard-app.tsx:428-432
private populateI18n(plugins: DashboardPlugin[]): I18nExtension {
  let resources: I18nExtension = { ...coreTranslations }
  for (const plugin of plugins) {
    resources = deepMerge(resources, plugin.i18nModule?.resources)
  }
  return resources
}
```

`admin-vite-plugin`이 `src/admin/i18n/index.ts`를 자동 수집 → 가상 모듈 생성 → `DashboardApp.populateI18n()`이 `coreTranslations` 위에 deepMerge. Medusa 공식 i18n 확장 경로.

**업그레이드 안전**: deepMerge는 key-level override라 키가 존재하면 적용, 미래 버전에서 키가 사라지면 no-op. 빌드 오류 없음. `2.17.x→2.18` 등 마이너 업그레이드에 안전.

**키 실재**: `@medusajs/dashboard@2.17.2` `en.json` 실측:
```
orders.payment.status.captured = "Captured"   ✓ 존재
```

**표기만 변경**: `getOrderPaymentStatus(t, payment_status)` 함수가 DB 값 `"captured"`(문자열)를 받아 `t("orders.payment.status.captured")`로 번역. API/DB에 저장되는 `payment_status` 값은 `"captured"` 그대로 불변.

---

## REQ 2 — 다른 화면 의미 충돌 없음

`getOrderPaymentStatus`를 사용하는 모든 화면:
| 화면 | 파일 | 영향 |
|------|------|------|
| 주문 목록 | `use-order-data-table-columns.tsx` | `captured` → "Paid" (일관) |
| 주문 상세 헤더 | `order-general-section.tsx` | `captured` → "Paid" (일관) |
| 결제 섹션 | `order-payment-section.tsx` | `captured` → "Paid" (일관) |
| 고객 상세 주문 목록 | `customer-order-section.tsx` | `captured` → "Paid" (일관) |

**부분 환불 후 상태**: `partially_refunded` → `t("orders.payment.status.partiallyRefunded")` = "Partially refunded" (미오버라이드). 의미 충돌 없음.

**타임라인 이벤트**: `orders.activity.events.payment.captured` = "Payment captured" — 완전히 별개 키. 이번 오버라이드 미포함. 이벤트 로그("Payment captured")와 현재 상태 배지("Paid")는 의미상 분리되어 충돌 없음.

**필터**: `use-order-table-filters.tsx`의 payment_status 필터가 주석 처리됨(lines 60, 74-75). 필터 쿼리 파라미터(`value: "captured"`) 불변 문제 없음.

---

## REQ 3 — 리브랜딩 변경 · 남은 Medusa 흔적

**이번 PR (M2-1105-BJ) 변경**:
| 키 | 원문 | 변경 |
|----|------|------|
| `orders.payment.status.captured` | "Captured" | "Paid" |
| `invite.successHint` | "Get started with Medusa Admin right away." | "Get started with Meros Admin right away." |
| `invite.successAction` | "Start Medusa Admin" | "Start Meros Admin" |
| `auth.login.cloud` | "Log in with Medusa Cloud" | "Log in with Cloud" |

**기 완료 (이전 커밋)**:
- 파비콘, 탭 제목 "Meros Admin", 로그인 로고
- `login.title`, `invite.title` → "Welcome to Meros Admin Page"

**남은 Medusa 흔적 (이번 미적용, PR 본문에 목록화)**:
1. `profile.edit.usageInsightsHint` href: `medusajs.com/docs` URL이 React 컴포넌트에 하드코딩 — i18n으로 텍스트 변경 가능하나 URL 자체는 fork patch 필요
2. `orders.refund.systemPaymentDesc`: 환불 화면 기능 설명 문구 (운영상 중요도 낮음)

---

## REQ 4 — 단위 테스트 · CI

**i18n-overrides.unit.spec.ts 실행 로그** (CI `unit-commerce-core` job):
```
PASS src/admin/i18n/__tests__/i18n-overrides.unit.spec.ts
Tests:       160 passed, 160 total
```

**CI job별 결과**:
| Job | 결과 |
|-----|------|
| `markers-and-forbidden` | SUCCESS ✓ |
| `feature-map-check` | SUCCESS ✓ |
| `changes-filter` | SUCCESS ✓ |
| `unit-commerce-core` | SUCCESS ✓ (160/160) |
| `pos-integration` | SUCCESS ✓ |
| `docker-smoke-commerce-core` | SKIPPED (정상) |
| `docker-smoke-anchor` | SKIPPED (정상) |
| `docker-smoke-wing` | SKIPPED (정상) |
| `wrangler-check-care-agent` | SKIPPED (정상) |

---

## 판정: APPROVE

- REQ 1: 공식 deepMerge 방식 실측 확인 · 키 `orders.payment.status.captured` 실재 · 데이터값 불변 ✓  
- REQ 2: 타 화면 모두 동일 함수 경유로 일관 · 부분 환불 후 상태 충돌 없음 · 타임라인 키 별개 ✓  
- REQ 3: 이번 변경 목록 · 남은 흔적 2건 PR 본문에 명시 ✓  
- REQ 4: i18n spec PASS · CI 9/9 통과 (SKIPPED 5건 정상) ✓
