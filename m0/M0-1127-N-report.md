# M0-1127-N — 손님 화면 실기 실패 수정 묶음 리포트

**PASS** · PR#479 head `99a55bd2` · 새 PR#480 head `6f2cc0f` · 테스트 commerce-core 886 pass · customer-display 352 pass

## REQ 1 · PR#479 필수 1 (snapshots.spec testID 동기화)
- `apps/customer-display/e2e/snapshots.spec.ts:141` `timer-label` → `keypad-countdown-number` 로 수정.
- 다른 testID 변경분 (`keypad-countdown` / `keypad-countdown-track` / `keypad-countdown-fill` / `payment-complete-headline` / `get-points-cta` / `get-points-cta-label`) 은 `snapshots.spec` 참조 없음 — 추가 수정 없음.
- 브랜치 `feat/M0-1127-M-cd-keypad-countdown` · 커밋 `99a55bd2` push 완료.

## REQ 2 · A3 (`isPostSettlementStale`)
- `apps/commerce-core/src/modules/register_session/lifecycle.ts:99-105` — 진행 중 가드 리스트에 `'confirmed'` 추가. 번호 OK → Correct 직후 (paid_age > 30s) `customer_phone` 세팅만으로 stale 로 꺾이던 회귀 차단. Correct 후 화면은 POS 가 Next customer / Handover / View order 로 떠날 때까지 유지 (활성 스냅샷이 있으면 `pickBestSnapshot` rank 로 자연 교체).
- `apps/customer-display/app/index.tsx:338-345` — CD 측 `inActiveFlow` 에도 `'confirmed'` 포함 (서버 1차 필터 + 클라 2차 가드).
- 유닛 테스트 `order-snapshot.unit.spec.ts:542` 를 `confirmed → false (완료 화면 유지)` 로 전환 → 53 pass.
- fork#287 case1b 경로 (paid_age 60s · 기존 번호 · OK → Correct → 적립 완료 화면 유지) 는 바뀐 가드가 그대로 커버.

## REQ 3 · Re-enter (`phone_already_linked`)
- `apps/commerce-core/src/modules/register_session/service.ts:965-984` — `openPostSettlementPhoneEntry` 의 `customer_phone` 조기 거절 제거. sibling 검사 (`new_cart_started` / `not_latest_paid` / `phone_entry_busy`) 를 통과하면 Re-enter 로 열어 준다.
- 같은 함수 `service.ts:1065-1080` — Re-enter 분기면 `customer_phone` 도 null 로 리셋 → `isPhoneEntryOpen` 재개 + CD 키패드 초기화 (`isReenter ? { customer_phone: null } : {}`).
- `withRegisterPhoneEntryLock` advisory lock 과 `markSnapshotPaid`-이전 recheck 로 동시 두 요청 중복 방지. `linkCustomerToOrder` 의 `needsReenterTransfer` (M0-1126-P) 가 A 회수 + B 적립을 1 트랜잭션 + `reenter:<order>:<B_customer>` ref 로 멱등 처리.
- 변경 기록 보강 — `apps/commerce-core/src/lib/link-customer-order.ts:413-435` `loyalty_transfer.entries[].from_phone_masked` / `to_phone_masked` / `source` 추가. 기존 `at`·`from_customer_id`·`to_customer_id`·`reclaimed` 는 유지. "시각·이전→새 번호·source" 가 1줄에 들어감.
- 같은 번호 재확정: `upsert.customer_id === previousCustomerId` 이면 `needsReenterTransfer=false` → 재적립도 회수도 없음 (코드 조건 그대로).
- 통합 테스트 `cd-pos-sync-v4.spec.ts ⑦` (A → B 확정 · A 회수 · B 적립 · loyalty_transfer entry 기록) 가 이미 전 경로 커버. 이번 변경은 `/phone-entry` route 로 들어와도 같은 경로가 작동하도록 전환.

## REQ 4 · B (Ask again 영수증 고정)
- `apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:193-234` — 모듈 스코프에 `lastAnimatedReceiptId` 를 두고, 같은 `snapshot.id` 재진입 시 `slideProgress.setValue(1)` 로 즉시 완성 상태. 첫 등장만 애니메이션.
- Ask again 때 (state=skipped → entering 전환 · 같은 주문) ReceiptMini 재렌더가 와도 애니메이션은 재생되지 않음.

## REQ 5 · A2 (키패드 등장 부드럽게)
- `apps/customer-display/src/screens/PhoneFlowScreen.tsx:64-69` — `Animated.spring(friction 8 · tension 51)` → `Animated.timing({ duration: 700, easing: Easing.out(Easing.cubic) })`. overshoot 제거. 길이 체감은 비슷하게 유지.
- `Easing` 임포트 추가.

## REQ 6 · 명세 CD-KEYPAD 값 기록
- `curiocity-relay/specs/screens/customer-display.md:34` — "구현 대기" → "`값 (M0-1127-N · Kyu 11-27 15:38 "위압적" 해소): Animated.timing · duration=700ms · Easing.out(Easing.cubic) · overshoot 없음 (spring 제거) · PhoneFlowScreen.tsx:64`".
- 전용 브랜치 `m0/M0-1127-N-cd-keypad-spec` → curiocity-relay PR#71 (docs-only · base=main).

## 검증
- `pnpm -F commerce-core test` (unit) : 75 suites · 886 pass.
- `pnpm -F customer-display test -- --run` : 19 files · 352 pass.
- `pnpm -F commerce-core typecheck` · `pnpm -F customer-display typecheck` : 모두 pass.
- `apps/wing` typecheck 는 `ButtonPrimitive` TS2786 — 본 작업과 무관 (기존 main 상태 · M0-1127-N 변경 밖 패키지).
- **Playwright e2e 미실행 (미검증)** — 터미널에서 CD dev server + 백엔드 기동이 세션 안에서 어려워 생략. Kyu iPad 실기에서 A3 경로 (Correct → 적립 완료 화면 유지) 직접 확인 바람.

## 산출물
- storeport PR#480 — https://github.com/CuriocityDevAi/storeport/pull/480 · base `feat/M0-1127-M-cd-keypad-countdown` · head `6f2cc0f` (stacked on #479).
- storeport PR#479 추가 커밋 `99a55bd2` — snapshots.spec testID 동기화 (필수 1 머지 전).
- curiocity-relay PR#71 — https://github.com/CuriocityDevAi/curiocity-relay/pull/71 · 명세 값 기록.

## 보존 요소
카운트다운 · Get N points · `#N` (PR#479) · 키패드 `08` 프리필 · 20초 skip 전이 (PR#474) · 결제 전 번호 입력 · 결제 후 소급 (PR#478) 모두 변경 범위 밖.

## CI
세션 안에서 CI 기다리지 않음 (지시). GitHub 러너가 돌리고 결과는 PR 코멘트.
