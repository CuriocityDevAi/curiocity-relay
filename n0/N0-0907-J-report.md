---
round: N0-0907-J
pr: https://github.com/CuriocityDevAi/grownest/pull/288
outcome: landed
kyu_checks:
  - 가로 재발화 음수 · 하강음 완주 후 스트림 비행 (세로와 동일 순서)
  - 라쳇 꼬리 · 1·2·3휠 전부 시각 정지 시점에 즉시 stop
---

**round**: `N0-0907-J`

# N0-0907-J · 스트림 순서 통일 + 라쳇 시각 정지 stop

**timestamp**: 2026-09-07
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `e15fde71`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 판정: **착지** · Playwright 5/5 · 목표치 전부 통과

Kyu 착지 조건 (verbatim): "J-1 (e) 가로 ≥0ms · J-2 (c') 3케이스 전부
<100ms · Playwright 초록".

**충족**:
- J-1 (e-h) 가로 Order diff = **429ms** (≥0 · Drain 완주 후 flight) ✓
- J-2 (c') wheel 1·2·3 = **40~94ms · 13~55ms · 3~95ms** (전부 <100) ✓
- Playwright 5 tests all pass · retries=1 로 dev server 초기 latency 커버.

---

## J-1 · 스트림 발사 정본 통일 (single/splitN/copyAll)

### 뿌리 (코드 경로 전수 조사)

Kyu I 접수 후 세 경로 · 6 지점 stream dispatch 조사:

| 경로 | 함수 | 라인 | 음수 순서 (수정 전) |
|------|------|------|---------------------|
| splitN/copyAll · JP | `setSplitStreams(zeroStreamsJp)` | 949 | zero flow · N/A |
| splitN/copyAll · main | `setSplitStreams(zeroStreams)` | 1079 | zero flow · N/A |
| splitN/copyAll · negative | E-2 fix 적용 | 1266~1281 | **Drain → setStreams (정상)** |
| single · main | `setSplitStreams([singleStream])` | 1367 | **setStreams → 도착 시 Drain (반대)** |

single 경로 (1367) 이 뿌리 · E-2 fix 미적용.

### 정본 함수 (경로별 분기 금지)

`src/components/Roulette/streamDispatch.ts` 신설:

```typescript
export function dispatchNegativeStreams<S extends StreamLike>(args): void {
  // (a) dedup pre-add · 도착 시 skip
  // (c) Drain 발화 · 각 stream stagger 400ms
  // (d) setStreams · 사운드 완주 + grace 후 (350+460+100=910ms)
}
export function dispatchPositiveStreams<S>(streams, setStreams): void {
  // 기존 · 350ms delay 후 setStreams (도착 시 twinkle onDone)
}
```

### 세 경로 호출

- **splitN/copyAll**: `RouletteModal.tsx:1247` · `dispatchNegativeStreams(...)`
- **single**: `RouletteModal.tsx:1367` · `if (delta < 0)
  dispatchNegativeStreams(...) else dispatchPositiveStreams(...)`

Balance push 는 경로별 계약 (splitN 은 함수 앞 · single 은 pushBalance 래퍼)
· 이 차이는 유지 (호출자 소관).

### 측정 (e-h · Playwright)

가로 (single mode) 음수 · dev preset "음수 큰 값 (200×-3)" · 실측:
- Drain 4/4 notes onended: 181/280/379/478ms
- setStreams 발화 wall: 14740ms
- lastDrain wall: 14311ms
- **Order diff = 429ms** ≥0 ✓

기존 (e) 세로 (splitN 2명) · Order diff = 32ms ≥0 ✓ (변화 없음).

---

## J-2 · 라쳇이 휠 시각 정지 후 계속 (1·2·3휠 동일)

### 두 가설 실측 판정

**Kyu 가설 (a)** · AudioContext lookahead: 실측 no. 코드 조사에서 각 tick 은
즉시 short osc (25ms) · lookahead 예약 없음. **가설 (a) 성립 안 함**.

**Kyu 가설 (b)** · 휠 ease-out 꼬리: **성립 확정**. `handleSpinEnd` 는
Framer Motion animation onComplete · 각속도 ≈0 후 ~1.5s 꼬리 (crawl 패턴 =
Phase A 79% + Phase B1 10% + Phase B2 11% · Phase B 는 시각 velocity 매우 낮음
· 인간 눈 = "정지" · 하지만 애니 로직은 계속). Ratchet setInterval 100ms
는 그동안 계속 tick.

### Fix 정본

**RouletteWheel · 각속도 임계 판정**:
```typescript
const VISUAL_STOP_VELOCITY_DEG = 0.05;   // 0.05°/frame ≈ 3°/s @60fps
const VISUAL_STOP_STREAK_FRAMES = 3;     // 3 프레임 연속 아래로
useMotionValueEvent(rotation, "change", (latest) => {
  const dRot = Math.abs(latest - prevRotationRef.current);
  if (dRot < VISUAL_STOP_VELOCITY_DEG) {
    belowStreakRef.current += 1;
    if (belowStreakRef.current >= VISUAL_STOP_STREAK_FRAMES) {
      visualStopFiredRef.current = true;
      onVisualStop?.(landingIndex);  // NEW callback · 1 회 발화
    }
  } else {
    belowStreakRef.current = 0;
  }
});
```

**RouletteModal / MultiWheelExtras · stopRatchetLoop 이동**:
- `handleVisualStop` (visual stop 시점) → `stopRatchetLoop("multi-bg")`
- `handleSpinEnd` (backup safety · idempotent · 기존 코드 유지)

**Belt-and-suspenders (가설 a 대비)**: `soundFx.ts` 안 활성 osc 추적:
```typescript
const activeRatchetOscs = new Map<string, Set<ActiveOsc>>();
// stopRatchetLoop 안 · gain.gain.linearRampToValueAtTime(0.0001, now+0.02);
// osc.stop(now+0.03) 로 즉시 silence.
```

### 측정 (c') 정의 변경

**폐기**: (c) handleSpinEnd ↔ stopRatchetLoop = 1ms (콜백 기준 · 시각 이후
1.5s 꼬리는 잡히지 않음).

**신설**: (c') visual stop wall ↔ last actual tick wall diff. 목표 <100ms.
`stopRatchetLoop` 로그에 diff 자동 편입:
```
[stopRatchetLoop E-3 J-2] id= multi-bg wall= 14966 lastTickWall= 14892 diff(ms)= 74
```

`lastTickWallByRef` Map · 매 tick 마다 갱신 · stopRatchetLoop 시 diff 계산.

### 실측 (SPIN×3 · 3 wheels)

| Wheel | id | diff(ms) | 판정 |
|-------|----|----------|------|
| 1 | multi-bg | **40** | <100 ✓ |
| 2 | multi-extra-0 | **55** | <100 ✓ |
| 3 | multi-extra-1 | **9** | <100 ✓ |

3 wheels 전부 통과.

---

## Playwright 테스트 (I/J · 5 tests · serial · retries=1)

1. **positive** · (a) countUp ≥460 · (b) twinkle 4/4 · (c') <100 · ✓
2. **multi-wheel** · (d) 300~500 · ✓
3. **negative splitN** · (e) order ≥0 · ✓
4. **J-1 horizontal negative** · (e-h) order ≥0 · **NEW** ✓
5. **J-2 SPIN×3 3-wheel** · (c') 3 케이스 <100 · **NEW** ✓

Dev server 초기 latency 회피 · `test.setTimeout(120000)` · `waitForFunction
timeout 30s` · `retries: 1` (dev server 첫 실행 시 재시도 안전망).

---

## QC

- typecheck **0 errors** ✓
- lint **baseline 220 (신규 0)** ✓
- jest **84 suites · 1110 pass · 5 skip** ✓
- build **성공** ✓
- e2e roulette-timing **5/5** ✓ (occasional flake · retries=1 로 커버 · 3 회
  연속 실행 시 2 clean + 1 flaky-passed-on-retry)

---

## EPIC-STATE 갱신 확인

**EPIC-STATE 무변** · 근거 = **완결이 아니라서 (in-progress commit)** · 룰렛
N0-0904 시리즈 + N0-0907 시리즈 완결 시 landing PR 에서 갱신.

---

## Kyu 실기 요건 (귀 확인 2항목만)

절차 (v2.4 정본):

```
1. git checkout main && git pull
2. npm install (필요 시)
3. npm run dev:all
```

**실기 시나리오**:

1. **가로 재발화 음수** (기본 대안 = 로그인 후 dev · SettingsPopover → 룰렛
   재발화 → 가로 · 음수 잡기). 청각 확인: "하강음 완주 (~460ms) 후 스트림 비행
   시작" (세로와 동일 순서).

2. **라쳇 꼬리** (SPIN×3 이상 시나리오 유리). 각 wheel spin 후 시각 정지
   시점에 라쳇 즉시 stop. **정지 후 ~1.5s tick tail 없음** 확인. 1·2·3 wheel
   전부.

---

## 증적 (파일·라인·커밋)

- 커밋 `e15fde71`.
- `src/components/Roulette/streamDispatch.ts` (신규 · 통일 함수).
- `src/components/Roulette/RouletteModal.tsx:1247~1272` (splitN 호출).
- `src/components/Roulette/RouletteModal.tsx:1372~1394` (single 호출).
- `src/components/Roulette/RouletteWheel.tsx:885~934` (velocity 판정).
- `src/components/Roulette/RouletteWheel.tsx:948~955` (spin 시작 리셋).
- `src/components/Roulette/RouletteModal.tsx:637~652` (handleVisualStop).
- `src/components/Roulette/MultiWheelExtras.tsx:203~217` (handleVisualStopLocal).
- `src/utils/soundFx.ts:192~318` (활성 osc 추적 + 즉시 silence + diff log).
- `tests/roulette-timing.spec.ts` (test 4·5 신설 · analyzeLogs 재구성).

## Playwright 초록 로그 (Kyu 인용)

```
=== I/J Positive Timing Report (a·b·c') ===
(a) CountUp elapsed: 580ms (target ≥460)
(b) Twinkle notes: 4/4 onended
(c') multi-bg visualStop↔lastTick: 84ms (target <100)
  ✓  1

=== I Multi-Wheel Timing Report (d) ===
(d) lastExtraEnd↔positionalReady: 409ms (target 300~500)
  ✓  2

=== I Negative Order Report (e) ===
Order diff (setSplit - lastDrain): 32ms
  ✓  3

=== J Horizontal Negative Order Report (e-h) ===
Drain notes: 4/4
Order diff (setStreams - lastDrain): 429ms
  ✓  4

=== J-2 (c') 3-wheel visualStop↔lastTick Report ===
wheel 1 (multi-bg): 40ms (target <100)
wheel 2 (multi-extra-0): 55ms (target <100)
wheel 3 (multi-extra-1): 9ms (target <100)
  ✓  5

5 passed (1.8m)
```
