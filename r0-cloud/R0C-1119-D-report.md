#389 CHANGES · 지적 3건 해소 2/3 · (b) 화면 잘림 X (link window 잘림 O) || install 27s · unit O · 통합 O · 손님화면 O · eslint 새 error 0 · 총 ~3분

# R0C-1119-D · storeport PR #389 재리뷰 (HEAD 4552dc3)

## 판정: CHANGES (PR 에 COMMENT 리뷰로 제출 · 머지 안 함)

| 지적 | 상태 | 근거 |
|---|---|---|
| ① paid 가드 | 미해소 | `skipSnapshot` 이 paid 스냅샷도 `expired` + `link_open_until=now` 로 바꿈 → `link-customer-order.ts:312-323` 에서 409 `link_window_closed` → POS 점원 연결과 order_lookup 사후 번호 연결이 막힘 (R4 사후 적립 포함) |
| ② handleSkip | 해소 | dispatch 먼저 · fetch await 없음 · `AbortSignal.timeout(5000)` · `_sent` Set 으로 같은 id 1회 |
| ③ onTimeout | 해소 | `handleTimeout` = 로컬 dispatch 만 |

(b) 손님 화면: 잘림 없음. keypad-after + KEYPAD_SKIP 은 display-machine 에 매칭되는 규칙이 없어 keypad-after 에 머무름 (main 브랜치에서도 같은 동작). 다음 poll 에서 expired → rule I 로 main. receipt 는 keypad-after 전에 이미 끝남.
수정 제안: paid 이면 `ignored: true` 로 끝내고 상태와 link_open_until 은 그대로 두기. 통합 테스트 (b) 기대값도 바꾸고, 그 상태에서 /admin/pos/orders/:id/customer 가 200 인지 확인하는 케이스 추가.

## 실행
| 항목 | 결과 |
|---|---|
| pnpm install --frozen-lockfile | O 27s |
| commerce-core unit | O 47 suites / 539 pass (29s) |
| it.sh cd-snapshot-skip | O 5/5 (13s) |
| customer-display vitest | O 12 files / 200 pass |
| eslint commerce-core src/ | error 0 · warning 13 |
| tsc commerce-core / customer-display | 0 / 0 |
