# M1-1116-B Report

PR #288 · 메뉴 채택안 = CSS 숨김 → 커스텀 라우트 "Orders" · 칸 = Order# · 날짜/시각 · Customer(가림) · Method · Payment · Fulfillment · Order Total · Loyalty · CI = 단위 160/160 · 통합 테스트 4건 신설.

## 착지 파일

| 파일 | 역할 |
|---|---|
| `apps/commerce-core/src/api/admin/pos/orders-list/route.ts` | GET /admin/pos/orders-list — 전화번호 가림(0813-****-2480)·loyalty_earn·loyalty_used 반환 |
| `apps/commerce-core/src/admin/routes/pos-orders/page.tsx` | Admin POS Orders 목록 화면 (8칸·검색·페이지네이션·링크) |
| `apps/commerce-core/src/admin/widgets/nav-hide.tsx` | topbar 위젯 — CSS로 기본 Orders·Store Credits 사이드바 숨김 |
| `apps/commerce-core/integration-tests/pos/orders-list.spec.ts` | 통합 테스트 4건 (가림 형식·loyalty_earn·전화/주문번호 필터·null) |
| `docs/feature-map.yaml` | pos-orders-admin L2 + L1 2건 등록 |

## 메뉴 채택안

**A안 (CSS 숨김)**: `nav-hide.tsx` 위젯이 `topbar` zone에서 `a[href="/orders"]`·`a[href="/store-credits"]`를 `display:none` 주입 → 커스텀 `/pos-orders` 라우트를 label **"Orders"** 로 노출.
Store Credits 데이터·API 는 유지됨.

## Kyu 실기 체크리스트

- [ ] Admin 사이드바 "Orders" 클릭 → `/pos-orders` 화면 (기본 Medusa Orders 아님)
- [ ] Order #·날짜·전화번호 가림(`0813-****-2480`)·결제수단·Payment·Fulfillment·Order Total·Loyalty 표시
- [ ] 전화번호 클릭 → `/customers/:id`
- [ ] 행 클릭 → `/orders/:id`
- [ ] 검색 뒷 4자리(예: `2480`) → 해당 고객 주문 필터
- [ ] 검색 주문번호(예: `123`) → 해당 주문 필터
- [ ] Store Credits 사이드바 항목 미표시
- [ ] 적립 없는 주문 → Loyalty 칸 "—"

## CI

- 단위: 160/160 통과 (push 훅)
- 통합: `orders-list.spec.ts` 4건 신설
- Admin UI Playwright: 로컬 `medusa dev` 없어 **미검증**

## 이연 순증감

이연 추가:
- `loyalty_used` 감지 — M0-1116-B 서버 계약(loyalty tender provider) 착지 후 활성화
- 전화번호 검색 — 비숫자 q는 in-memory 필터, 주문 수 증가 시 DB 인덱스 쿼리 전환 필요

이연 없음 (기존 이연 미건드림).
