#389 · (a) expired O · (b) 반영(paid→expired 허용, receipt 완료 후이므로 화면 차단 없음) · dispatch 먼저 O · 연타 1회 O · timeout 서버 미발송 O · 테스트 O

## 변경 내용

### REQ 1: paid 스냅샷 skip 규칙
- (a) `pos_screen='loyalty_entry'` active 스냅샷 → skip → expired: POS(#195)가 expired를 보고 "Skipped" 배지 표시. 서버 구분법: `snapshot.pos_screen === 'loyalty_entry'` 여부로 POS가 loyalty_entry 모드인지 판별 가능.
- (b) `snapshot_state='paid'` keypad-after → skip → expired 허용: 영수증 화면은 RECEIPT_DONE 이벤트로 이미 닫힌 뒤이므로 expired 로 바꿔도 화면 차단 없음. POS는 loyalty_entry 모드가 아니어서 "Skipped" 배지를 표시하지 않음.
- paid 가드 의도적 미채택: service.ts에 주석 추가. 통합 spec에 (a)(b) 각 1케이스 추가 — 5건 모두 통과.

### REQ 2: dispatch 먼저 · fire-and-forget · timeout · 연타 방지
- `handleSkip`: `async` 제거 → dispatch 먼저(동기), `skipSnapshotOnServer` await 없이 호출.
- `snapshot-api.ts`: `AbortSignal.timeout(5000)` 추가, `_sent Set`으로 같은 snapshotId 1회만 전송.
- vitest: timeout signal 확인 · 연타 1회 · 다른 ID 각각 — 5건 모두 통과.

### REQ 3: onTimeout 서버 미발송
- `handleTimeout` 신설: `dispatch({ type: 'KEYPAD_SKIP' })` 로컬 전이만 수행, PATCH 없음.
- `KeypadAfterScreen onTimeout={handleTimeout}` 으로 변경.

## 테스트 결과
- `it.sh cd-snapshot-skip`: 5/5 통과 (기존 3 + 신규 (a)(b) 2)
- `customer-display vitest`: 200/200 통과 (skip-patch.test.ts 5건 포함)
- `commerce-core unit`: 539/539 통과
- SHA: 4552dc3 · feat/M2-1119-D-cd-skip
