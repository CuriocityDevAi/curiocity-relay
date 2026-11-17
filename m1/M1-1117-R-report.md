PR #188 · 포인트 사용 차단 표시

## 변경 내용
- `lib/loyalty-link.ts` — `LinkCustomerOkResponse`에 `negative_balance?` · `redeem_blocked?` 추가 (S7 #339)
- `api/hooks/customers.ts` — `PosCustomerSearchResult`에 동일 2 필드 추가 (손님 포인트 조회 훅)
- NEW `lib/credit-redeem.ts` — `shouldBlockRedeem` · `formatRedeemBlockedMessage` 순수 함수
- NEW `components/payment/CreditRedeemPanel.tsx` — 포인트 사용 차단 UI 컴포넌트
- `components/payment/CustomerLinkSheet.tsx` — linked 상태 `CreditRedeemPanel` 통합
- NEW `__tests__/m1-1117-r-credit-block.test.ts` — 7개 테스트 통과 (차단·비차단·필드 없음)

## 검증
- vitest: 7 passed
- tsc 신규 오류: 0
- 실기: 빚 있는 손님 생성은 환불 실기 후 — 현재 서버 시나리오 테스트로 대체
