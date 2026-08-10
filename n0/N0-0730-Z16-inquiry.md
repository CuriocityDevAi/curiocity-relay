# N0-0730-Z16 · 심문 (Kyu 판정 회부)

**round**: `N0-0730-Z16`
**timestamp**: 2026-08-10
**scope**: Z16-1 (증식 배치 · 배경 wheel 처리)

---

## Q1. Z16-1 · 배경 wheel (중앙 룰렛) 처리 방식

**Kyu 정본**:
> "기존 배경 룰렛(중앙)은 그대로 유지 + 같은 크기 휠을 N-1개 추가해 총
> 2/3개가 화면에 배치 (겹침 금지·나란히)."

**실측 · 배경 wheel 상태**:

배경 wheel (Modal 안 `WheelStage`) 은 SPIN×N 랜딩 후:
- 회전 정지 · SPIN slice (예: 위쪽 3 시 방향) 에 pin 정착.
- `landingIndex` = SPIN segment index.
- `spinNonce` = 이미 증가한 값 · 회전 완료.

**재-스핀 가능성 판정**:

이 배경 wheel 을 사용자가 "다시 스핀" 하려면:
- (a) `landingIndex` 재-계산 (client random or 서버 seed · points kind).
- (b) `spinNonce++` 로 회전 트리거.
- (c) `handleSpinEnd` 콜백 로직 변경 (SPIN slice 아닌 points slice 처리 ·
  MultiSpin 결과 배열에 편입).
- (d) `WheelStage` press 이벤트 (전역 `startCharge` / `updatePress` / `endPress`)
  가 뷰포트 전체 · MultiSpinStage 안 N-1 wheel 과 이벤트 충돌 방지 필요.

이는 큰 refactor · Modal 안 wheelStage 를 "슬롯 배열 관리" 로 재구성 · press
이벤트를 wheel 별로 분리.

**Z16 MVP (본 라운드)**:
- MultiSpinStage 오버레이 background transparent · pointerEvents none.
- 배경 wheel 은 multiSpinActive 시 opacity 0.2 로 dim · 시각 위계.
- 인터랙션은 MultiSpinStage 안 N 개 wheel 에만.

이는 "겹침 금지" 요구를 위계로 해결 · 실 위치는 겹칠 수 있음.

**판정 요청**:

- **(가)** 배경 wheel 을 slot 0 로 활용 · MultiSpinStage 는 N-1 개만 배치 ·
  wheelStage refactor (재-스핀 가능 · 슬롯 배열 관리) 편입. **Kyu 정본
  완전 실현**. 예상 diff = 300~500 LOC · Z17 라운드.
- **(나)** 배경 wheel 을 완전 unmount (multiSpinActive 시) · MultiSpinStage
  가 N 개 wheel 을 화면에 배치. **"기존 배경 유지" 요구와 어긋남** · 하지만
  시각적으로는 "N 개 wheel 이 화면에" 정합.
- **(다)** 배경 wheel dim (0.2) 유지 (Z16 MVP) · MultiSpinStage 안 N 개
  wheel 이 인터랙션 대상. **참고용 배경** · Kyu 정본 완전 아님. 후속 개선
  가능.

**Claude 의견**: (다) MVP 로 B-9-m 실기 · (가) 완전 구현은 Z17 로 분리 ·
그 사이 (다) 로 사용자 체감 확인. (나) 는 "배경 유지" 요구 어긋나 선택 안 함.

---

## Q2. Z16-1 · 배치 알고리즘 세부

**Kyu 정본**:
> "3개 = 역삼각형 (위 2·아래 1 또는 위 1·아래 2·화면 폭 맞춰 위치·크기
> 미세 조절 허용) / 2개 = 상하 or 좌우 (폭 여유 판단)."

**현행 (Z15-1)**:
- 데스크톱 (≥768px) · flex row · 가로 나열 (2 or 3).
- 모바일 count=2 · flex column · 상하.
- 모바일 count=3 · grid · 위 2 · 아래 1 (역삼각).

**판정 요청**:

- 데스크톱 3 개 = **가로 나열** (현행 · 폭 여유 시) or **역삼각** (모바일과
  통일)?
- 데스크톱 2 개 = **가로 나열** (현행) or **상하** (모바일과 통일)?
- 배경 wheel 위치 (viewport 중앙) 와 겹침 대비 (예: 3 개 역삼각 시 위 2
  wheel 이 배경 wheel 중앙에 부분 겹침) · 위치·크기 조정 정본?

**Claude 의견**: 데스크톱은 현행 유지 (폭 여유 = 가로 나열) · 모바일은 현행
정본 (역삼각/상하). 배경 wheel 겹침은 Q1 해결로 자연 해소.

---

## Q3. Z14-4 fadeout 시각 (B-9-l 유보 · Z16 재확인)

**현행**: JACKPOT payout 시 fadeout = `balance push + 500 + 3000` ms · N=3
시 6.8s.

**B-9-l 실측**: (유보 · Kyu B-9-m 실기 재확인).

**판정 요청** (B-9-m 시):

- 6.8s 충분 · 유지?
- 부족 · 연장 (예: 500 → 1500 · 3000 → 5000)?
- pool 카운트다운은 현행 (즉시) 유지 · 참여자 지갑 카운트업 시각 조정만?

---

## 정리

- **Q1 (배경 wheel 처리)** = Kyu 정본 완전 실현은 Z17 리팩터. 이번 라운드
  MVP = (다).
- **Q2 (배치 세부)** = 현행 유지 or 통일 · Kyu 판정.
- **Q3 (fadeout)** = B-9-m 실측 후 조정.

**본 심문은 B-9-m 실기 진행에는 blocking 아님** · Kyu 실기 후 회부 답변 반영
Z17 착수.
