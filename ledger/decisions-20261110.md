# 결정·착지 덧붙이기 · 2026-11-10 (주 1회 open-requirements 로 정리)

## Kyu 결정 (11-10 04:54 · handoff-20261110 §0 이관)
- 감시 = Kyu 작업 중일 때만 **20분** 간격 · 마지막 메시지 후 30분 무응답 자동 정지 · "감시 켜/꺼". 세션 시작 시 꺼짐.
- **M1 = Sonnet**(runner-config 반영) · Opus = M0/M3 코딩만 · R0/M2 Sonnet.
- 오케 창 매일 새로 엄수.
- 원장 갱신 = 큰 파일 통째 재작성 금지 → `ledger/decisions-<날짜>.md` 덧붙이기 · 주 1회 open-requirements 정리.
- 사용량 추적: 11-09 11:18 = 4% → 11-10 04:54 = 9% (하루 ~7% 페이스 · 예산 하루 14% 안쪽).

## Kyu 결정 (11-10 05:15~05:39)
- 선택 칩 색 = `#3F3F3F` 그대로(대안 기각) → #68 머지(3baaac0) · iPad 실기 ✓(10:33).
- **상태판 v2 (Kyu 원문 요지: "상태판이 현상태를 잘 표현 못함 · 키보드(⌘⇧< >)로 한 단계씩 과거/이후 상태 · 움직인 카드 반짝 · 길고 부드러운 애니")** · 순서 A(실시간 반영 먼저) · "대화창이 아니라 상태판에 넣어라".
  - 원인 실측: ① 상태판의 relay 읽기(fetch raw.githubusercontent)는 페이지 CSP 로 처음부터 막혀 한 번도 동작 안 함 ② 오케가 머지 뒤 카드 닫기 누락(5건) ③ 오케가 모르는 상태명(started/reviewing) 기록.
  - v2 배포: GitHub 커넥터(mcp)로 relay 읽기 · 허브 지금 줄 · 변경 기록 · 시간 이동 ◀▶/⌘⇧,./←→/Esc · 재생 · FLIP 이동 + 빛남 + 옛 자리 점선 · 모르는 상태 빨강.
  - **v2.1 (13:52 Kyu "허브 지금과 칸반이 안 맞음")**: 원인 = 허브 지금이 `status/hubs.json`(claim.mjs 거칠 때만 재생성 · 11:30 이후 낡음)을 봄 → 폐기 · **기준 = 허브별 최신 claim 커밋과 그 카드 중 앞선 단계**(위·아래 동일) · 어긋남은 신호가 카드보다 앞설 때만.
  - 오케 규칙: 카드 state 는 issued/copied/running/blocked/landed/review/merged/testing/done/dropped 만 · 상태 바꿀 때 해당 시각 필드도 함께.

## Kyu 결정 (11-10 10:33~14:02)
- iPad 실기 1~9 통과(#68 칩 · #69 선주문 Pay · 피커) · **10 버그: Fulfill/Hand over 해도 Not fulfilled**.
- **결제 완료 화면**: 영수증을 Order 상세 영수증과 같은 크기·형태(가운데 · 넓게)로 통일 · Hand over/Reprint/Share/View order 는 영수증 아래 가운데(스크롤해서 만남 · 영수증 재확인 취지) → 11-09 '2열/하단 고정 바' 대체 → M3-1105-AA · PR #70.
- **토스트**(Hand over 뒤 잠깐 뜨는 알림)가 흰 화면에 묻힘 → **A안**: 위 가운데 어두운 캡슐(ink 배경 · 흰 글자) · 아이콘 색으로만 결과(성공 초록 ✓ · 실패 빨강 ! · 안내 회색 i) · 스프링 · 2.5초 · 위로 밀어 닫기 · sonner-native 검토 → M3-1105-AB.
- Expo QR 스캔 번거로움 → 임시: 터미널 `r` · Expo Go 최근 목록 · `exp://<Mac IP>:8081` 바로가기 · 근본 = EAS 개발용 빌드(M2-1105-Y 사전 준비).
- **Apple 개발자 등록**: Kyu 14:02 Apple 통화 — 여권 재제출 누락이 원인 · 하루이틀 내 해소 예상.
- macOS "cmux would like to access data from other apps" → 허용 안 함 · 허브 금지 목록에 다른 앱 데이터(~/Library/Containers · Group Containers) 추가.
- **Kyu 14:02: 놀고 있는 허브가 최소화되도록 필요한 프롬프트는 오케가 자동 발부 · Kyu 테스트할 것은 오케가 먼저 알려줌.**

## 착지·원인 (11-10)
- **Fulfill 뿌리(R0-1105-AQ)**: manual fulfillment provider 미등록 → fallback createFulfillment 실패(숨김) → 그래도 handed_over_at 기록 → 이후 멱등 가드가 "이미 됨"으로 영구 고착. (R0-AP 는 로컬 storeport clone 이 낡아 '#200 미배포'로 오판.) → **M0-1105-Y**(provider 등록 · 성공 때만 handed_over_at · 가드 = packed_at+fulfilled · 복구 도구 repair-stuck-fulfillments) · medusa-config 는 provider 1건만 예외.
- **러너**: v6.1(절대경로 · 안 닫힌 Claude 처리) → 첫 실전에서 ① 교체 직후 옛 lock 10분 ② M3 칸 pane busy ③ relay 작업트리 더러움(러너 자신의 claim 파일)으로 신호·pull 실패 ④ 리포트 파일만 보고 done+끊기(허브 push 전 종료) → **v6.2**(M2-1105-X · 13:52 Kyu 교체): lock pid 확인 · pane busy 1회 자동 재시도 · autostash · 완료 = origin/main 에 리포트 push 확인 · 자연 종료 대기.
- 허브 착지 규칙(11-10~): 리포트는 /tmp 에 쓰고 마지막 한 명령으로 cp+commit+push.
- 자동 발부(14:03): M1-1105-AD(옵션·사이즈·색 고르기 차콜) · M2-1105-Y(EAS 사전 준비) · M3-1105-AB(토스트) · R0-1105-AR(#70 리뷰) · M0-1105-Y(Fulfill 수정).
