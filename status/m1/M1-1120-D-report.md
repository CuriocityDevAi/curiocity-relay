설계서 PR #408 · 삭제 13 · 유지 12 · 변경 10 · 시나리오 19 · 라운드 3 · Link Customer 원인: `SuccessReceiptAnim.tsx:386-394` — M2-1120-B 추가 `if(snapshot?.pre_entry)` 가 earn 완료 무관하게 Link 버튼 숨김, 별개로 `pos_screen` 필드 서버 미저장으로 entering 뱃지 dead code

## PR

https://github.com/CuriocityDevAi/storeport/pull/408 (Draft)
`docs/M1-1120-D-cd-loyalty-flow-v2` → `main`

## 주요 발견

### Link Customer 버그 (§5-C)

- **파일:줄**: POS `components/payment/SuccessReceiptAnim.tsx:386-394`
- **원인 1**: `if (snapshot?.pre_entry)` → "Connected from customer display" + Link 버튼 숨김
  - M2-1120-B 추가 — `pre_entry=true` 를 "화면 입력 완료"로 가정했으나 earn 미완료 가능
- **원인 2**: `lib/loyalty-snapshot.ts:43-46` `snapshot.pos_screen === 'loyalty_entry'`
  - `pos_screen` 이 `serializeSnapshot()` / DB에 없음 → 서버 응답에 없음 → entering 뱃지 never trigger (dead code)

### 현행 예외 규칙 현황

- Rules A/B/C (`pre_entry` 기반, `payAfterKeypadMaxMs`) → 모두 삭제 대상
- `kav`, `doneSnapshotId`, `skippedSnapshotId`, `skipped_at` → **현행 코드에 없음** (설계 문서 참조 항목이었으나 미구현)
- `seq guard` → `useDisplayMachine.ts` 의 `prevSnapshot` ID 비교 (Rule E) 로 구현됨

## 설계서 위치

`storeport-m1/docs/plans/cd-loyalty-flow-v2.md`

## Kyu에게 열린 질문 4개 (PR 본문 참조)

1. receipt_button 버튼 문구 확인 ("Earn points & get e-receipt · 5")
2. 소급 적립 창 10분 초과 케이스 필요 여부
3. Medusa `payment.captured` 분할 결제 마지막 tender 발동 확인
4. pos_screen 서버 저장 여부 (Ask phone on display 경로용)
