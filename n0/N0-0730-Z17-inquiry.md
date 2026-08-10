# N0-0730-Z17 · 심문 (Kyu 판정 회부)

**round**: `N0-0730-Z17`
**timestamp**: 2026-08-10
**scope**: Z17-4 완전 실현 · Z17-1 부수 조사

---

## Q1. Z17-4 · 배경 wheel = slot 0 완전 실현 착수 여부

**Kyu 정본 (Z17-4)**:
> "MultiSpinStage 오버레이 제거. 기존 배경 휠이 slot 0(1번 휠)로 그대로
> 승격·재스핀 가능, N-1개 추가 배치(3=역삼각·겹침 금지·화면 폭 대응).
> dim 배경 방식 기각."

**Z17-4 MVP (본 라운드 착지)**:
- Modal 배경 wheel `multiSpinActive` 시 opacity 0 (완전 hide · dim 방식 폐기).
- MultiSpinStage 안 N 개 wheel 이 슬라이드-인 (좌·우) 으로 등장.
- 사용자 시각 = N 개 wheel 화면 배치 (배경 wheel 자리 = MultiSpinStage 안 idx 0
  wheel · 슬라이드 없이 fade-in).

**완전 실현 (Kyu 정본 100%)**:
- 배경 wheel 을 slot 0 로 활용 · MultiSpinStage 는 N-1 개만 렌더.
- 배경 wheel 재-스핀 가능 = wheelStage refactor 필요:
  - (a) SPIN slice pin 상태 해제 · MULTI_SPIN_ROULETTE_SEGMENTS 로 swap.
  - (b) landingIndex 재-계산 (client random · points).
  - (c) `spinNonce++` 로 회전 트리거 · handleSpinEnd 는 MultiSpin slot 0 결과
    dispatch (SPIN 재-랜딩 무한 loop 방지).
  - (d) press 이벤트 wheel 별 분리 (viewport 전역 → wheel-local).

**예상 diff**: 300~500 LOC · RouletteModal wheelStage refactor + MultiSpinStage
props (skipFirst · slot 0 skip) · handleSpinEnd 분기 재작성.

**판정 요청**:

- **(가)** MVP (Z17-4 opacity 0 hide) 유지 · B-9-n 실기 결과 자연스러움 확인 ·
  Kyu 판정 후 (나) 착수.
- **(나)** Z18 라운드 전용 스코프로 (a)~(d) 착수 · 다른 항 없이 이 하나.
- **(다)** MVP 는 시각적으로 정본 100% (배경 wheel hide + N wheel 슬라이드-
  인 = "총 N 개 wheel 화면 배치") 충족 · 완전 실현 필요 없음 · 여기서 완결.

**Claude 의견**: (가) B-9-n 실기 후 (다) 판정 가능성 · (나) 는 사용자 체감
차이 크지 않으면 스코프 낭비. MVP 로 실기 · 판정.

---

## Q2. Z17-1 · splitStreams curIdx=14 이상값 조사

**Kyu 단서**:
> "콘솔 splitStreams curIdx=14 이상값(seqLen=3) — 뿌리 조사에 편입."

**Claude 조사**:

`splitStreamsDoneCountRef.current` 는 `handleAcceptToWallet` splitN 분기에서
0 리셋 · onAllDone 마다 +1. `curIdx` 는 `superSpinIdxRef.current` (Modal 안
`superSpinIdx` state).

`superSpinIdx` = 0 부터 시작 · super sequence 진행 시 · `splitStreams.onAllDone`
안 `canAdvance` 인 경우 `setSuperSpinIdx((i) => i + 1)` · 다음 스핀 준비 로직.

만약 `curIdx=14` 이면 · setSuperSpinIdx((i) => i+1) 이 여러 번 발화됨을 의미 ·
splitStreams 완료 이벤트가 중복 발화 or MultiSpin 완료 후 재-dispatch flow
안에서 잘못 counter 증가.

**후보 뿌리**:

- (a) MultiSpin 완료 → handleAcceptToWallet 재-dispatch → splitN flow → 스트림
  완료 · setSuperSpinIdx((i) => i+1) 발화. 다음 스핀 · onSpinEnd → 다시 SPIN
  진입 · 반복. 각 사이클마다 superSpinIdx 증가.
- (b) React 18 batching 안 setState functional update 여러 번 dispatch · 실제
  update 는 batch 로 처리 · but 각 setSuperSpinIdx 콜 마다 +1 · 여러 사이클 시
  누적.
- (c) splitStreams onAllDone 이 각 스트림마다 발화 (N 참여자 · N 회 · 마지막에
  만 canAdvance check 하지만 · 조건 문 안 setSuperSpinIdx 호출 정합).

**Kyu 실기 재현** (B-9-n):

- Dev Controller · "●●● (연속스핀)" 프리셋 · SPIN 랜딩 → MultiSpinStage → 완료
  → 담기 → 스트림 완료 후 콘솔 확인:
  ```
  [RouletteModal] splitStreams onAllDone last · seqLen= ... curIdx= ...
  ```
- 정상 = curIdx=0 (super sequence 없음 · MultiSpin 은 single dispatch).
- 이상 = curIdx>0 · super sequence 로 오인 · loop 진입.

**판정 요청**:

- MVP 는 curIdx 이상값 진단만 · fix 는 원인 확정 후 Z18.
- 아니면 예방적 · MultiSpin 완료 후 재-dispatch 시 `superSequenceRef.current`
  null 설정 · loop 진입 방지 · 이번 라운드 착수.

**Claude 의견**: B-9-n 실기 log 확인 후 판정. 코드 상 super sequence 는 슈퍼
빙고 (여러 스피너) 전용 · MultiSpin (SPIN×N 단일 스피너) 과 별개. 만약 loop
발생 시 · super sequence null 설정으로 방어.

---

## Q3. Z17-3 · SPIN 즉시 진입 · dev controller SPIN 프리셋 흐름

**현행**:
- dev controller SPIN×N 프리셋 → Reveal 강제 → Accept → handleAcceptToWallet
  → SPIN 분기 · MultiSpinStage 활성.
- Z17-3 = handleSpinEnd 안 SPIN 분기 신설 · 자연 스핀 (SPIN slice landing) 시
  Reveal skip.
- **Dev controller** 는 여전히 Reveal 경유 · 정합 여부?

**판정 요청**:

- (가) Dev controller 도 SPIN 프리셋 시 · Reveal skip · 즉시 MultiSpin 진입
  (자연 흐름과 통일).
- (나) Dev controller 는 Reveal 경유 유지 (개발자 판정 UX).

**Claude 의견**: (가) 통일 · dev controller 도 정본 흐름 재현하는 게 개발자
에게도 정확한 UX 확인. 코드 diff 소 (Modal onForceReveal 분기).

---

## 정리

- **Q1 (Z17-4 완전 실현)** = B-9-n 실기 후 판정 · MVP 자연스러우면 완결.
- **Q2 (curIdx 이상값)** = B-9-n log 확인 후 fix 여부 결정.
- **Q3 (SPIN 프리셋 흐름 통일)** = 판정 후 Z18 착수 or 이번 라운드 추가.

**본 심문은 B-9-n 실기 진행에는 blocking 아님**.
