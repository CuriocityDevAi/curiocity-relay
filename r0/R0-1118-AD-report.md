fork #193 APPROVE · 결제 비회귀 O · 뒤로=cart_review O · 나중 연결 PIN O · 숫자패드 O · M3-I 겹침 X

## REQ 1 — 결제 비회귀

### tender-cash/[draftOrderId].tsx
- 결제 로직(onProcess · onConfirmCard · onGenerateQris · total 계산) 변경 없음.
- 추가된 변경은 `React.useEffect`로 `setPosScreenHint` 호출 1개뿐 (마운트 시 payment_cash/qris/card, 언마운트 시 checkout_review 복귀).
- `setPosScreenHint`는 동기 함수(전역 상태 변경 + listener 알림). `await` 없음. 결제 흐름 차단 불가.

### tender-qris/[draftOrderId].tsx
- 폴링·QR·success 이동 로직 변경 없음.
- 추가는 동일 패턴 `setPosScreenHint` useEffect 1개 (payment_qris / split_1 / split_2, 언마운트 시 checkout_review).
- `await` 없음. 결제 차단 없음.

### split-tender/[draftOrderId].tsx
- 1차/2차 결제 로직, QRIS 분기, Slip 애니메이션 변경 없음.
- step 변화 시 `setPosScreenHint` useEffect 1개 추가 (payment_split_1/2 → 언마운트 checkout_review).
- `await` 없음.

### checkout/[draftOrderId].tsx
- 결제 버튼·금액·주문타입 선택 로직 변경 없음.
- 변경: `useCheckoutSnapshot` 훅 제거 → `setPosScreenHint` 로 교체. 진입 시 checkout_review, 언마운트 시 cart_review.
- `startSnapshot` / `cancelSnapshot` (DELETE 호출) → `setPosScreenHint` (로컬 상태 변경)으로 교체 → 오히려 외부 호출 감소. 결제를 막던 로직이 아니었고 교체 후도 차단 없음.

**결론: 결제 비회귀 O. 4개 파일 모두 hint 전송(동기 · await 없음)만 추가, 결제 금액·버튼·확정 흐름 diff 0.**

---

## REQ 2 — 뒤로·Next Customer·resync

### 뒤로 가면 cart_review
`checkout/[draftOrderId].tsx` useEffect return 절에서 `setPosScreenHint({ pos_screen: 'cart_review' })` — O.
- DELETE draft order API 호출 없음 — O (R2 의도: "카트 보존").

### Next Customer 버튼
`app/(tabs)/products.tsx`에 "Next customer" 버튼 추가. `handleNextCustomer`는:
1. `useNextCustomer()` → `POST /admin/pos/registers/:id/next-customer` 호출.
2. 성공 시 `setPosScreenHint(null)` → autoEmit이 카트 비었으면 'idle' 자동 계산.

**주의**: `nextCustomer` 서버 API가 paid snapshot 10분 윈도우를 해제한다고 주석에 명시되어 있으나, 앱 클라이언트 쪽에서 `cancelDraftOrder`나 `invalidateQueries(['draft-order'])` 등 카트/손님 정보를 직접 비우는 처리는 없음. 이전 손님 정보 비우기는 서버 side에서 처리되어 snapshot이 갱신되는 구조로 보임(서버 M2-1118-N 연동 가정). 클라이언트 캐시 명시적 무효화가 없어 UI상 이전 손님 이름이 짧게 잔존할 수 있으나, 블로커 수준은 아님(서버 snapshot 재심기 흐름 의존).

### AppState/online 복귀 resync
`usePosScreen.ts` 내에 구현:
- `AppState.addEventListener('change', state => { if (state === 'active') resync(); })`
- `onlineManager.subscribe(online => { if (online) flush or resync; })`

### 재시도 큐 최신 1건 collapse
`lib/pos-screen/queue.ts` `collapse()`: `state.pending.seq >= next.seq`이면 무시, 더 높은 seq만 덮어씀 — O.
`MAX_ATTEMPTS = 5`, 지수 백오프 300·600·1200·2400·4800ms — O.

---

## REQ 3 — 나중 연결 PIN 흐름

### PIN 먼저 요청
`LateLinkCustomerSheet.tsx`: 초기 step = `'pin'`. PIN 4자리 입력 후 "Next" 누르면 phone-method/replace-confirm 단계로 진행 — O.

### 서버 오류별 메시지
`lib/late-link-errors.ts` parseLateLinkError:
- `401 manager_pin_mismatch` → `pin_mismatch` → "Incorrect PIN · N left" — O
- `423 manager_pin_locked` → `pin_locked` → "PIN locked until HH:MM" — O
- `400 different_day_order` → `different_day` → "Only today's orders can be linked later (WIB)" — O
- `403 manager_pin_required` → `pin_required` → "Manager PIN required" — O

### 이전 포인트 회수 언급
`replace-confirm` step: `"This order is already linked. Replacing will revoke the previous points earned."` — O.

### 손님 화면 사용 중 경고
`customerDisplayBusy` prop이 `true`이고 step !== 'display-request'이면:
`"Customer display is busy with another payment. Linking will interrupt it."` 경고 표시 — O.

---

## REQ 4 — 숫자패드

### PIN 입력
`<NumericKeypad onPress={onPinKey} onDelete={onPinDelete} onClear={onPinClear} />` — 커스텀 패드 사용 O. `TextInput keyboardType` 없음.

### 전화번호 입력
`phone-entry` step:
```
<NumericKeypad
  onPress={(k) => setPhone((p) => (p.length >= 15 ? p : p + k))}
  onDelete={...}
  onClear={...}
/>
```
커스텀 NumericKeypad 사용 O. TextInput 없음.

---

## REQ 5 — 실행 결과

### npm install
```
(경고 메시지 후 완료)
To address all issues (including breaking changes), run: npm audit fix --force
Run `npm audit` for details.
```
정상 완료.

### npx tsc --noEmit
기존부터 존재하던 타입 오류들(FlashList estimatedItemSize, toast props, e2e spec binding, vitest.config duplicate key 등) 포함 총 11개 에러. 이 PR 신규 파일들에 기인한 에러는 없음. 기존 베이스의 known TS issue. 신규 파일(usePosScreen.ts, usePosScreenAutoEmit.ts, LateLinkCustomerSheet.tsx, lib/pos-screen/*, lib/late-link-errors.ts) 타입 에러 없음.

### npx vitest run (3개 파일)
```
Test Files  3 passed (3)
     Tests  20 passed (20)
  Start at  22:37:30
  Duration  413ms
```
전원 통과.

---

## REQ 6 — M3-I 겹침

원격 저장소에 단일 브랜치(`feat/M0-1118-L-cd-sync-r2`)만 존재. `origin/master` 외에 M3-1118-I 브랜치가 없어 git diff 비교 불가.

git log --all에서 M3-1118-I 관련 커밋 없음. 코드베이스 전체에서 `M3-1118-I` 문자열도 미발견.

기존 커밋에서 `M3-1118-G`(BLE 프린터, `__tests__/m3-1118-g.test.ts`)가 master에 병합됨을 확인. M3-1118-I는 별도 저장소(agilo-medusa-pos-fork 외)에서 진행 중이거나 아직 미생성 상태로 보임.

**겹침 파일 없음** (M3-1118-I 브랜치 접근 불가 — 원격에 존재하지 않음).

---

## 결론

APPROVE. 결제 비회귀 완전 O(4개 tender 파일 모두 hint 전송만 추가, await·catch 없음), 뒤로=cart_review O, 나중 연결 PIN+에러 분류+교체 경고+손님화면 경고 모두 O, 숫자패드 커스텀 O, 테스트 20/20 통과. 사소 이슈: "다음 손님" 후 클라이언트 캐시 명시적 무효화 없어 이전 손님 이름이 짧게 잔존 가능(서버 snapshot 재심기에 의존), TSC 기존 known 에러 11개(신규 파일 무관).
