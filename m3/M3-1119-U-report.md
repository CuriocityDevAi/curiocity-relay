storeport #400 · keypad-after 전이 O · done 후 재진입 차단 O · 새 손님 정상 O · 테스트 213/213 · tsc 0

## 수정 내용

### (a) keypad-after 전이 — display-machine.ts
- `KEYPAD_SKIP` on `keypad-after` → `done` (Skip 버튼 · timeout 모두)
- `KEYPAD_OK` on `keypad-after` → `consent`
- 기존 규칙 C(`currentScreen === "keypad"`)가 `keypad-after`를 처리하지 않아
  Skip/OK/timeout이 아무 일도 안 하던 버그 수정

### (b) DONE_TIMER 재진입 차단 — doneSnapshotId
- `MachineInput` / `MachineOutput`에 `doneSnapshotId: string | null` 추가
- `DONE_TIMER` 발화(done→main) 시 `snapshot.id`를 `doneSnapshotId`에 기록
- 이후 틱에서 같은 paid snapshot이 와도 receipt 재진입 금지 → main 유지
- 새 snapshot(다른 id: cart_building 등) 수신 시 자동 clear → 정상 진행
- `useDisplayMachine` hook 초기 상태 · MachineInput 패스스루 추가

## 테스트 (AE probe 3시나리오)
1. keypad-after KEYPAD_SKIP → done ✓
2. keypad-after timeout(=KEYPAD_SKIP) → done ✓
3. keypad-after KEYPAD_OK → consent ✓
4. DONE_TIMER → main · doneSnapshotId 세팅 ✓
5. main + 같은 paid → main 유지 ✓
6. 새 손님 snapshot → cart · doneSnapshotId clear ✓

기존 207 + 신규 6 = **213/213 pass · tsc 0**

## 커밋
113c8cf fix(customer-display): M3-1119-U — keypad-after 전이 · DONE_TIMER 재진입 차단 (#400)
