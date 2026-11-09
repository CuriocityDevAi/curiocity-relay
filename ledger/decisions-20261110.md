# 결정·착지 덧붙이기 · 2026-11-10 (주 1회 open-requirements 로 정리)

## Kyu 결정 (11-10 04:54 · handoff-20261110 §0 이관)
- 감시 = Kyu 작업 중일 때만 **20분** 간격 · 마지막 메시지 후 30분 무응답 자동 정지 · "감시 켜/꺼". 세션 시작 시 꺼짐.
- **M1 = Sonnet**(runner-config 반영) · Opus = M0/M3 코딩만 · R0/M2 Sonnet.
- 오케 창 매일 새로 엄수.
- 원장 갱신 = 큰 파일 통째 재작성 금지 → `ledger/decisions-<날짜>.md` 덧붙이기 · 주 1회 open-requirements 정리.
- 사용량 추적: 11-09 11:18 = 4% → 11-10 04:54 = 9% (하루 ~7% 페이스 · 예산 하루 14% 안쪽).

## Kyu 결정 (11-10 05:15~05:39)
- 선택 칩 색 = `#3F3F3F` 그대로(대안 기각) → #68 머지(3baaac0) · iPad 실기 대기.
- **상태판 v2 (Kyu 원문 요지: "상태판이 현상태를 잘 표현 못함 · 키보드(⌘⇧< >)로 한 단계씩 과거/이후 상태 · 움직인 카드 반짝 · 길고 부드러운 애니")** · 순서 A(실시간 반영 먼저) · "대화창이 아니라 상태판에 넣어라".
  - 원인 실측: ① 상태판의 relay 읽기(fetch raw.githubusercontent)는 페이지 CSP 로 처음부터 막혀 한 번도 동작 안 함 ② 오케가 머지 뒤 카드 닫기 누락(5건) ③ 오케가 모르는 상태명(started/reviewing) 기록.
  - v2 배포(1794264222-53c7): GitHub 커넥터(mcp)로 relay `status/hubs.json` + `status/claims` 커밋 1분 주기 · 허브 지금 줄(어긋남 노란 표시) · 변경 기록(카드 시각 + relay claim 커밋) · 시간 이동 ◀▶/⌘⇧,./←→/Esc · 마지막으로 본 뒤 변경 재생 · FLIP 이동 1초 + 빛남 + 옛 자리 점선 · 모르는 상태 빨강.
  - 오케 규칙: 카드 state 는 issued/copied/running/blocked/landed/review/merged/testing/done/dropped 만 · 상태 바꿀 때 해당 시각 필드(started_at·landed_at·review_at·merged_at·done_at·blocked_at)도 함께.

## 착지 (05:10 WIB 실측)
- **M1-1105-AC** → fork PR #68 (21:38Z) · 차콜 칩 · 피커 머리줄 20/600. → R0-AN APPROVE → 머지 3baaac0.
- **M2-1105-U** → 러너 v6.1 신파일 · 교체 대기. 중복 Hubs 탭 16·18·19·20 닫기 · 17 유지.
- 러너 신규 버그: 대화형 claude 가 안 닫힌 칸에 다음 명령을 타이핑(가짜 시작) → **M2-1105-V**(수동 · 진행 중).
- **M3-1105-Y** → PR #69 (선주문 Pay 하단 고정) → **R0-1105-AO**(relay `manual/r0/` · 러너 우회 수동 투입).
- 후속 후보 2i: OptionPicker/SizePicker/ColorPicker bg-ink(R0-AN §4) · FulfillSheet.tsx:11 주석.
