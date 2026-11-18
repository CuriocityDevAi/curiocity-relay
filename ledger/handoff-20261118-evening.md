# Handoff 2026-11-18 저녁~밤 (00:30 WIB 11-19 기준 갱신)

Kyu 17:00 지시: "내가 오늘 작업을 그만하자고 할때까지 자동으로 작업을 돌려줘" → 아직 "그만" 없음 · 감시 틱 사슬 30분 간격(Mac 오프라인 중).

## ⚠️ 현재 상태: Mac 오프라인 (2회째)
- 1회: 18:32~21:48 WIB · 2회: **23:28 WIB 이후 heartbeat 없음**. 재연결 시 all.json · 리포트 · 미수령 큐 확인.
- Kyu 마칠 때: `sudo pmset -a disablesleep 0`

## 결정 (오늘 오후·밤)
- 가게 하루 리허설 먼저 · Wing 준비 뒤로 (17:12) → `ledger/decision-store-rehearsal-first-20261118.md`
- 클라우드 Linux 점검 하루 3번 (17:45) — #380 머지
- **가벼운 실행기 추가 등록 + 바쁠 때 클라우드로 넘기기 둘 다** (22:36 "둘다 하자") — Kyu 실행기 등록 진행 중(다운로드·config 명령 안내됨 · `~/actions-runner-light` · 라벨 curiocity-mac-light · svc install/start) → 완료 확인 후 #369 머지 → overflow 구현 라운드
- Kyu 질문 22:23 (허브 수 · R0 클라우드 · CI 조회): 오케 권장 = Mac 허브 증설 반대 · 클라우드로 확장(R0 먼저) · CI 상태는 러너가 relay 로 올리는 A안 — **Kyu 결정 대기: R0 클라우드 시험 / CI 상태 A안**
- 디스크: Avail 26GB(926GB 중) — du 결과 대기 → 정리 제안 필요

## 머지 (오늘 저녁 이후)
storeport #377 #379 #376 #378 #380 #381 #382 · fork #191(프린터) #193(싱크 R2)
→ **손님 화면 페어링+싱크 R1~R3 전부 머지** → Kyu iPad 손님 화면 앱 EAS 재빌드 1회 + 실기 대기

## 열린 PR / 진행
| 대상 | 상태 | 다음 |
|---|---|---|
| storeport #383 리허설 테스트 + 교대 마감 현금(BUG-D/B) | R0-1118-AH 진행 중(23:29) | APPROVE → 머지 · draft 해제 |
| storeport #384 반품 필드명 정규화 | APPROVE · rebase 됨 · **미해결 스레드로 머지 막힘** | R0-1118-AH 가 스레드 해결 → 머지 |
| fork #192 중복 주문 막기 | R0-AG: 로직 OK · #193 과 충돌 | **M3-1118-K(미수령)** rebase → R0-1118-AJ 충돌 hunk 확인 → 머지 |
| fork #194 프린터 후속 | R0-1118-AI 큐 | |
| M0-1118-N 결제 완료 "Ask phone on display"(진입점 A) | 진행 중 | |
| M1-1118-N 다음 손님 즉시 비움 | 진행 중 | |
| M2-1118-V R-B3 | 진행 중 | |
| #369 CI light 분리 | APPROVE | light 실행기 등록 후 머지 |
| #373 매장 투입 계획서 | draft | Kyu 결정 3건 |

## 리허설이 찾은 것
- BUG-D 교대 마감 expected_cash 현금 매출 미집계 · BUG-B by_payment_method 없음 → #383
- BUG-C "완료 주문 404" = 테스트 방식 문제 · 반품 필드명 정규화는 안전장치(POS 는 원래 line_item_id) → #384
- CI: 실행기 running · queued 11 · 최장 252분 · 실패 0 (22:30 기준)

## Kyu 할 일
1. Mac 재연결 2. light 실행기 등록 마무리(`./svc.sh status`) 3. du 결과 4. iPad 손님 화면 앱 재설치(안내 대기) 5. 결정: R0 클라우드 · CI 상태 A안 6. 프린터 구매 · 계획서 결정 3건 · 맥미니 7. 마칠 때 `sudo pmset -a disablesleep 0`

## 메모
- 러너 60분 상한이 오프라인 중엔 안 끊기고 복귀 후 작동(벽시계 아닌 깨어있는 시간 기준 추정)
- customer-display app.config `orientation: "landscape"` 고정 — Kyu "세로도 문제없게" 와 해석 확인 필요(회전 허용 여부)

## 다음 ID
M0-1118-O · M1-1118-O · M2-1118-W · M3-1118-L · R0-1118-AJ
