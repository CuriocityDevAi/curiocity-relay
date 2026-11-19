R0 판정: CHANGES — storeport #400 (3차 · HEAD 45fd216)

# R0C-1119-AE — #400 3차 리뷰 (2026-11-19)

PR 코멘트: storeport#400 issuecomment-7009901751 · push·머지 없음.

## 검증
| 대상 | 결과 |
|---|---|
| customer-display tsc / vitest | 0 / 207/207 |
| commerce-core tsc | 0 |
| IT cd-pos-screen-sync / checkout-snapshot / cd-snapshot-skip | 5/5 · 7/7 · 7/7 |

## AB probe 재실행 (nextScreen probe)
| 시나리오 | 결과 |
|---|---|
| 지연 PATCH Skip (skipped_at=null 틱 2회 → 반영) | O — keypad→cart 유지 |
| LateLink 재요청 (서버 skipped_at 초기화) | O — keypad 표시 |
| Next customer (idle seq0) | O — 1틱 rewind 가드 후 main |
| Products 에서 품목 담기 (cart_building 새 snapshot) | O — 1틱 후 cart |
| 번호 없이 결제 → receipt → keypad-after → Skip/OK/timeout | **X** — 모두 아무 일도 안 함 (규칙 C 가 currentScreen==="keypad" 만 처리) · paid TTL 10분 동안 멈춤 |
| pre_entry 결제 → receipt → done → DONE_TIMER → main | **X** — 다음 틱에 paid 때문에 규칙 A/B 가 receipt 로 다시 보냄 · receipt↔done 반복 |
| Products(빈 장바구니) → 대기 | **X** — 위 두 상태에 갇힘 |

origin/main 의 display-machine 으로 돌려도 위 X 2건은 같음 (main 부터 있던 버그). 하지만 #400 의 목적(M3-1119-O REQ 4 "POS 가 Products(빈 장바구니) 로 가면 대기 화면")을 충족하지 못하고, Kyu 실기에서 바로 드러날 흐름이라 CHANGES.

## paid expire 를 좁힌 것 (항목 3)
- master POS 는 결제 직후 SecureStore 에서 draft_order_id 를 지우고 invalidate 함 (pos-payments.ts onSuccess). 그래서 useCurrentDraftOrder=null → 이후 idle emit 은 order_id=null 이 되고 `postEmit` 이 이를 버림. Products 포커스 때는 hint 가 이미 null 이라 deps 변화가 없어 emit 자체도 없음.
- 즉 이 경우에는 서버 조건(idle 을 빼든 말든)이 영향을 주지 못함. S 의 변경이 회귀를 만든 것은 아니지만, 대기 화면 전환은 CD 가 혼자 처리해야 함.
- IT 주석 "Products 이동 시 반드시 cart_building" 은 사실이 아님 (빈 장바구니면 idle 이고 버려짐).

## IT "+1 수정" (항목 4)
- "paid+idle → expire" 를 "paid+idle → 보존" 으로 바꾼 것은 의도를 뒤집은 것이고 테스트를 약하게 만든 게 아님. "paid+cart_building → expire · active cart_building" 이 새로 추가됨. cd-snapshot-skip 7번(LateLink 초기화)도 추가됨. 약화 아님.

## 고칠 것 (CD 만)
(a) keypad-after: KEYPAD_SKIP/timeout → done, KEYPAD_OK → consent → receipt/done
(b) DONE_TIMER 이후에는 같은 paid snapshot id 를 기억해서 main 을 유지 (skippedSnapshotId 와 같은 방식) → receipt 로 다시 들어가지 않음 · Products→대기 해결
각 경우 단위 테스트 추가.

## nit (후속)
- 서버에 알리지 않는 keypad timeout 은 skippedSnapshotId 를 남겨서, 같은 snapshot LateLink 재요청 시 keypad 가 안 뜸
- POS AppState resync 가 loyalty_entry 를 다시 보내면 skipped_at 이 지워져 keypad 로 되튈 수 있음
