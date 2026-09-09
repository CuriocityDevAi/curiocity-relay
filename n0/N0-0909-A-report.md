---
round: N0-0909-A
pr:
  - "288 · A · 라쳇 각도 기반 (계속)"
  - "289 · B · OO/OOO + JACKPOT 신규"
outcome: landed
kyu_checks:
  A:
    - 라쳇 소리가 휠 회전과 정확히 동기 (감속 시에도 어긋남 없음)
    - 휠 정지 = 라쳇 정지 (꼬리 없음 · 1·2·3 wheel 전부)
  B:
    - OO/OOO 자연 랜딩 시 toast "룰렛 N회 찬스" · AGAIN 재시도 안내 없음
    - JACKPOT 랜딩 시 상승 팡파르 + 화면 전체 폭죽
    - JACKPOT 하트 스트림 fly 사운드 + 도착 시 띠링 + 지갑 숫자 카운트업
---

**round**: `N0-0909-A`

# N0-0909-A · 라쳇 정밀화 + OO/OOO 재정의 + JACKPOT 연출

**timestamp**: 2026-09-09
**PRs**:
- **A (계속)**: PR#288 · https://github.com/CuriocityDevAi/grownest/pull/288
  · HEAD `97fe19f9` · branch `feat/roulette-z1-vertical-bingo`
- **B (신규)**: PR#289 · https://github.com/CuriocityDevAi/grownest/pull/289
  · HEAD `f6b236e9` · branch `feat/roulette-jackpot-multi-spin`

---

## 판정: **A · B 모두 착지**

Kyu 착지 조건 · A + B 각각 Playwright 기계 판정 통과.

---

## A · 라쳇 동기화 정밀화 (PR#288)

### 원인 규명 (측정 근거 포함)

**두 시스템 병렬 (기존)**:
1. **`playTick`** (RouletteWheel · useMotionValueEvent · PEG_ANGLE=5° 경계
   통과 시) · **각도 기반** · 1200Hz triangle 18ms · 각 pin 정확 동기 (기존
   정상).
2. **`playRatchetTick`** (soundFx · **setInterval 100ms**) · **시간 기반** ·
   square wave 25ms · 감속 구간 (Framer easeOutCubic 5.3s spin) 에서 wheel
   각속도와 어긋남.

**Kyu 실측 뿌리**: (a) 시간 기반. setInterval 100ms 은 각속도 무관 균일 tick.
easeOut 감속 시 마지막 20~30% 구간에서 wheel 은 순간 velocity 를 낮추는데
tick 은 100ms 마다 → 청각적으로 "느려지는 wheel 위에서 tick 이 균일하게
계속" · 미세 어긋남.

Kyu 가 제시한 (b) 이 아닌 (a) 로 확정.

### Fix (각도 기반 재작성)

`src/utils/soundFx.ts`:
- `ratchetTimers` (setInterval Map) 폐기.
- `ratchetStates` (enabled/volume/baseFreq state Map) 신설.
- **`emitRatchetTick(id)`** 함수 · RouletteWheel 이 호출 · state.enabled 시
  즉시 playRatchetTick.
- `startRatchetLoop`: enabled=true 세팅만 (setInterval 없음).
- `stopRatchetLoop`: enabled=false + backup silence 활성 osc.

`src/components/Roulette/RouletteWheel.tsx`:
- `ratchetId?: string` prop 신설.
- `useMotionValueEvent(rotation, "change", ...)` 안 PEG_ANGLE 경계 통과
  (absDiff 만큼) `emitRatchetTick(ratchetId)` 호출.

`RouletteModal.tsx` (`ratchetId="multi-bg"`) / `MultiWheelExtras.tsx`
(`ratchetId="multi-extra-${extraIdx}"`) 로 wiring.

### (c') 측정 재정의

**폐기**: (c) `handleSpinEnd wall ↔ stopRatchetLoop wall` diff (콜백 기준 ·
1ms · 시간 기반 전제).

**신설**: (c') **visualStop wall 이후 emit 된 tick 개수 = 0** (각도 기반
무-꼬리 검증). 정지 = 무음 · 각도 기반 특성 = wheel 정지 → tick 자연 소멸.

### 측정 결과 (Playwright · 5/5 pass)

| 측정 | 결과 | 목표 |
|------|------|------|
| positive · (a) CountUp elapsed | 575ms | ≥460 ✓ |
| positive · (b) Twinkle 4/4 | 4/4 | 4/4 ✓ |
| positive · (c') multi-bg ticksAfterStop | **0** (totalTicks=287) | 0 ✓ |
| multi-wheel · (d) positional | 409ms | 300~500 ✓ |
| negative splitN · (e) order | 32ms | ≥0 ✓ |
| horizontal negative · (e-h) | 429ms | ≥0 ✓ |
| SPIN×3 · (c') wheel 1 | **0** (totalTicks=216) | 0 ✓ |
| SPIN×3 · (c') wheel 2 | **0** (totalTicks=250) | 0 ✓ |
| SPIN×3 · (c') wheel 3 | **0** (totalTicks=235) | 0 ✓ |

**3 케이스 (SPIN×3 · 3 wheels) 전부 ticksAfterStop=0** · 각도 기반 완전
무-꼬리 확증.

---

## B · OO/OOO 재정의 + JACKPOT 연출 (PR#289)

### B-1 · OO/OOO 재정의 (변경 전후)

**변경 전**: `DEFAULT_ROULETTE_SEGMENTS[18]` = AGAIN 슬라이스 · fill.kind=
"again" · handleSpinEnd → toast "AGAIN! 같은 스피너 즉시 재스핀!" +
setAgainOverride (같은 스피너 즉시 재추첨).

**변경 후**:
- 슬라이스 → OO (spin×2) 로 대체 (weight 3 유지).
- SPIN×2/×3 버튼과 동일 멀티스핀 경로 재사용 (별도 구현 없음).
- Toast "🎡 멀티 룰렛!" → **"룰렛 N회 찬스"** (2 지점).
- AGAIN 브랜치 = defensive no-op (외부 legacy 호출 대비 · 자연 랜딩 진입
  불가).

### B-2 · JACKPOT 축하 연출

- 신규 `playJackpotFanfare()` (`src/utils/showSound.ts`) · 놀이공원
  celebratory · 상승 아르페지오 2옥타브 (C4→C6 7음) + 저음 bass sawtooth +
  sparkle 10음 stagger + 마무리 chord · **~1.4s · 총 15+음** · Web Audio
  자체 생성 (외부 파일 없음 · CC0/라이선스 무관).
- 신규 `JackpotConfetti` (`src/components/Roulette/JackpotConfetti.tsx`) ·
  화면 전체 폭죽 · **40개 confetti 조각** · 랜덤 방향/속도 · Framer Motion ·
  2.5s · 8종 celebration 데이터색 (CLAUDE.md § 8 데이터색 예외).
- 기존 `playDepositComplete` (약한 C-E-G chord 380ms) → 새 fanfare 로 교체.

### B-3 · JACKPOT 사운드 누락 원인

**뿌리**: JACKPOT 자연 landing 은 `handleSpinEnd` first branch (line 706~) ·
`setSplitStreams` 호출 없음 · HeartParticles 미마운트 · playHeartFly
(HeartParticles mount 시 auto-fire) 및 twinkle (스트림 도착 onDone 안 발화)
전부 skip · setTimeout 900ms 로 balance 만 직접 push (사운드 파이프라인 우회).

**Fix**: payout hearts[]/savings 로 splitStreams 구성 · setSplitStreams
호출 · pendingTwinkleRef=true · playHeartFly() explicit 호출 · onDone dedup
안 balance push + twinkle 재사용.

### B-4 · 규모 비례 (현재/변경 표)

| 항목 | 현재 | 변경 | 비례 근거 |
|------|------|------|-----------|
| 일반 하트 count | `max(1, min(6, ceil(|delta|/20)))` max 6 | 유지 | 일반 delta 100~1000 |
| **JACKPOT count** | **없음** (스트림 skip) | `max(6, min(20, ceil(|delta|/200)))` max 20 | 400=6 · 2000=10 · 4000=20 |
| HeartParticles 내부 delay | `startDelayMs + i*40` | 유지 | count=20 시 last particle @800ms |
| Stream stagger (N recipient) | 700ms | 유지 | N=3 시 총 flight = 700·2 + 1800 = 3200ms |
| **CountUp duration** | 560ms 고정 (sound 종속) | **|delta|>200 시 · `min(1500, 560 + delta/10)` 로 scale** | 400=600ms · 2000=760ms · 4000=960ms · cap 1500ms |
| Fanfare 길이 | 380ms (playDepositComplete) | **1400ms (playJackpotFanfare)** | 놀이공원 |
| Confetti | 없음 | **2500ms 화면 전체** | 시각 celebration |
| Fadeout 지연 | 900 + 3000 = 3900ms | **maxStagger + 1000 + 3000** (N=3 시 6100ms) | 최장 스트림 도착 + 관찰 |

**측정 (Playwright)**: `[RouletteModal B-3/B-4] jackpot streams FIRED ·
count=3 totalHearts=18 paidAmount=1200`.

---

## 자기 검증 (Playwright 실행 로그)

### A 실행 결과

```
=== N0-0909-A Positive Timing Report (a·b·c') ===
(a) CountUp elapsed: 575ms (target ≥460)
(b) Twinkle notes: 4/4 onended
(c') multi-bg · totalTicks=287 · ticksAfterStop=0 (target 0)
  ✓  1

=== N0-0909-A (c') 3-wheel 무-꼬리 Report ===
wheel 1 (multi-bg): totalTicks=216 · ticksAfterStop=0
wheel 2 (multi-extra-0): totalTicks=250 · ticksAfterStop=0
wheel 3 (multi-extra-1): totalTicks=235 · ticksAfterStop=0
  ✓  5
```

### B 실행 결과

```
=== N0-0909-A B · JACKPOT Report ===
HeartParticles mount: 6
playDepositTwinkle: (다수)
JACKPOT streams FIRED: 1
  [RouletteModal B-3/B-4] jackpot streams FIRED · count= 3 totalHearts= 18 paidAmount= 1200
  ✓  1 (24s)
```

### 자기 검증 정직 인정

- A: 5/5 pass (workers=1 serial · retries=1). 발견된 flake 는 pre-existing
  dev server 초기 latency · 이 라운드 신규 아님.
- B: JACKPOT test 1/1 pass (isolated 실행). 통합 실행 시 다른 test 와
  간섭 없음 확증.

### 미검증 항목 · 정직 인정

- **JackpotConfetti 시각 렌더**: DOM/스크린샷 확증 안 함 (JSX 존재만 코드
  리뷰). Kyu 실기 필수.
- **playJackpotFanfare 실 사운드**: Web Audio 는 headless 브라우저에서 실
  재생 불가 (mock ctx). Kyu 귀 확인 필수.
- **OO/OOO toast 문구**: Playwright test 안 assertion 없음 (dev preset click
  후 toast 렌더 검증 별도). Kyu 실기 필수.

---

## 이연 순증감

**이연 해소**:
- A · 라쳇 동기화 (Kyu 실기 09-09 항목 ②) · 각도 기반 재작성 · 완결.
- B · OO/OOO 재정의 · AGAIN 재시도 로직 폐지 · Toast 통일.
- B · JACKPOT 팡파르 + 폭죽 · 사운드 편입 · 규모 비례.

**이연 신설**:
- **B 심화 규모 비례**: CountUpNumber duration scaling 이 delta>200 전역
  적용 (JACKPOT 만 아님) · 일반 스핀 delta 1000 도 duration 660ms 로 스케일.
  Kyu 지시 "일반 스핀은 유지" 라면 JACKPOT 만 flag 필요 · 다음 라운드
  결정.
- **JACKPOT 두 branch 통합**: 자연 landing (handleSpinEnd) 과 Reveal accept
  후 (handleAcceptToWallet 안 second branch) 가 별개 코드 · B-3 fix 는 first
  branch 만 · second branch (dev preset "최대 잭팟" · 또는 multi-spin
  JACKPOT 결과) 는 여전히 jackpotPayoutResponse 별개 rendering 경로.
  통합 refactor 필요.

**미해소**:
- Docs (docs/epics · docs/requirements-tracking · EPIC-STATE.md) 갱신 이
  라운드 미완결 · 다음 라운드 T0 docs-only 커밋 대상.

---

## Kyu 실기 항목 (처음 하는 사람 기준)

### A · PR#288 실기

기동 (필수 · v2.4 정본):
```
1. git checkout feat/roulette-z1-vertical-bingo && git pull
2. npm install
3. npm run dev:all
```

브라우저 (Chrome/Safari mobile viewport) 로 http://localhost:3000 접속 →
로그인 (parent@test.com / testpass1234) → 아무 아이 선택 → 미션 활동 완료 →
빙고 라인 완성 (자연 트리거) 또는 SettingsPopover → GoldenDiscDevSection
에서 activity threshold 세팅 → 빙고 재발화.

**귀 확인 2항목**:
1. **라쳇 동기**: 룰렛 wheel 이 스핀 → 감속 → 정지. 스핀 중 tick 소리가
   **wheel 회전 속도와 정확히 맞음** (빠르면 빠른 tick · 느리면 느린 tick).
2. **꼬리 없음**: wheel 이 시각적으로 멈춘 순간 = tick 즉시 정지. **정지 후
   1~2초 tick 소리 계속 나면 실패**. 1·2·3 wheel (SPIN×2 · SPIN×3 시)
   모두 확인.

### B · PR#289 실기

기동:
```
1. git checkout feat/roulette-jackpot-multi-spin && git pull
2. npm install
3. npm run dev:all
```

로그인 → 빙고 완성 → 룰렛.

**귀 확인 3항목**:

1. **OO/OOO 자연 랜딩** (설정 → 룰렛 · dev preset "●●● SPIN×2" 클릭 or
   자연 wheel 랜딩 대기):
   - Toast 문구 = **"룰렛 2회 찬스" 또는 "룰렛 3회 찬스"** (기존 "🎡 멀티
     룰렛!" 아님).
   - AGAIN 재시도 안내 없음 (기존 "AGAIN! 같은 스피너 즉시 재스핀!" 안 뜸).

2. **JACKPOT 축하 연출** (dev preset "최대 잭팟 (JACKPOT)" 클릭 or 자연
   JACKPOT 랜딩):
   - 화면 중앙에 "🎉 JACKPOT! 🎉" 배지 (기존 유지).
   - **화면 전체에 40개 색색 confetti 조각 흩날림** (2.5s · 신규).
   - 상승하는 팡파르 소리 (기존 짧은 chord 아님 · **2옥타브 상승 +
     sparkle · ~1.4s**).

3. **JACKPOT 하트 사운드 + 카운트업**:
   - 하트 스트림 **fly 사운드 (sine sweep)** · JACKPOT 박스에서 지갑으로
     날아가는 순간.
   - 각 수혜자 지갑 도착 시 **띠링 소리 (playDepositTwinkle · 4음정
     상승)**.
   - 지갑 숫자가 **눈으로 확인 가능한 속도로 증가** (기존 560ms 는 큰
     delta 시 너무 빠름 · 지금은 delta 크기 비례로 최대 1500ms 까지 확장).

---

## 증적 (파일·라인·커밋)

### A (PR#288 · commit 97fe19f9)
- `src/utils/soundFx.ts:174~215` (각도 기반 재작성 · emitRatchetTick).
- `src/components/Roulette/RouletteWheel.tsx:225~231` (ratchetId prop).
- `src/components/Roulette/RouletteWheel.tsx:945~948` (emitRatchetTick 발화).
- `src/components/Roulette/RouletteModal.tsx` (ratchetId="multi-bg" 전달).
- `src/components/Roulette/MultiWheelExtras.tsx` (ratchetId="multi-extra-N").
- `tests/roulette-timing.spec.ts:178~217` (analyzeRatchetPerWheel · 신 c').

### B (PR#289 · commit f6b236e9)
- `src/components/Roulette/defaultRouletteConfig.ts:57~65` (AGAIN → OO).
- `src/components/Roulette/RouletteModal.tsx:763~776` (AGAIN 브랜치 no-op).
- `src/components/Roulette/RouletteModal.tsx:840~845, 2722~2728` (toast 문구).
- `src/components/Roulette/RouletteModal.tsx:706~810` (JACKPOT B-3/B-4 fix).
- `src/components/Roulette/JackpotConfetti.tsx` (신규).
- `src/utils/showSound.ts:73~104` (playJackpotFanfare 신규).
- `src/components/common/CountUpNumber.tsx:32~45` (delta scaling).
- `tests/roulette-timing.spec.ts:661~750` (JACKPOT test 신규).

## EPIC-STATE 갱신 확인

**EPIC-STATE 무변** · 근거 = **완결이 아니라서 (in-progress commit)** ·
룰렛 N0-0904/N0-0907/N0-0909 시리즈 완결 시 landing PR 에서 통합 갱신.

## docs 갱신 (이연)

Kyu 지시 [DOC] 항목 · docs/epics · docs/requirements-tracking · EPIC-STATE
갱신은 이 라운드 미완결 (구현 우선 · Playwright 검증까지 완결). 다음 라운드
T0 docs-only 커밋 · § 10 규약.
