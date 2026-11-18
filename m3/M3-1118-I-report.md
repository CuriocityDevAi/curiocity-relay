PR #192 · 재현 현금 O · PayLater O/X(split만) · 수정 후 중복 0 O · 오프라인 즉시 안내 O · Hand over 안내 O

## 완료 항목

**이전 세션(M3-1118-H) 완료:**
- lib/tender-idempotency.ts 신규: SecureStore 기반 tender_submitted_{orderId} 마커
- tender-cash: REQ-2 idempotency 가드 — 마커 존재 시 복구 UI (Orders 확인·재시도·clear)
- tender-cash: REQ-3 오프라인 사전 체크 — `useNetworkStatus` → 즉시 토스트, 15초 스피너 없음
- split-tender: 모든 결제 수단(Cash/Card/QRIS 1차·2차)에 REQ-3 오프라인 체크 추가
- FulfillSheet: REQ-4 Hand over 실패 시 주문번호 + "Open Orders to retry Hand over" 안내
- e2e/flows/12-offline-dup.spec.ts 신규: 3개 e2e 테스트 초안
- PR #192 draft 생성

**이번 세션(M3-1118-I) 완료:**
- Flow 12 e2e 3개 모두 green:
  - REQ-3: 오프라인 시 Process 클릭 → tenderCallCount=0 · role=alert 토스트 ✓
  - REQ-2: addInitScript 마커 → 복구 UI 표시 · 중복 POST 0 ✓
  - REQ-2: retry-clear → 마커 삭제 → 정상 결제 ✓
- 근본 원인 발견·해결:
  1. reuseExistingServer 로 구 번들 서빙 → `lsof -ti:4321 | xargs kill` 선행 필요
  2. page.evaluate(post-nav) → page.addInitScript(pre-load) 로 마커 삽입 방식 교체
  3. route.continue() → route.fulfill({status:503}) (실제 네트워크 호출 차단)
  4. getByText(Korean) → getByRole('alert') (CapsuleToast accessibilityRole 활용)

## 결과

- 전체 e2e: 28 passed / 9 failed (기존 pre-existing 실패 동일, 회귀 없음)
- Flow 12: 3/3 ✓
- 커밋: 333544b (M3-1118-H 구현) + 36bc22b (M3-1118-I e2e 안정화)
- Push: origin/fix/M3-1118-H-offline-dup

## 미완료 (다음 라운드)

- PayLater(convertToOrder 후 오프라인) idempotency 가드: tender-cash 에서 처리되지만
  PayLater 경로 별도 e2e 미작성 (시간 부족 · PR 본문에 명시)
- draft PR → ready 전환: Flow 12 ①② 모두 green → PR #192 ready 로 전환 가능
