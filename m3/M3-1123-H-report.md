# M3-1123-H-report — PASS

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/236
- 브랜치: `feat/M3-1123-H-ask-on-display`
- base 브랜치: `fix/M3-1123-G-sell-test1` (스택 PR · #233 머지 후 base 를 master 로 변경 필요)
- mergeable: base 변경 필요 (#233 머지 대기)

## 1. 구현 요약

**신규 파일**

- `api/hooks/ask-phone-on-display.ts`
  - `useAskPhoneOnDisplay()`: `POST /admin/pos/orders/:id/ask-phone-on-display` mutation
  - `classifyAskPhoneError()`: FetchError → `phone_entry_busy | already_linked | link_window_closed | server_pending | error` 분류
  - `phone_entry_busy` 시 `customer-display-snapshot` 쿼리 무효화 → snapshot 즉시 재폴링

**수정 파일**

- `components/order-chips/OrderChipDetail.tsx`
  - `noServerEndpoint = true` 제거 → 실제 API 호출
  - 200: 토스트 "Showing #N on display" + dialog 닫기
  - 409 `already_linked`: 토스트 "Already linked"
  - 409 `link_window_closed`: 토스트 "Link window closed (Enter phone here instead)"
  - 409 `phone_entry_busy`: snapshot 무효화(훅 내부), 버튼은 snapshot 갱신 후 자동 비활성
  - 404: `onServerPending()` 콜백 → "Server update pending" 비활성
  - 그 외: 일반 오류 토스트
  - props 추가: `serverPending`, `onServerPending`

- `components/order-chips/OrderChips.tsx`
  - `askPhoneServerPending` state 추가 → dialog 재오픈 후에도 "Server update pending" 유지

**테스트**

- `e2e/flows/M3-1123-H-ask-display.spec.ts`: 4경우 `page.route` mock 어설션
  - 200 → 토스트 "Showing #2 on display" · dialog 닫힘
  - 409 `phone_entry_busy` (snapshot busy) → 버튼 비활성 "#1 entering…"
  - 409 `already_linked` → 토스트 "Already linked"
  - 404 → 버튼 비활성 "Server update pending" (dialog 재오픈 후에도 유지)

## 2. 설계 메모

서버 SDK(`@medusajs/js-sdk`)의 `FetchError` 는 JSON 응답 body `type` 필드를 보존하지 않고 `message` 만 보존함. 409 subtype 판별은 `err.message.toLowerCase()` 포함 여부로 처리 (`classifyAskPhoneError`). `entering_order_id` 는 FetchError 에서 추출 불가 — `phone_entry_busy` 시 snapshot 쿼리 무효화로 `enteringOrderNum` prop 갱신.

`phone_deferred` 는 서버 사이드 로직 — POS 버튼 활성/비활성 판정은 기존 `phone_entry_open` 체크(`askOnDisplayDisabled`)로 충분하므로 클라이언트 타입 변경 없음.

## 3. 실기 필요 항목

- 실제 손님 화면(customer-display)에 번호 입력 화면이 표시되는지 확인 — Playwright 에서 검증 불가
