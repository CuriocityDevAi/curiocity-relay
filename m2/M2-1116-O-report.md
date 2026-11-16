# M2-1116-O 착지 보고

PR #306 · 메뉴 출처: `@medusajs/loyalty-plugin` (`/store-credit-accounts`) · 숨김 방식: `nav-hide.tsx` CSS 주입 (`display:none`) · 적립금 확인: 손님 상세(customer-loyalty-detail 위젯) · 주문 상세 Loyalty 카드(order-loyalty 위젯)

## 작업 내용

- 파일: `apps/commerce-core/src/admin/widgets/nav-hide.tsx`
- 추가 CSS 선택자: `a[href="/store-credit-accounts"]`, `a[href="/store-credit-accounts/"]`
- 기존 `/store-credits` 숨김(M1-1116-B)에 `/store-credit-accounts`(loyalty-plugin 실제 경로) 추가

## 검증

- 단위 테스트 332개 통과 (apps/commerce-core 23 suites · customer-display · event-contracts)
- Playwright Admin 사이드바 스샷: **미실행 (로컬 Admin 서버 미기동)** — Kyu 실기로 확인 필요
  - Admin 새로고침 → 왼쪽 메뉴에 Store Credits 없음
  - `/app/store-credit-accounts` 직접 URL → 페이지 열림 (비상 통로 유지)

## 메뉴 출처 상세

`@medusajs/loyalty-plugin@2.17.2`가 Admin SDK를 통해 `/store-credit-accounts` 경로로 사이드바 항목 자동 등록.
기존 `nav-hide.tsx`(M1-1116-B)는 `/store-credits`만 숨겼고 `/store-credit-accounts`는 누락됐던 상태.
