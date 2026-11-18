# Handoff 2026-11-18 저녁 (16:15 handoff-20261118.md 이후 · 21:20 WIB 기준)

Kyu 17:00 지시: "내가 오늘 작업을 그만하자고 할때까지 자동으로 작업을 돌려줘" → 무응답 자동 종료 없음 · 감시 틱 사슬 + 백업(19/21/23시).

## ⚠️ 현재 상태: Mac 오프라인
- 러너 heartbeat **18:32 WIB 이후 끊김** (Kyu 이동 중 · 노트북 손에 들고 · 배터리 · `pmset disablesleep 1` 적용됨). 오케는 30분 간격 확인 중.
- 재연결 시 먼저: all.json · 각 허브 리포트 · M1 창 상태.

## 결정 (오늘 오후)
- **가게 하루 리허설 먼저 · Wing 준비 뒤로** (Kyu 17:12 "너의 추천에 따름") → `ledger/decision-store-rehearsal-first-20261118.md`
- **클라우드 Linux 점검 하루 3번** (Kyu 17:45 "하루 3번도 가능") — overflow 5건과 별도 · 12/18/02 WIB
- 매니저 PIN: 나중 연결은 PIN 필수 · 모든 PIN 사용 Admin 날짜별 기록 (16:58) → `ledger/decision-cd-ask-phone-20261118.md`
- 시뮬레이터: 아직 미구축 · 오케 권장 = 새 Mac 이후 Android 에뮬레이터 우선(16GB 메모리 부족)

## 머지 (16:15 이후)
storeport #377(R-B2a 경계) · #379(PIN 기록 · 마이그레이션 포함) · #376(손님 화면 페어링 SecureStore + /customer-display/me) · #378(싱크 R1 서버 pos_screen·seq)

## 진행 중 (Mac 끊길 때)
| ID | 내용 | 상태 |
|---|---|---|
| M0-1118-L | 싱크 R2 POS fork (pos_screen upsert · 뒤로=cart_review · 다음 손님 · resync · 나중 연결 PIN) · 작업폴더 ~/curiocity-live/pos-m0 | 11:32Z 시작 |
| M1-1118-K | 가게 하루 리허설 자동 테스트 | 10:13Z 시작 · **90분+ PR 없음 · 러너 60분 상한 안 끊음 = 러너 버그 후보** |
| M2-1118-Q | 클라우드 Linux 점검 → PR #380 올라옴 | 러너상 아직 current |
| M3-1118-H | 와이파이 끊김 중복 주문 막기 (M2-1118-P 진단: 돈 위험 2건 · 정적 분석만) | 10:54Z 시작 |
| R0-1118-Z | fork #191 프린터 리뷰 | 10:54Z 시작 |
| R0-1118-AA / AB (큐) | #381 싱크 R3 리뷰(QRIS 큰 QR·키패드 위 요약 실렌더 확인 핵심) / #380 Linux 점검 리뷰 | 대기 |

## 열린 PR
- storeport #381 싱크 R3 손님 화면 (M0-K · payment_* 가 cart 로 묶였다는 서술 → Kyu 원문 충족 의심)
- storeport #380 linux-check.yml · #373 매장 투입 계획서(M2-O 갱신 · draft 유지) · #369 CI light 분리(Kyu light 실행기 등록 전 머지 금지) · #356 stale
- fork #191 프린터(결제 완료 자동 인쇄 · 실패 시 Retry)

## 다음 라운드 (결과 후)
- #191 머지 뒤: 결제 완료 화면 "손님 화면에 번호 요청" 버튼(진입점 A · PIN 없음)
- R2·R3 머지 뒤: **Kyu iPad 손님 화면 앱 EAS 재빌드 1회(새 아이콘 포함)** + 싱크 실기
- PIN 기록 실기: Admin 매니저 PIN 화면 날짜별 기록(환불 1건 후)
- 리허설 테스트 결과의 버그 목록 처리 → 장애 테스트 → Kyu 실기 리허설 1회 = 매장 투입 판정
- 그 뒤: R-B2b → R-B3 → R-A1 ×4 → R-A2 ×4(Wing 조건)

## Kyu 할 일
1. Mac 인터넷 재연결 · M1 창 상태 확인
2. 작업 마칠 때 `sudo pmset -a disablesleep 0`
3. light 실행기 + fork 실행기 등록 · 프린터 구매 · 계획서 결정 3건(QRIS 1차 방식 · Xendit 인증 시점 · BCA/BRI 신청 시점) · 맥미니 결정

## 다음 ID
M0-1118-M · M1-1118-L · M2-1118-R · M3-1118-I · R0-1118-AC
