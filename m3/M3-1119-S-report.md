storeport #400 · Skip 되튐 O · paid expire 조건 O · 번호→영수증 흐름 O · LateLink O · 테스트 207/207 · IT 2/2(+1 수정)

변경 요약:
- apps/customer-display/src/lib/display-machine.ts
  · MachineInput/MachineOutput 에 `skippedSnapshotId: string | null` 추가
  · `stay()` 헬퍼에 `skippedSnapshotId` 파라미터 추가 (default = prevSkippedId 유지)
  · `KEYPAD_SKIP` + keypad + inFlight → `stay(..., snapshot?.id ?? null)` 로 pending-skip 메모리 세팅
  · `target === "keypad"` 가드: `isSkipped = !!snapshot.skipped_at || snapshot.id === prevSkippedId`
    - skipped 이면 current=main/keypad 시 cart, 그 외 현재 유지
    - 서버 skipped_at 반영되면 메모리 null 로 clear, 아직 null 이면 prevSkippedId 유지
- apps/customer-display/src/hooks/useDisplayMachine.ts
  · MachineInput 생성 시 `skippedSnapshotId: state.skippedSnapshotId ?? null` 전달
  · 초기 state 에 `skippedSnapshotId: null` 추가 (State extends MachineOutput 로 자동 포함)
- apps/commerce-core/src/modules/register_session/service.ts
  · ③ paid 가드: `input.pos_screen === "idle"` 제거 → `cart_building` 만 paid expire 트리거
    (success 페이지의 setPosScreenHint(null) idle 전송이 consent 를 끊는 버그 해소)
  · `upsertSnapshotForRegister` existing 업데이트: `pos_screen === "loyalty_entry"` 이고
    기존 `skipped_at` 있으면 `skipped_at: null` 로 초기화 (POS LateLink → CD keypad 재진입 허용)

테스트:
- apps/customer-display vitest: 207/207 통과 (M3-1119-S describe 3개 추가)
  · "KEYPAD_SKIP + keypad + checkout active → skippedSnapshotId 세팅"
  · "loyalty_entry 틱 (skipped_at=null, skippedSnapshotId 세팅) → cart 유지 · memory 유지"
  · "skipped_at 반영 후 → cart · skippedSnapshotId clear"
- apps/commerce-core typecheck: 통과
- apps/commerce-core 단위 테스트(pre-push): 47 suites / 539 tests 통과
- IT 테스트(수정/추가):
  · cd-pos-screen-sync.spec.ts: 기존 "paid+idle → expire" 테스트를 "paid+idle → 보존" 으로 대체,
    "paid+cart_building(더 큰 seq) → expire · active cart_building" 신규 추가
  · cd-snapshot-skip.spec.ts: "(M3-1119-S) loyalty_entry 재수신 시 skipped_at 초기화" 추가

커밋/푸시:
- 45fd216 fix: M3-1119-S — Skip 되튐 · paid expire 조건 · LateLink skipped_at (#400)
- origin/fix/M3-1119-O-cd-sync 로 push 완료 (pre-push 통과)
