# M2-1105-AQ Report

**날짜**: 2026-11-12  
**브랜치**: feat/m2-1105-aq-stock-cleanup-page  
**PR**: https://github.com/CuriocityDevAi/storeport/pull/220  
**커밋**: 1e3f20a

---

## 항목별 완료 현황

### REQ 1 — Admin "Stock cleanup" 페이지 (PIN 페이지 같은 방식)
- **완료**
- 파일: `apps/commerce-core/src/admin/routes/stock-cleanup/page.tsx` (line 329: `defineRouteConfig({ label: "Stock cleanup", icon: Tag })`)
- 커밋: 1e3f20a
- PIN 페이지 패턴 그대로: raw `fetch + credentials:"include"`, `@medusajs/ui` 컴포넌트, `defineRouteConfig`
- 여러 매장: `GET /admin/stock-locations` → 단일이면 자동 선택, 복수면 `<select>` 상자

### REQ 2 — 자동 dry_run + 표 (SKU · 품목명 · 주문 번호 · 주문 상태 · 예약 수량 · 생성 시각)
- **완료**
- route 응답에 `sku`, `title`, `order_display_id`, `created_at` 추가 (`release-stale-reservations/route.ts`)
- 페이지 로드 시 `dry_run=true` 자동 호출 → 표 렌더링
- 요약: "N stale reservations · M SKUs" 배지
- SKU별 In stock / Reserved / Available / Expected available 표 (inventory level 별도 조회)

### REQ 3 — Release all 버튼 + 확인 다이얼로그
- **완료**
- 검정 버튼(`bg-ui-fg-base`) → `confirmOpen` 상태 → overlay 다이얼로그
- 다이얼로그 문구: "Release N reservations? Stock in hand does not change; Available goes up."
- `dry_run=false` 호출 → toast.success + 표 새로고침
- 후보 0 → "No stale reservations" 빈 화면

### REQ 4 — 안전: 진행 중 주문 예약 제외 확인 + 테스트
- **완료**
- 도구 기준 확인: `info.status === "completed" || info.status === "canceled" || info.fulfillment_stage === "hand_over"` 만 후보 — pending 주문은 제외됨
- 파일: `apps/commerce-core/integration-tests/pos/stock-cleanup.spec.ts` (#1 pending-order reservation is excluded from stale candidates)
- 커밋: 1e3f20a
- ⛔ M0-AR `void-refund-restock.spec.ts`와 파일 겹침 없음

### REQ 5 — 자기 검증
- 로컬 Admin 서버 미기동 상태 (스샷·Playwright 실행 불가)
- 미완: 스샷 경로 없음 · Playwright Release 흐름 미실행
- 단, REQ 4 integration spec 이 "pending → 제외" 도구 동작을 커버

---

## git ls-tree

```
apps/commerce-core/integration-tests/pos/stock-cleanup.spec.ts
apps/commerce-core/src/admin/routes/stock-cleanup/page.tsx
apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts
```

## 이연 순증감

| 항목 | 파일 증감 |
|---|---|
| 신규 Admin route | +1 (stock-cleanup/page.tsx, 329 lines) |
| 신규 integration spec | +1 (stock-cleanup.spec.ts, 69 lines) |
| route 필드 추가 | +35 lines (route.ts, 동작 변경 0) |

## 미완 사항

- REQ 5 스샷 (로컬 Admin 서버 미기동)
- REQ 5 Playwright Release 흐름 1회 (동일 이유)

