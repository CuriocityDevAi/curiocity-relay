# 인수인계 — 2026-11-10 저녁 (17:18 WIB 마감)

**Kyu 17:18**: "오늘 작업은 여기에서 멈추자. 추가 발부 없게. 노트북 닫음. 필요하면 다시 말할게." → 감시 꺼짐 · 새 발부 없음. 아래 "진행 중" 5건은 노트북을 열면 이어서 돎.

새 세션 첫 줄: `CurioCity 오케. relay ledger/open-requirements.md · work-queue.md · 최신 handoff(이 파일) 읽고 현황판부터.`
**주의**: open-requirements.md · work-queue.md 는 11-09 판 — 오늘 결정은 아래 "오늘 결정 파일" 3개에 있음. 새 세션 첫 일 = 두 원장에 합치기.

## 오늘 결정 파일 (Kyu 원문 보존)
- `ledger/decision-p6-20261110.md` — P6 환불·보이드·분할 결제 (Q1~Q5 권장안 · CARD 단말기 VOID/REFUND = PIN 없음 · 실패/CASH/QRIS = 현금 + 매니저 PIN · PIN 4자리 하루 1회 · Admin 표시)
- `ledger/decision-delivery-ui-20261110.md` — 배달·선주문 결제 완료 화면 Hand over 제거 · 서버도 courier 없는 fulfill 거절 · 상태 표시 이름(Awaiting dispatch/pickup · Deposit paid)
- `ledger/device-incidents.md` — 장치 사건 #1~#9 (+ #10~#14 는 아래 메모 · 다음 세션이 표에 추가)
- `ledger/metrics.md` — 3지표

## 실기 통과 (오늘)
#70 결제 완료 영수증 · #72 옵션 차콜 · #73 캡슐 토스트 · #76 남은 토스트 · #205 Fulfill 버그(주문 7개 복구) · #74 · #206+#75 배달 배송지 · #78 Pre-order 픽업 필수.

## 진행 중 (17:18 · 노트북 닫힘)
| ID | 허브 | 내용 | 다음 |
|---|---|---|---|
| M0-1105-AE | M0 | #208 CHANGES(나눠 반품 409 · PIN storeId) | R0 재확인 → #207 머지 뒤 #208 base main · CI |
| M1-1105-AL | M1 | run-all 낡은 어설션 정리 | R0 리뷰 |
| M2-1105-AC | M2(수동) | 러너 v6.6 — 0번 재시작 복구 C-c 금지(입력칸으로 추가 전달함) · 멈춤 감지 · 침범 감지 · stray 격리 | 착지 → 설치 `TARGET=hub-runner-v6.6.mjs FALLBACK=hub-runner-v6.5.mjs` |
| M3-1105-AF | M3 | P6 void/refund 영수증 화면·ESC/POS | R0 리뷰 |
| R0-1105-BB | R0 | #207 재확인 + #79 리뷰(Playwright 직접) | APPROVE 면 #207 머지 · #79 머지 → Kyu 실기(배달 결제 완료 화면 Done · Orders 목록 Awaiting dispatch) |

## 대기 (발부 안 함 · 다음 세션)
- fork #77: **앱이 401/423 키를 `remaining`/`retry_at` 로 맞춰 둠 → 계약 `remaining_attempts`/`locked_until` 로 되돌리기**(R0-BA CHANGES · 원인 = 오케가 M3-AE 에 "서버 실제 코드에 맞춰" 지시 → 서버가 틀린 쪽이었음).
- 서버: delivery 주문 courier 없는 fulfill(hand_over 포함) 400 (M0 · #208 뒤).
- 앱: 주문 **상세**에 상태 표시 이름 적용(M1-AK 의 lib/order-status-label · M3 · #77 뒤).
- P6 3차: 분할 결제 2 tender(tenders route) · P6 앱 반품 품목 선택 화면.
- R0: M3-AF · M1-AL 리뷰.

## 열린 PR
storeport #207(재확인 중) · #208(stacked · CHANGES 수정 중) · fork #77(CHANGES) · #79(리뷰 중).

## 러너
v6.5 가동(curiocity-relay · 5초 로컬 착지 감지 · 큐 30초 · state.json = runner-status 브랜치). M3 기본 모델 sonnet(17:09). 루트 `claims/` 는 .gitignore.

## device-incidents 추가할 것 (#10~#14)
- #10 16:22~16:29 R0 가 루트 claims/R0-1105-AW·AX.json → pull 7분 차단 → .gitignore `/claims/` + Kyu stash.
- #11 16:54 M2 파일 통째 재작성 → 출력 한도 32000 "API Error" → cp+Edit 지시(Kyu 입력).
- #12 16:56 M3 "커밋·push 승인 없이"를 승인 필요로 오독 → 문구 "묻지 말고 바로 실행"으로 변경 + Kyu 입력.
- #13 16:55~16:59 M2 가 러너 폴더에 v6.5 작성 → pull 4분 차단.
- #14 17:06 v6.5 재시작 복구가 옛 started M0-1105-AB 를 timeout + M0 칸 C-c(피해 없음) → M2-AC 0번.
- 오케 실수 3회: 끝난 허브를 '진행 중'으로 표기(16:23 M1 · 16:41 M0 · 16:44 M1) → 표 쓰기 직전 commits 재조회 규칙.

## 토큰 절약 (Kyu 17:09 승인 · 적용됨)
오케 창 길어지면 하루 중에도 handoff 후 새 창 · 감시 = Kyu 15분 조용할 때만 · 허브 /loop·예약 깨우기 금지 · M3 기본 sonnet · 오케는 판정 줄만 읽기. 주간 사용량 17:05 기준 19%.
