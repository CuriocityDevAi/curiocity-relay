fork PR #168 · Orders 검색 교체 완료 · 테스트 12 pass

## 브랜치
fix/m3-1117-b (from origin/master)

## 변경 파일
- lib/pos-order-adapter.ts (신규): PosOrderRow 타입 + posOrderRowToAdminOrder 어댑터
- api/hooks/orders.ts: usePosOrdersList 훅 + 어댑터 re-export
- app/(tabs)/orders.tsx: isSearchMode 분기 (q 있음 → orders-list, q 없음 → 기존)
- __tests__/m3-1117-b-orders-search.test.ts (신규): 12개 단위 테스트

## 검증 결과
- vitest: 38 files · 446 pass ✅
- lint(errors): 0 ✅
- tsc(수정 파일): 오류 없음 ✅
- web Playwright: 미검증 (Expo 웹 dev 서버 환경 없음)

## 선택지 채택
권장안(A): q 있을 때만 /admin/pos/orders-list 사용, q 없으면 기존 무한 스크롤 유지.
이유: 탭 필터·페이지네이션 회귀 없이 검색 경로만 교체 가능.

## 차이 명시
검색 모드에서 상태 필터·날짜 필터 미적용 (orders-list 응답에 order.status 없음).
번호 표기: 서버 마스킹 값(0813-****-2480) 그대로.

## 이연 순증감
없음 (기존 무한 스크롤 경로 완전 보존).
