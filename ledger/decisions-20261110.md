# 결정·착지 덧붙이기 · 2026-11-10 (주 1회 open-requirements 로 정리)

## Kyu 결정 (11-10 04:54 · handoff-20261110 §0 이관)
- 감시 = Kyu 작업 중일 때만 **20분** 간격 · 마지막 메시지 후 30분 무응답 자동 정지 · "감시 켜/꺼". 세션 시작 시 꺼짐.
- **M1 = Sonnet**(runner-config 반영) · Opus = M0/M3 코딩만 · R0/M2 Sonnet.
- 오케 창 매일 새로 엄수.
- 원장 갱신 = 큰 파일 통째 재작성 금지 → `ledger/decisions-<날짜>.md` 덧붙이기 · 주 1회 open-requirements 정리.
- 사용량 추적: 11-09 11:18 = 4% → 11-10 04:54 = 9% (하루 ~7% 페이스 · 예산 하루 14% 안쪽).

## 착지 (05:10 WIB 실측)
- **M1-1105-AC** → fork PR #68 (21:38Z) · 선택 칩 차콜 `#3F3F3F`+흰 글자+semibold · 피커 머리줄 20/600 통일 · 어설션 46/46 · playwright 22/22. handoff 의 "멈춤"은 오기 — 실제로는 04:41 착지. 후속 후보: OptionPicker/SizePicker/ColorPicker 도 아직 ink 선택(파일 3개 · 별 라운드).
- **M2-1105-U** → relay `scripts/hub-runner-v6.1.mjs` (절대경로 · 재시작 시 60m 고착 복구 · Hubs 탭 재사용) · 셀프테스트 3/3. 교체 = 전 허브 idle 때 Kyu `cd ~/projects/relay-m1 && bash scripts/hub-runner-install.sh`. 중복 Hubs 탭 16·18·19·20 닫기 · 17 유지. 상태판 자동 반영 = 러너는 claims push 까지 · 상태판이 `status/hubs.json` 1개를 폴링하는 안(b) 권장.
- **R0-1105-AM** done (21:41Z).
- 진행 중: **M3-1105-Y** (Pre-order 선택 시 Pay 버튼 없음 · 21:51Z 시작).
