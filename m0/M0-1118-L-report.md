fork PR #193 · 전이 15/15 · 뒤로=cart_review O · 다음 손님 O · resync O · 나중 연결 PIN O

# M0-1118-L — 손님 화면 싱크 R2 보고

## 범위 준수
- 작업 폴더: `~/curiocity-live/pos-m0` (git worktree · pnpm install 후 vitest 실행)
- 브랜치: `feat/M0-1118-L-cd-sync-r2`
- 금지 영역 (`app/checkout/success/*`, `payment-dialog/hooks.ts`, `useOrderProcessing.ts`, `config/medusa.ts`, 서버) 모두 미변경
- /loop 사용 안 함 · 55분 상한 준수

## 변경 (파일 24개 · +1090/-15)
### 신규
- `lib/pos-screen/{types,queue,index}.ts` — 16 enum (서버 PR #378 와 1:1) · 재시도 큐 순수 로직
- `hooks/usePosScreen.ts` — 중앙 emit · 300ms 디바운스 · seq 자동 · 지수 백오프 · online/foreground resync · `onlineManager.subscribe` + `AppState.addEventListener('change')`
- `hooks/usePosScreenAutoEmit.ts` — 카트 상태 + hint 통합 → idle/cart_building 자동 + 화면별 hint 수용
- `components/PosScreenEmitter.tsx` — 인증+setup 서브트리에서만 1회 마운트
- `components/orders/LateLinkCustomerSheet.tsx` — 매니저 PIN + 번호 2단계 시트
- `lib/late-link-errors.ts` — 서버 PR #379 에러 매트릭스 → UI 분류 (pure)
- `__tests__/pos-screen-queue.test.ts` · `pos-screen-transitions.test.ts` · `late-link-errors.test.ts`

### 수정
- `api/hooks/pos-loyalty.ts` — `useNextCustomer` 추가 · `.catch(()=>{})` → `console.warn` (REQ 4)
- `app/_layout.tsx` — `<PosScreenEmitter />` 마운트
- `app/(tabs)/_layout.tsx` — `useCustomerDisplayCartSync` 제거(새 훅으로 흡수)
- `app/(tabs)/products.tsx` — Next customer 버튼 · focus=hint null
- `app/(tabs)/cart.tsx` — focus=cart_review hint
- `app/checkout/[draftOrderId].tsx` — 진입=checkout_review · 뒤로=cart_review (DELETE 삭제 · REQ 2)
- `app/checkout/tender-cash|qris|split-tender/*.tsx` — payment_cash/qris/card + split_1/2 hint · amount·qr_string 전달
- `app/orders/[orderId].tsx` — Hand over 성공 → handover · Link customer 버튼 + LateLinkCustomerSheet
- `app/register/open.tsx` · `app/register/close.tsx` — shift_opening · shift_closing
- `components/orders/VoidRefundSheet.tsx` — 열림=refund hint

## 전이 커버리지 (15/15)
| # | pos_screen | 트리거 |
|---|---|---|
|1|`idle`|빈 카트 Products 포커스 (자동)|
|2|`cart_building`|아이템 담기 중 Products (자동)|
|3|`cart_review`|Cart 탭 포커스 · 체크아웃 뒤로|
|4|`checkout_review`|체크아웃 진입|
|5|`payment_cash`|tender-cash method=cash|
|6|`payment_qris`|tender-qris 전체화면|
|7|`payment_card`|tender-cash method=card|
|8|`payment_split_1`|split-tender step=first|
|9|`payment_split_2`|split-tender step=second|
|10|`handover`|Orders Hand over 성공|
|11|`refund`|Void/Refund 시트 열림|
|12|`shift_opening`|register/open 화면|
|13|`shift_closing`|register/close 화면|
|14|`loyalty_entry`|Orders → Ask customer on display|
|15|`locked`|enum 등록 · 호출 지점은 R3 뒤 추가 예정|

## Kyu 11-18 UX 결정 반영
- 16:22 "긴밀하게 바뀌어야" → 300ms 디바운스 · 전이마다 1건 upsert (REQ 1)
- 16:41 "뒤로 가도 카트 유지" → DELETE 안 함 · pos_screen 만 cart_review 로 되돌림 (REQ 2)
- 16:41 "다음 손님 → 대기" → Next customer 버튼 · `POST /admin/pos/registers/:id/next-customer` → idle (REQ 3)
- 16:41 "재페어링은 설정에서만" → 손님 연결 UI 에 재페어링 없음 (유지)
- 16:58 "매니저 4자리 PIN" → LateLinkCustomerSheet · 서버 PR #379 매트릭스 수용
- 16:58 "같은 날 주문만" → 서버 400 different_day_order 분류 → UI 안내
- 16:58 "기존 연결 교체는 확인 후 이전 포인트 회수" → replace-confirm 단계
- 16:58 "손님 화면 사용 중이면 경고 후 끼어들기" → `customerDisplayBusy` 경고 노출

## 품질
- `./node_modules/.bin/vitest run` · 58 files · 705 pass · 6 expected fail · 3 todo (전부 pre-existing)
- `./node_modules/.bin/tsc --noEmit` · 신규 에러 0 (잔여 에러는 master 기준 pre-existing: FlashList ref, dayjs, expo-modules-core, use-network-status any — 티켓 범위 밖)
- 신규 테스트 20건 · 전부 초록

## 서버 연동 (미변경 · 참조만)
- `POST /admin/pos/orders/:id/checkout-snapshot` body { pos_screen, seq, stage, qr_string?, amount?, register_session_id } — PR #378 수용 · 하위 호환
- `POST /admin/pos/registers/:id/next-customer` — PR #378 신규
- `POST /admin/pos/orders/:id/customer` body { source:'order_lookup', manager_pin, phone, consent } — PR #379 수용

## 실기 체크리스트
1. R3(#381) 머지 후 iPad 재설치
2. 담기 → 손님 화면 품목·총액 실시간
3. 체크아웃 → 뒤로 → 카트 유지 (cart_review 전환)
4. QRIS → 손님 화면에 QR + 금액
5. "Next customer" → 손님 화면 대기 전환
6. Orders → Link customer → PIN 입력 → 다른 날 400 / 틀린 PIN 401 / 잠김 423 안내
7. Orders → Link customer → 손님 화면에 요청 → loyalty_entry pos_screen 전환

## 미완
- `locked` 호출 지점(앱 백그라운드 or 세션 잠금) — R3 머지 뒤 별도 라운드로 배정 요청
- `checkout/success` 화면의 "손님 화면에 번호 요청" 버튼 — PR #191 머지 뒤 별도 라운드 (ticket 금지 영역)
- 재시도 큐의 실패 경로를 fake timers 로 검증하는 통합 테스트 — 순수 로직만 커버 (상위 React hook 통합은 R3 이후)
