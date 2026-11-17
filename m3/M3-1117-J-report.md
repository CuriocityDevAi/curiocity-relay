PR #176 · CustomerLinkSheet 통합 컴포넌트 (1라운드) 완료 — 30 tests pass, TS 에러 없음.

## 작업 로그

- `lib/phone-id.ts` — `formatPhoneDisplay62`: 0813…/62813…/620813… → `(+62) 813-8044-2480`
- `api/hooks/customers.ts` — `PosCustomerSearchResult` (loyalty_consent_at, store_credit_balance) + `usePosCustomerSearch`
- `api/hooks/pos-orders.ts` — `useLinkOrderCustomer` / `useChangeOrderCustomer` / `useUnlinkOrderCustomer`
- `components/payment/CustomerLinkSheet.tsx` — 신규 통합 시트 컴포넌트 (mode='draft'|'order')
- `__tests__/m3-1117-j.test.ts` — 30 cases: 표시 정규화·디바운스·동의 조건·상태 전환 모두 통과

## 기술 선택 권장안

- `usePosCustomerSearch`: `useQuery` (non-infinite) — 전화번호 단건 조회에 infinite query 불필요
- 디바운스: 컴포넌트 내 `useEffect + setTimeout` — 훅을 범용으로 유지하고 UI 레이어에서 제어
- [Change] mode=order: PATCH 훅 준비, 서버 준비 전까지 "아직 지원 안 됨" 토스트 (REQ 5 계획대로)

## 미검증

- 웹 Playwright 스샷: 웹 빌드 환경 미구성으로 미실행 (다음 라운드에서 화면 교체 시 함께 진행 권장)

## 이연 순증감

0 — 신규 이연 없음, 화면 교체 이연은 다음 라운드 그대로.
