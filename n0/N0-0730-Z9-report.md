# N0-0730-Z9 리포트 · 말풍선 재수리 + 아바타 유지 + 정산 0 낙하 + 음수 사운드 + Reveal 통일

**Date**: 2026-08-09
**Round**: N0-0730-Z9 (Kyu B-9-g 실기 판정 후속)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `c63c5927` (Z9) on top of Z8 → Z7 → Z6 → Z5 → Z4 → Z3 → Z2 → Z-1.
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · auto-merge OFF · Kyu approve 대기.

---

## Z9-1 · 말풍선 위치 재수리 (Z6-4 · Z7-2 잔존)

### 병리

Z8-1 fix (viewport-flex 패턴) 은 라벨·PowerBanner 에 적용 · 말풍선은 다른 패턴 (`left: anchor.x + transform: translate(-50%, -100%)`) 유지 → 우측 이탈 잔존.

**뿌리**: motion.div `initial={{opacity: 0, y: 8, scale: 0.9}}` `animate={{opacity: 1, y: 0, scale: 1}}` 이 자체 CSS `transform: translate/scale` 인라인 · 나의 `style.transform: "translate(-50%, -100%)"` 를 덮어씀. Motion 이 own transform 을 매 프레임 apply · CSS static transform 은 사라짐 → 앵커 그대로 표시 · translate 없이 · 우측 이탈.

### Fix (`src/components/Roulette/RouletteModal.tsx`)

**3-layer nested**:
```jsx
<div style={{position: 'fixed', left: anchor.x, top: anchor.y - 80, zIndex: 62, pointerEvents: 'none'}}>
  <div style={{transform: 'translate(-50%, -100%)', transformOrigin: '50% 100%'}}>
    <motion.div
      initial={{opacity: 0, scale: 0.9}}
      animate={{opacity: 1, scale: 1}}
      exit={{opacity: 0, scale: 0.9}}
      transition={{duration: 0.3, ease: 'easeOut'}}
      style={{position: 'relative', ...content}}
    >
      {activeSpinnerName}님 스핀해주세요!
    </motion.div>
  </div>
</div>
```

- **Outer div**: fixed at anchor · positioning 전담 · transform 안 씀.
- **Middle div**: static `translate(-50%, -100%)` · centering 전담 · motion 무관.
- **Inner motion.div**: opacity + scale 만 animate · translate 안 씀 · CSS transform 충돌 소멸.

말풍선 꼬리 (bottom triangle) 는 inner div 안 · `position: absolute` (motion.div = position: relative) 로 유지.

---

## Z9-2 · 캐러셀 아바타 소실 fix (신규 · Z8-2 부작용)

### 병리

Z8-2 fix: motion.div wrapper key 에 `superSpinIdx + counter` 편입 → 매 스핀마다 wrapper (그리고 자식 `ParticipantCarousel`) remount → CarouselParticipant 도 remount → `ChildAvatar` remount → img 태그 재로드 → 첫 프레임 이니셜 폴백 (avatar 대신 이니셜) 노출 → 이미지 로드 후에도 폴백 고착 (Kyu 관찰).

### Fix

**Wrapper key 폐지** (Z8-2 rollback):
```jsx
<motion.div
  key="participant-carousel"  // Z8-2 remount key 폐지 · static key.
  ...
>
```

**spinTrigger prop 재활성** (`ParticipantCarousel`):
```ts
useEffect(() => {
  if (kids.length === 0) return undefined;
  if (skipRotation) { setRotationOffsetDeg(0); return undefined; }
  setRotationOffsetDeg(ROTATION_START_DEG);
  ... raf ...
}, [kids.length, skipRotation, spinTrigger]);   // Z9-2 · spinTrigger 편입
```

**부모 (`RouletteModal`) 에서 trigger 전달**:
```jsx
<ParticipantCarousel
  ...
  spinTrigger={superSpinIdx * 100 + (againOverride?.counter ?? 0)}
/>
```

- remount 없이 useEffect 재실행 → raf 재시작 → 릴 회전 재발화.
- CarouselParticipant · ChildAvatar 는 mount 유지 → img 재로드 없음 → 아바타 사진 유지.

---

## Z9-3 · 정산 0 연출 정본

### 병리

1. Z6-5 는 splitN handleAcceptToWallet 안 `delta === 0` 조기 return 만 처리. copyAll 시 Reveal 자체 HeartParticles 는 `distribution.mode !== "splitN"` 조건 통과 → 12 하트 fly (Kyu "0인데 하트 다수 비행").
2. 낙하 애니 + 사운드 자체가 없음.

### Fix (Reveal `src/components/Roulette/RouletteResultReveal.tsx`)

**Particles skip 조건 확장**:
```jsx
{phase === "settling" &&
  particlesReady &&
  !reduced &&
  distribution?.mode !== "splitN" &&
  distribution?.mode !== "copyAll" &&
  !(result.total.kind === "points" && result.total.n === 0) &&
  (() => { <HeartParticles ... /> })}
```

**Timer 대체**:
```jsx
{phase === "settling" &&
  (distribution?.mode === "splitN" ||
    distribution?.mode === "copyAll" ||
    (result.total.kind === "points" && result.total.n === 0)) && (
    <ReducedMotionSettleTimer onDone={handleParticlesDone} />
)}
```

### Fix (Modal `handleAcceptToWallet` · `delta === 0` 분기)

```ts
if (delta === 0) {
  setDepositState("success");
  setRevealData(null);           // Z8-4 · 카드 즉시 unmount.
  setZeroFallActive(true);        // Z9-3 · 낙하 애니.
  playZeroDrop({ muted: !soundEnabled });  // Z9-3 · '툭' 사운드.
  window.setTimeout(() => setZeroFallActive(false), 900);
  ...
  // canAdvance / scheduleFadeout · 기존 유지.
}
```

### "0" 낙하 애니 UI

```jsx
<AnimatePresence>
  {zeroFallActive && (
    <motion.div
      key="zero-fall"
      initial={{opacity: 0, y: -80}}
      animate={{opacity: [0, 1, 1, 0], y: [-80, -20, 120, 200]}}
      transition={{duration: 0.9, times: [0, 0.15, 0.75, 1], ease: [0.4, 0.7, 0.7, 1]}}
      style={{position: 'fixed', top: '50%', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 65, pointerEvents: 'none'}}
    >
      <div style={{fontFamily: 'Luckiest Guy...', fontSize: 96, color: '#94A3B8', textShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
        0
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- 화면 중앙에서 시작 · 아래로 낙하 · fade out.
- 회색 (#94A3B8) · 96px · 가치 없음 시각.

### `playZeroDrop` (신 helper · `src/utils/soundFx.ts`)

```ts
export function playZeroDrop(opts: SoundOptions = {}): void {
  ...
  const dur = 0.08;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, t0);
  osc.frequency.exponentialRampToValueAtTime(45, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  ...
}
```

- 90Hz sine → 45Hz exp ramp · 80ms · '툭' percussive.

---

## Z9-4 · 음수 정산 사운드 정본

### Fix (`src/utils/soundFx.ts`)

`playEnergyDrain` (신 helper):
```ts
export function playEnergyDrain(opts: SoundOptions = {}): void {
  ...
  const dur = 0.35;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, t0);
  osc.frequency.exponentialRampToValueAtTime(200, t0 + dur);
  const peak = opts.volume ?? 0.06;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  ...
}
```

- 800Hz → 200Hz exp ramp · 350ms · 에너지 빠짐.

### 발화 위치 (`handleAcceptToWallet` splitN 분기)

```ts
window.setTimeout(() => {
  setSplitStreams(streams);
  if (isNegativeSettlement) {
    playEnergyDrain({ muted: !soundEnabled });
  }
}, 350);
```

- splitN/copyAll 음수 스트림 시작 시점 (Reveal 카드 unmount 후 350ms).
- 양수 정산은 기존 twinkle 사운드 유지.

---

## Z9-5 · 컨트롤러 프리셋 Reveal 경유

### 병리

Controller onForceReveal 안 `front.kind !== "points"` 이면 `handleSpinEnd(idx)` 로 즉시 route · Reveal skip. JACKPOT 은 payout 애니 (Z4-5) 만 · 카드 없음. SPIN 은 toast + fadeOut.

Kyu: "결과·과정이 눈에 보여야 검증 가능. 사전 단계 없이 자금만 이동하는 현 경로 폐지."

### Fix (Controller `onForceReveal`)

```jsx
onForceReveal={(front, backOp) => {
  const matchIdx = segments.findIndex((s) => segmentToFront(s).kind === front.kind);
  const matchedSeg = matchIdx >= 0 ? segments[matchIdx] : {label: "DEV", fill: {kind: "candy", color: "pink"}};
  if (front.kind === "points" && backOp) {
    setStage("spin");
    setRevealData({frontSegment: matchedSeg, front, backOp});
  } else if (front.kind === "jackpot" || front.kind === "spin") {
    // Z9-5 · Reveal 경유 · backOp=null · Reveal 앞면만 · Accept dispatch.
    setStage("spin");
    setRevealData({frontSegment: matchedSeg, front, backOp: null});
  } else if (matchIdx >= 0) {
    // AGAIN · handleSpinEnd 로 즉시 재스핀 (UX 자연).
    handleSpinEnd(matchIdx);
  }
}}
```

### Fix (Modal `handleAcceptToWallet`)

```ts
// Z9-5 · JACKPOT / SPIN 은 Reveal accept 로 진입.
if (result.front.kind === "jackpot") {
  setRevealData(null);
  setJackpotPayoutActive(true);
  setJackpotFanfareActive(true);
  playDepositComplete();
  void (async () => {
    // ... 기존 handleSpinEnd JACKPOT payout 로직 이관 ...
    const useSplit = ...;
    const res = await jackpotPoolService.payout(...);
    // ... payout 응답 처리 · setBalance · scheduleFadeout ...
  })();
  return;
}
if (result.front.kind === "spin") {
  setRevealData(null);
  toast.info("룰렛 결과", `${"🎡".repeat(result.front.times)}! (멀티스핀 · Z10 예약)`);
  scheduleFadeout(performance.now() + 800 + 3000);
  return;
}

// 기존 points 처리 (delta === 0 · splitN · copyAll · single) 이어짐.
```

- JACKPOT · SPIN 은 Reveal 카드 앞면 표시 → 사용자 확인 → Accept → 실 처리.
- AGAIN 은 handleSpinEnd 로 여전히 즉시 재스핀 (UX 자연).
- 기존 handleSpinEnd JACKPOT 경로도 유지 (실 wheel spin 종료 시 · 이중 진입 안전 · idempotent sourceId).

---

## Kyu 실기 재개 대본 (B-9-h · dev 서버 재기동)

```
1. git checkout main && git pull
2. git checkout feat/roulette-z1-vertical-bingo && git pull
3. npm install (필요 시)
4. psql -d grownest_dev -f migrations/053_family_savings_pool.sql (Z-1 · skip if run)
5. npm run dev:all
```

### 통합 실기 체크리스트

| ID | 요건 | 근거 |
|---|---|---|
| z9-1 | 말풍선 = 스피너 프로필 정중앙 위 (우측 이탈 없음) | Z9-1 |
| z9-2 | 슈퍼 2·3회차 아바타 사진 유지 (이니셜 폴백 소멸) | Z9-2 |
| z9-3 | 정산 0 = '0' 낙하 애니 + '툭' 사운드 · 하트 스트림 없음 | Z9-3 |
| z9-4 | 음수 정산 = 800→200Hz 하강 사운드 (띠리리링 소멸) | Z9-4 |
| z9-5 | 컨트롤러 JACKPOT/SPIN 프리셋 → Reveal 카드 → Accept 후 처리 | Z9-5 |
| z8-1 | 라벨·PowerBanner·말풍선 중앙 정렬 | Z8-1 |
| z8-2 | 슈퍼 매 스핀 릴 회전 | Z8-2 |
| z8-3 | SPIN×N 아이콘 (🎡🎡·🎡🎡🎡) | Z8-3 |
| z8-4 | 담기 → 카드 unmount → 350ms → 스트림 | Z8-4 |
| z7-1 | 슈퍼 3 스핀 완주 · fadeout race skip 로그 | Z7-1 |
| z7-3 | 슈퍼 스트림 균등 · stagger 700ms | Z7-3 |
| z7-4 | 배지 격상 (700ms 시차 · 큰 폰트 · pop) | Z7-4 |
| z7-5 | dev 컨트롤러 상시 (룰렛 밖 포함) | Z7-5 |
| z7-6 | 콘솔 ref 경고 0 | Z7-6 |
| z4-1 | 슈퍼 금 라벨 | Z4-1 |
| z4-2 | AGAIN 즉시 재스핀 | Z4-2 |
| z4-3 | 음수 정산 지갑→잭팟 | Z4-3 |
| z4-5 | JACKPOT 폭죽 + 분배 | Z4-5 |
| z2-4 | 세로 나눗셈 배지 | Z2-4 |
| z5-2 | 슈퍼 copyAll 배지 | Z5-2 |
| x1 | 담기 후 3s 관찰 | X-1 |

---

## QC 4종 (Z9 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 7.64s.

---

## 이연 순증감

### 신규 이연

- **Z10: SPIN×2/3 다중 룰렛 동시 스핀** (Kyu 예약 · 별건):
  - 데스크톱 가로 배치 · 모바일 (2=세로 · 3=역삼각형).
  - 개별 스핀 버튼 · 동시 회전 · 합산 정산.
  - 규모 큼 · 별건 라운드.
- **AGAIN 도 Reveal 경유 여부** (Kyu 판정): 현재는 즉시 재스핀 (UX 자연) · Kyu 요구가 all-through-Reveal 이면 통일 검토.

### 해소 이연

- **Z9-1 (버그 잔존)**: 말풍선 위치 3-layer nested.
- **Z9-2 (신규 결함)**: 캐러셀 아바타 유지.
- **Z9-3 (연출 정본)**: '0' 낙하 애니 + 사운드 + skip 우회 경로 (copyAll).
- **Z9-4 (연출 정본)**: 음수 하강 사운드.
- **Z9-5 (컨트롤러 통일)**: JACKPOT/SPIN Reveal 경유.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (9 커밋 squash).
- **Kyu 실기 B-9-h**: 위 통합 체크리스트 21 요건.
- **Z10 예약 명시**.

---

## Commit graph

```
c63c5927 feat(roulette): Z9 말풍선 재수리 + 아바타 유지 + 정산 0 낙하 + 음수 사운드 + Reveal 통일 (N0-0730-Z9)
5ad01169 feat(roulette): Z8 중앙 정렬 + 슈퍼 릴 재회전 + SPIN 아이콘 + 카드→스트림 순차 (N0-0730-Z8)
b2bafcb5 feat(roulette): Z7 슈퍼 전이 뿌리 + 말풍선 정본 + 배지 격상 + 컨트롤러 상시 (N0-0730-Z7)
8ef646ee feat(roulette): Z6 dev 컨트롤러 + 말풍선 fix + 정산 0 스트림 생략 (N0-0730-Z6)
664feae6 feat(roulette): Z5 슈퍼 loop 진단 + copyAll 배지 + 스피너 안내 (N0-0730-Z5)
97cfe68f feat(roulette): Z4 슈퍼 오인 뿌리 + AGAIN + 음수 대칭 + JACKPOT 분배 (N0-0730-Z4)
6030911d feat(roulette): Z3 payout 뿌리 + multi-target + 슈퍼 N번 스핀 (N0-0730-Z3)
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1/Z2/Z3/Z4/Z5/Z6/Z7/Z8/Z9 head = `c63c5927`.
