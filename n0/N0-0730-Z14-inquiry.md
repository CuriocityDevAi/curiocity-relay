# N0-0730-Z14 · 심문 (Kyu 판정 회부)

**round**: `N0-0730-Z14`
**timestamp**: 2026-08-09
**scope**: Z14-1 (WheelStage N 개) · Z14-2 (wheel slice SVG)

---

## Q1. Z14-1 · WheelStage N 개 배치 · refactor 범위 판정

**Kyu 지시**:
> "★ 다중 룰렛 = 본 휠 N개 (MultiSpinStage 미니 원반 전면 폐기)"
> "이미 다 구현돼 있으니 갯수만 늘리고 계산만 뒤로"

**실측 · WheelStage 재사용 난도**:

WheelStage 는 `RouletteModal.tsx` 안에 정의된 **내부 helper function** 이며 ·
독립 컴포넌트가 아님 (별도 파일 없음). 아래 상태·refs·이벤트 를 부모 (Modal)
에서 주입 받음:

- `spinNonce` (전역 · Modal 이 press/swipe endPress 로 증가).
- `spinPower` (전역 · endPress 계산).
- `landingIndex` (전역 · 서버 seed or 강제).
- `chargeStartTs` (전역 · press 진행률 배너).
- `handleSpinEnd` (전역 · Reveal 진입 로직).
- press/swipe 이벤트 = 뿌리 화면 (Modal viewport) 전체 · 개별 wheel 아님.
- 위치 = `position: absolute; inset: 0; display: flex` · viewport 채움.

**N 개 배치 refactor 규모**:

- (A) **WheelStage 분리 & prop 확장** · 별개 파일 · `layout='inline'` prop ·
  각 인스턴스 own spinNonce · spinPower · landingIndex · handleSpinEnd.
- (B) **press/swipe 재작성** · viewport 전역이 아닌 개별 wheel 안 · Modal
  의 pressStartRef 재구성.
- (C) **MultiSpinStage 재작성** · N WheelStage 인스턴스 flex/grid 배치.
- (D) **Modal handleSpinEnd 분기** · 어느 wheel 이 완료됐는지 트래킹 ·
  N 개 완료 후 합산 카드 → 재-dispatch.

예상 diff = 400~600 LOC · RouletteModal.tsx / MultiSpinStage.tsx / WheelStage.tsx (신설).

**판정 요청**:

- **(가)** 위 refactor (A)~(D) 전량 실행 · 별건 라운드로 나눠 진행 (Z14-1a
  분리 · Z14-1b press · Z14-1c multi · Z14-1d 합산)?
- **(나)** Z14 라운드는 Z14-3/4 concrete + Z14-2 wheel slice SVG 만 진행 ·
  Z14-1 은 **다음 라운드 (Z15) 전용 스코프** 로 분리?
- **(다)** MultiSpinStage 유지 · WheelStage 재사용 규모 축소 (예: **동일한
  wheel SVG** 만 재사용 · press 이벤트는 각 wheel 로컬 · Modal 은 결과만 수신)?

**Claude 의견**: (나) 권장. Z14-1 은 refactor 규모가 크고 · press 이벤트
분리는 별건 리스크. Z15 로 분리해 spec 을 먼저 짓고 (WheelStage prop 계약 ·
press 이벤트 분리 방식) 착수.

---

## Q2. Z14-2 · wheel slice SVG · label marker 방식

**Kyu 지시**:
> "미니 룰렛 아이콘 전면 적용 (점 fallback 기각·갭A):
>  휠 슬라이스·컨트롤러·결과 카드 전부 **진짜 미니 룰렛 SVG 그림**"

**실측 · CanonicalSlice label 렌더**:

CanonicalSlice 는 SVG `<text>` 로 label 렌더 (RouletteWheel.tsx). String
label 만 지원 · React child (JSX SVG element) 미지원.

**SVG 아이콘 편입 옵션**:

- **(가) marker string 방식** · label = `"__SPIN2__"` · `"__SPIN3__"` ·
  CanonicalSlice 안 marker 감지 시 `<g><MiniRouletteDiscSvg /></g>` 렌더.
- **(나) label 타입 확장** · `label: string | { type: 'icon'; kind: 'spin'; count: number }`
  · CanonicalSlice 안 discriminated union 렌더.
- **(다) 별도 render prop** · `renderCustomLabel?: (label: string) => ReactNode`
  · defaultRouletteConfig 에서 SPIN 라벨 오버라이드 렌더.

**Claude 의견**: (나) label 타입 확장 · 정본. 하지만 CanonicalSlice 와 그
호출부 전량 (RouletteWheel · defaultRouletteConfig · MultiSpinStage) 수정
필요 · 예상 diff = 150~200 LOC. Reveal / MultiSpinStage / Controller 는
이미 MiniRouletteIcon SVG 사용 중 (Z13-0) · wheel slice 만 남은 상태.

**판정 요청**:

- 방식 (가) / (나) / (다) 중 선택.
- 이번 라운드 (Z14) 착수 · 다음 라운드 (Z15) 분리 · 심문 대상 없음 어느 것.

---

## Q3. Z14-3 · zero 정산 붉은 하트 · Kyu 실측 경로 확인

**Kyu 지시**:
> "재발 방지: 실 브라우저 발화 증적 (스크린샷/녹화 급 로그) 리포트 필수 —
>  '코드에 있음' 서술 금지·'화면에 나옴'만 인정"

**Claude 조사 · 코드 상 경로**:

`handleAcceptToWallet` 진입 즉시 · **twinkle 12번 발화** (~500ms · 40ms
stagger) 가 delta 판정 이전에 발동돼 있었음. JACKPOT/SPIN/zero/negative
모든 케이스에서 축하 사운드 발화 · Kyu "띠리리링" 관찰 = twinkle 로 추정.

**Z14-3 fix (적용됨)**: twinkle 발화를 delta 계산 후로 이동 · `willTwinkle
= !isJackpot && !isSpin && delta > 0` 조건. positive 정산 시에만 발동.

**Kyu 실측 요청**:

- 이번 Z14 라운드 실기 시 · 정산 0 케이스 재현 → 사운드가 **툭** (playZeroDrop
  90Hz) 만 나는지 확인. 붉은 하트 / 띠리리링 여전 시 · 세 가지 소스 candidate:
  - **(a) Reveal 안 HeartParticles** · particles skip 조건 (`result.total.kind
    === "points" && result.total.n === 0`) 미충족 케이스가 있는지.
    실측 시 · Reveal 카드가 mount 상태로 남았는지 (Modal setRevealData(null)
    이 setState 반영 delay 로 인해 particles 마운트).
  - **(b) 다른 사운드** · playAgainWhoosh · playJackpotFanfare 등 잔여
    사운드 · zero 케이스에서 잘못 발화.
  - **(c) 정산 결과가 실제로는 0 이 아님** · SPIN×N 합산이 우연히 0 · 각
    개별 스핀은 음수/양수 · negative flow 진입 (붉은 하트 = negative sign
    color "#FCA5A5").

- Kyu 판정: Z14-3 fix 로 재현 소멸 여부 · 소멸 시 완결 · 잔존 시 (a)/(b)/(c)
  중 어느 소스인지 실측 후 Z15 로 회부.

---

## Q4. Z14-4 · fadeout 지연 spec 확인

**Claude fix (적용됨)**:

- balance push 시각 = `(N-1) × 350 + 2600` ms (스트림 stagger + max distance
  duration).
- scheduleFadeout = `balance push + 500 (count-up) + 3000 (관찰 · X-1)` ms.
- 예 · N=3 참여자 시 = 700 + 2600 + 500 + 3000 = 6800ms · 스핀 완료 → 페이드
  아웃까지 ~6.8s.

**Kyu 판정 요청**:

- 6.8s 는 "받는 기쁨 시간" 으로 충분한가 · 더 늘려야 하는가?
- 잭팟 poolBalance 카운트다운은 즉시 (payout success 시점) · 참여자 지갑
  카운트업 시각과 상이. poolBalance 카운트다운도 스트림 도착 시로 지연할지?

---

## 정리

- **Z14-3 / Z14-4** = concrete fix 완료 · 이번 라운드 실기 대상.
- **Z14-1 / Z14-2** = Kyu 판정 회부 (Q1 / Q2 위) · 판정 후 스코프 결정.

**본 심문은 Z14 실기 진행에는 blocking 아님** · Kyu 실기 (Z14-3/4 재현) 병행
가능. 회부 답변은 Z14 리포트 종결 이후 Z15 착수 시점 참조.
