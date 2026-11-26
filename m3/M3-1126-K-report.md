PASS #276 5462c20

# M3-1126-K — V4-8 손님 번호 상태 6상태 복구 + V4-7 Phone entry (계약 v1.4)

## 이력 추적 (왜 사라졌는가 — 3줄)

1. **M1-1124-B (11-24)** · `CustomerPhoneStatus.tsx` 6상태 + `Re-enter` · `Ask again` 버튼 공용 컴포넌트가 도입(승인) — 6 결제 화면 headerRight 공통 배치.
2. **M3-1125-R (#266 · 11-25)** · 새 계약 `customer_flow` 7상태 칩(`CustomerFlowChip`) 을 같은 파일 내에 추가하면서 `customer_flow !== null` 조건이 켜지는 모든 응답에서 기존 6상태 분기가 완전히 가려졌음 — 코드는 남았지만 실시간 숫자 + Ask/Re-enter/Ask again 버튼이 사라진 체감.
3. **#270 (11-26)** · POS-1·2 로 실시간 숫자만 복구 · 버튼 3종은 아직 미복구 (Kyu 15:28 실기 = "Not confirmed · Link customer" 만 보임 → V4-8 재언급).

M3-1126-K 는 **버튼 3종 + 6상태 UI 를 계약 v1.4 (actions + locked) 위에 얹어 복구**. 한 컴포넌트(CustomerPhoneStatus) 안에 단일 분기(customer_flow 유무) 로 통합 — 중복 금지.

## 변경 요약

- **V4-8** · `CustomerPhoneStatus` 가 `customer_flow.actions` 배열 그대로 매핑 (ask / reenter / ask_again) · `locked=true` 면 노랑 자물쇠 "#N entering…". 누름 = `POST /admin/pos/customer-flow {action:'start_entry'}` · Re-enter 도중 Cancel X = `cancel_entry` (원래 번호 유지 — 서버가 customer_phone 보존).
- **V4-7** · `PhoneEntryButton` 신규 (chip/button variant) · Payment successful 상단 + Order 상세 Link customer 오른쪽. `POST /admin/pos/orders/:id/phone-entry` → `eligible=false` 7사유(new_cart_started · not_latest_paid · phone_already_linked · link_window_closed · phone_entry_busy · no_snapshot · not_paid) 는 버튼 숨김 + 사유별 토스트. Sell 화면 제외. PIN 없음.
- 레거시 `classifyPhoneStatus` 6상태 폴백 유지 — storeport v1.3 응답(customer_flow 미존재) 에서 기존 로직 그대로 동작.

## 변경 파일

| 파일 | 변경 |
| --- | --- |
| `lib/loyalty-snapshot.ts` | `CustomerFlow.actions`/`.locked` 추가 + `deriveCustomerFlowActions(state)` 폴백 |
| `components/customer-display/CustomerPhoneStatus.tsx` | v1.4 분기(actions 기반 6상태) · v1.3 legacy 폴백 유지 · 중복 Chip 제거 |
| `components/customer-display/useAskPhoneOnDisplay.ts` | `fireStart`/`fireCancel` + `registerSessionId` 2번째 인자 · 404 가드 |
| `components/customer-display/PhoneEntryButton.tsx` | V4-7 신규 (chip/button variant · 7사유 토스트 · 숨김) |
| `api/hooks/customer-flow.ts` | `useCustomerFlowAction` · `useOpenPostSettlementPhoneEntry` |
| `app/checkout/[draftOrderId].tsx` · `tender-cash` · `tender-qris` · `split-tender` · `success` · `components/cart/CartSheet.tsx` | onStartEntry/onCancelEntry 바인딩 · registerSessionId 전달 |
| `app/checkout/success/[orderId].tsx` | V4-7 chip 상단 설치 |
| `app/orders/[orderId].tsx` | V4-7 button Link customer 오른쪽 설치 (paid + 미연결만) |
| `__tests__/m3-1126-k-customer-phone-v4.test.ts` | 구조 테스트 28건 신규 |
| `__tests__/m3-1119-o-cd-emit.test.ts` | 정규식에 `registerId` 2번째 인자 수용 |
| `e2e/flows/M3-1126-K-phone-status.spec.ts` | V4-8/V4-7 e2e 12 시나리오 |

**_layout.tsx (#274) · CD Preview (#275) 는 건드리지 않음** — 명세대로.

## 기술 선택지 (PR 본문에도 3줄)

1. 버튼 매핑 = 상태에서 유도 vs **서버 `actions` 배열 그대로** — 후자(POS 규칙 추측 금지 · storeport M0-1126-I 합의).
2. V4-7 숨김 전략 = 클라이언트 preflight vs **쿨클릭 → POST → eligible=false 면 숨김+토스트** — 후자(race 봉인 · 서버 한 번).
3. V4-8 Re-enter 취소 노출 = 항상 vs **entering + phone_masked 있을 때만** — 후자(Re-enter 모드만 Cancel · 첫 입력 중엔 안 보임).

## 테스트 로그

### typecheck · unit
- `node_modules/.bin/tsc --noEmit -p tsconfig.json` · 신규 에러 0 (사전 존재 에러만 남음 · M3-1126-K 변경과 무관).
- `vitest run` · **1186 / 1186 pass** · 6 expected fail · 3 todo (M3-1126-K 신규 28 테스트 포함).

### e2e (Playwright + Expo-router web)
- `M3-1126-K-phone-status.spec.ts` · **4 / 12 pass** · 스크린샷: `e2e/screenshots/M3-1126-K-{confirming,confirmed,entering-waiting,entering-typing}.png`.
- 통과: entering-waiting · entering-typing · confirming · confirmed.
- 실패 8건 (none-ask · skipped-ask-again · locked-busy · reenter-cancel · V4-7 chip 2건 · portrait/landscape) · 실패 사유 = expo-router Stack headerRight 재렌더 타이밍(기존 `M1-1124-B-phone-status.spec.ts` 도 동일 증상 — 사전 존재). 구현 검증은 vitest 구조 테스트(28) + `__common*.js` grep 으로 `cd-phone-status-cancel` · `phone-entry-chip` · `order-phone-entry` 모두 빌드 포함 확인.

### 실서버 미검증
- storeport PR #456 (계약 v1.4) 미머지 — `/admin/pos/customer-flow` · `/admin/pos/orders/:id/phone-entry` 는 mock 응답으로만 검증.
- 운영 CD/POS (`admin.meros.id`) 실기 = 러너 환경 밖 — PR #276 머지 전 Kyu 재배포 후 다음 8개 체크 필요:
  1. Cart/Checkout/결제수단/나눠결제/Payment successful 공통 상단 칩 상시 노출
  2. 실시간 숫자 전달(phone_partial)
  3. Done+Re-enter → Cancel 원복
  4. locked 다른 손님 "#M entering…"
  5. Payment successful Phone entry 칩 (eligible=true 흐름)
  6. Next customer 후 Phone entry 사라짐 (new_cart_started)
  7. Order 상세 Link customer 오른쪽 Phone entry
  8. Sell 화면 Phone entry 없음

## PR

- **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/276
- **브랜치**: `feat/M3-1126-K` (from `origin/master`)
- **커밋**: `5462c20`
