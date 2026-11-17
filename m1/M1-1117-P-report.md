PR #187 · cart 신호 디바운스 300ms · 비움 DELETE

## 착지
- Branch: feat/M1-1117-P-cd-live-cart → master (PR #187)
- M2-1117-Q(storeport) 머지 후 실기

## 변경 파일
- lib/cart-sync-logic.ts (신규): filterConfirmedItems · resolveCartAction 순수 함수
- hooks/useCustomerDisplayCartSync.ts (신규): 300ms 디바운스 · POST stage:"cart" · DELETE
- api/hooks/pos-loyalty.ts: startSnapshot optional stage 인자 추가
- app/(tabs)/_layout.tsx: useCustomerDisplayCartSync() 1줄
- __tests__/m1-1117-p.test.ts: 15 cases 전부 통과

## REQ 체크
1. ✅ 300ms 디바운스 후 stage:"cart" POST
2. ✅ 장바구니 비움 → DELETE · 세션 없으면 no-op · 에러 조용히
3. ✅ Checkout startSnapshot 호출 그대로 (stage 없음)
4. ✅ 서버 400 → catch(() => {}) · POS 영향 0
5. ✅ 테스트 15 cases · tsc 신규 0
