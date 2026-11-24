# handoff — 11-24 밤 자율 마감 (22:52~01:00 WIB) → 11-25 아침

이 파일이 최신. 바로 앞 = `handoff-20261125.md`(11-24 17:00 마감 · 작업 큐 표는 그쪽 참조 후 아래로 갱신).
새 세션 첫 줄: "CurioCity 오케. relay ledger 읽고 최신 handoff(handoff-20261125-am.md) 읽고 현황판부터."

## 밤사이 머지
| 리포 | PR | 내용 |
|---|---|---|
| fork | #253 (924cf7d) | draft 생성 시 metadata.stock_location_id |
| fork | #252 (f29fc29) | 결제 성공 화면·영수증·프린터 custom_display_id 공용 헬퍼 |
| storeport | #421 (15ab1eb) | 주문 생성 시 매장 닉네임 번호 부여 fallback + receipt snapshot order_custom_display_id |
| fork | #254 (9f8eb3e) | Checkout B안 · tender 제목 3종 · Cart X 44pt (+ 테스트 갱신) |
| relay | (PR #27 내용이 PR 머지 없이 main 에 들어감) | 러너 v8.2 main-guard · safe-push · worktree 조항 · sleep 보정 — **러너가 self-update 로 v8.2 가동 중(pid 56897)**. R0-AL CHANGES 3건 수정본(5720054) 포함. PR #27 은 open 상태로 남아 있음 → 닫기 필요 |
(#422 Admin 영수증 탭은 이미 11-24 중 머지돼 있었음 · main 9dfa555)

## 열린 PR / 막힘
| 항목 | 상태 | 다음 |
|---|---|---|
| storeport #423 PS 매장 스크립트 PIM 선택 안전화 | R0-AM APPROVE · **ci-summary 코멘트 없음(CI 미확인)** · #421 머지 뒤 충돌 여부 미확인 | CI 확인 → 머지 → Kyu PS dry-run |
| relay #28 ci-watch v2 칸반 | R0-AM CHANGES 2건 M1-T 에서 해소(a2e1fe1) · **main 과 install.sh 충돌** · M1-1124-U 는 `pane busy (2nd · 재시도 소진)` 로 blocked | M1 pane 상태 확인 후 M1-U 재발부(다음 알파벳) → 머지 → Kyu `ci-watch.sh --v2` |
| relay #27 | 내용 main 반영됨 | R0-AN(main 제대로 들어갔는지) 리포트 유실 → 재검증 + 어떻게 main 에 들어갔는지(허브가 러너 폴더에서 머지? · 17:05Z "Merge remote-tracking branch 'origin/main' into HEAD" by hub-runner) 원인 확인 후 PR 닫기 |
| 🔴 손님화면 요구 감사 | **4회 연속 리포트 없이 수 분 만에 done** (R0-1124-AA · M0-1124-L · M3-1124-P · M3-1124-Q) | 러너 로그 `~/.hub-runner/<hub>/<ID>.log` 확인 필요. 감사류만 재현 — 리포트 없이 done 처리되는 러너 판정도 의심("리포트 확인"이라 표기하나 실제 수거 커밋 없음). 같은 현상: M0-1124-L · M1-1124-O · M2-1124-S · M2-1124-T(1차) · R0-1124-AJ · R0-1124-AK · R0-1124-AN · M1-1124-R(단 PR 은 생김) |
| 러너 git | 17:56Z all.json `rebase_in_progress: true` + heartbeat `standalone push 실패` 반복 · claim 경로에 여전히 "rebase + retry" | v8.2 main-guard 가 다음 tick 에 복구하는지 아침에 확인. claim push 도 safe-push 로 바꿔야 함(M1) |

## 검증 프롬프트 결과 (M2-1124-U 실기 리허설 · `m2/M2-1124-U-report.md`)
REHEARSAL PARTIAL — S1 주문번호 코드+단위 PASS(라이브 미실행) · S2 Admin 영수증 탭 playwright 3/3 PASS · S3 Checkout B안 PASS · S4 PS 스크립트 existing[0] 오선택 위험 발견 → #423 으로 수정.

## Kyu 아침 실기 (오케가 self-contained 로 다시 안내할 것)
전제: storeport main(#421) Railway 배포 완료 확인 · POS 앱은 fork master(#252·#253·#254) 반영 빌드.
1. **주문번호** — 태블릿 매장 PIM 선택 확인 → 상품 1개 → Cart → Checkout → Cash → 결제 완료 화면 맨 아래 `Order PIM26B…` · 주문 상세 헤더 아래 번호. 옛 주문(#185 등)은 번호 없는 게 정상.
2. **Checkout B안** — 같은 흐름에서: Cart 버튼 "Checkout" · 합계 아래 Cash/Card/QRIS 3버튼 · 작은 "Pay in parts" · 결제 화면 제목 Cash/Card/QRIS payment · View Cart X 버튼 누르기 쉬움.
3. **Admin 영수증 탭(#422)** — admin.meros.id 시크릿 창 → POS Settings: 탭 General·Tax·Payments·Pre-order·Receipt · 눌린 탭 뚜렷 · 매장 선택 시 General 에 닉네임 편집 · Receipt 탭에 주문번호 형식(닉네임 읽기 전용) · `?tab=order-numbers` → Receipt 로 이동.
4. **PS 매장 dry-run** — #423 머지 뒤. 출력 맨 위 `existing stock locations: 1` 인지 · rename 대상이 "Soopsok Store (Jakarta)" → PIM 인지. Kyu 가 PIM/PS 이름·주소·PS PB1 여부 회신 필요.
5. **ci-watch v2** — #28 머지 뒤 `~/.hub-runner/bin/ci-watch.sh --v2` (아직 미머지).

## 작업 큐 (갱신)
| 순서 | 작업 | 허브 | 상태 |
|---|---|---|---|
| 1 | Kyu 실기 1~3 | Kyu | 아침 |
| 2 | #423 머지 → PS dry-run → apply | 오케→Kyu | CI 확인 |
| 3 | 🔴 손님화면 요구 감사(리포트 유실 원인부터) → 미반영 구현 → 테스트 | M1(원인)→M3 | 막힘 |
| 4 | 러너: 리포트 없는 done 판정 · claim push rebase 잔존 · pane busy | M1 | 신규 |
| 5 | #28 충돌 → 머지 → R8→R9→R10 | M1/M2 | 막힘(pane busy) |
| 6 | POS 라운드 2(손님 번호 상태 칸 6상태 · Ask phone 버튼 삭제) | M3 | 감사 뒤 |
| 7 | 영수증 Round B·B'·C | M3 | PS 뒤 |
