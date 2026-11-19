storeport #400 · keypad-after→consent→receipt→done O · 테스트 219/219 · tsc 0 · V 브랜치 재실행 O

## 수정 내용

**버그**: keypad-after → consent → receipt → RECEIPT_DONE 에서 `pre_entry=false` 이면 항상 `keypad-after` 로 되돌아가는 무한 루프

**수정**: `keypadAfterVisited: boolean` 플래그 추가
- `KEYPAD_OK on keypad-after → consent`: `kav=true` 세팅
- `RECEIPT_DONE` 핸들러: `snapshot?.pre_entry || keypadAfterVisited` 이면 `done` 으로 (kav=false 클리어)
- `I(expired → main)`: 명시적 `kav=false` 클리어
- `stay()` 헬퍼: 4번째 파라미터 `kav: boolean = keypadAfterVisited` 추가

## 변경 파일
- `apps/customer-display/src/lib/display-machine.ts`
- `apps/customer-display/src/hooks/useDisplayMachine.ts`
- `apps/customer-display/src/lib/__tests__/display-machine.test.ts` (신규 테스트 6개)
- `apps/customer-display/src/lib/__tests__/display-sync-scenarios.test.ts`
- `apps/customer-display/src/lib/__tests__/live-connect.test.ts`

## 결과
- 테스트: 219/219 pass (기존 213 + 신규 6)
- tsc: 0 오류
- V 브랜치: #400 merge 후 219/219 pass · push 완료
