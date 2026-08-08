# N0-0730-Z7 리포트 · 슈퍼 전이 뿌리 fix + 말풍선 정본 + 배지 격상 + 컨트롤러 상시

**Date**: 2026-08-08
**Round**: N0-0730-Z7 (Kyu B-9-e 실기 판정 후속)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `b2bafcb5` (Z7) on top of Z6→Z5→Z4→Z3→Z2→Z-1.
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · auto-merge OFF · Kyu approve 대기.

---

## Z7-1 · 슈퍼 전이 실행부 뿌리 fix (최우선)

### Kyu 실측 로그

콘솔:
```
[RouletteModal] splitStreams onAllDone last · seqLen=3 curIdx=0 canAdvance=true
```

→ 서버 시퀀스 정상 (`seqLen=3`) · 판정 정상 (`canAdvance=true`) · 그러나 다음 스핀 미발화 · 그냥 modal close.

### 뿌리 특정 (코드 추적)

**Trace 1**: `splitStreams` onAllDone loop 안 (Z-3 · Z4-3 · Z6-5 통합):
```ts
if (canAdvance) {
  window.setTimeout(() => {
    setSuperSpinIdx((i) => i + 1);
    setSplitStreams(null);
    ...
    setStage("spin");
    ...
  }, 3000);   // <-- 3s 대기
}
```
- 마지막 스트림 완료 시 · setTimeout 3000ms 예약 후 다음 스핀 준비.
- 이 3s 대기 동안 `stage='depositing'` 유지 · Reveal 도 mount 유지.

**Trace 2**: 병렬로 `handleRevealComplete` 발동:
- Reveal 안 splitN 시 `<ReducedMotionSettleTimer onDone={handleParticlesDone} />` 짧게 대기 후 `handleParticlesDone` 호출 → `onComplete` → Modal `handleRevealComplete`.
- Modal `handleRevealComplete` 안 (기존):
  ```ts
  scheduleFadeout(performance.now() + 3000);
  ```
- 즉 · particles 완료 시 즉시 fadeout 3s 예약.

**Race**:
- splitStreams onAllDone loop 의 3s 대기 setTimeout **vs** handleRevealComplete 의 fadeout 3s setTimeout.
- 두 타이머는 거의 동시 시작 · fadeout timer 가 근소하게 앞서면 → `setStage('fadeOut')` → useEffect → `onClose(FADE_OUT_MS)` → Modal unmount.
- Modal unmount 후 · loop 의 3s setTimeout callback 은 unmount 된 컴포넌트에 setState 시도 → React "state on unmounted" no-op.
- → 다음 스핀 준비 미발화.

### Fix (`src/components/Roulette/RouletteModal.tsx`)

**Primary fix** (`handleRevealComplete`):
```ts
const curSeq = superSequenceRef.current;
const curIdx = superSpinIdxRef.current;
const willAdvance = !!curSeq && curIdx < curSeq.length - 1;
if (willAdvance) {
  console.info(
    "[RouletteModal] Z7-1 · handleRevealComplete skip fadeout · super 진행 중 · curIdx=",
    curIdx, "seqLen=", curSeq.length,
  );
  return;   // fadeout 예약 skip
}
scheduleFadeout(performance.now() + 3000);
```

**Defensive** (splitStreams onAllDone advance 분기):
```ts
if (canAdvance) {
  // handleRevealComplete 가 이미 스케줄한 fadeout 예약을 clear.
  if (fadeoutTimerRef.current !== null) {
    window.clearTimeout(fadeoutTimerRef.current);
    fadeoutTimerRef.current = null;
  }
  fadeoutTargetTsRef.current = 0;
  window.setTimeout(() => { setSuperSpinIdx((i) => i + 1); ... }, 3000);
}
```

- 두 layer 방어 · handleRevealComplete 가 항상 실행되기 전에 loop 이 진행 여부 확정 못 하는 timing race · defensive clear 로 안전.

---

## Z7-2 · 말풍선 정본 개정

### 병리 (Kyu 관찰)

- Z5-3 · Z6-4 · 3 blink keyframes 로 반짝임 · Kyu 정본 요구는 "깜빡임 제거".
- 스핀 시작 (wheel 회전 개시) 순간 잔존 · 소멸 안 됨.

### Fix (`src/components/Roulette/RouletteModal.tsx`)

**Render 조건 확장**:
```jsx
{stage === "spin" &&
  spinnerHintReady &&
  spinNonce === 0 &&              // <-- Z7-2 · 스핀 시작 시 조건 false
  splitParticipantIds.length > 1 &&
  activeSpinnerName && (
    ...
```

- `spinNonce` = 사용자 tap 시 `setSpinNonce(n => n + 1)` 로 증가. 첫 스핀 시 0 → 1 · 조건 false → 말풍선 자동 소멸.
- 슈퍼 순차 스핀 사이 · loop reset 시 `setSpinNonce(0)` · 조건 true → 다음 스피너 위 재등장.

**Motion 개정** (깜빡 폐지):
```jsx
<motion.div
  key={`spinner-hint-${activeSpinnerPid}-${superSpinIdx}-${againOverride?.counter ?? 0}`}
  initial={{ opacity: 0, y: 8, scale: 0.9 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
  ...
>
```

- Fade + subtle scale · 0.3s · hold visible until spinNonce > 0.
- 이전 opacity keyframes `[0, 1, 0, 1, 0, 1, 0, 1]` 폐지.

### 위치 (Z6-4 유지)

- DOM `document.querySelector('[data-carousel-participant][data-pid="{pid}"]')` fresh rect · 정중앙 위.

---

## Z7-3 · 슈퍼 스트림 균등

### 병리

- 이전 `count: streamCount(h.delta)` · h.delta 는 backend applied delta (clamp 후) · 참여자별 지갑 잔액에 따라 실 차감이 달라 개수 다름 · "스피너 몰림" 시각.

### Fix

```ts
// Z7-3 · 균등 count = perChild 기준 (요청 금액 균등) · clamp 무관.
const uniformCount = Math.max(
  1,
  Math.min(6, Math.ceil(Math.abs(perChild) / 20)),
);

const streams = heartsCopy.map((h, i) => ({
  ...
  count: uniformCount,   // <-- 균등
  ...
}));
```

- perChild 는 요청 금액 (splitN 나눗셈 결과 · copyAll 은 delta 그대로) · 참여자 모두 동일.
- 시각적으로 균등 · 스피너 몰림 소멸.

### Stagger 여유

```ts
const STREAM_STAGGER_MS = 700;   // <-- 400 → 700
```

- 2·3번째 스트림 시작 시점을 더 늦춤 · 이전 스트림 애니 완료 (900ms fly + stagger) 여유 확보.
- 잘림 방지 (도착 전에 다음 스트림 시작 시 · 사용자 인지 혼란).

---

## Z7-4 · 배지 연출 격상

### 병리

- Z5-2 · Z6 배지는 receipt 와 함께 즉시 표시 (fontSize 13 · 얇은 border · 배경 밝음) · 시각 부각 부족.

### Fix (`src/components/Roulette/RouletteResultReveal.tsx`)

**splitN 배지**:
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.7, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{ delay: 0.7, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  style={{
    marginTop: 12,
    padding: "14px 18px",
    background: "#DBEAFE",       // 밝은 파랑 → 진한 파랑
    border: "2px solid #3B82F6", // 1px → 2px
    borderRadius: "var(--radius-md)",
    color: "#1E3A8A",
    fontSize: 18,                // 13 → 18
    fontWeight: 700,
    textAlign: "center",
    boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
    letterSpacing: "0.02em",
  }}
>
  {total} ÷ {n}명 = 각 <strong>{perTxt}</strong>
  ...
</motion.div>
```

**copyAll 배지** (동일 패턴 · 금색 톤):
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.7, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{ delay: 0.7, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  style={{
    ...
    background: "#FEF3C7",
    border: "2px solid #F59E0B",
    color: "#78350F",
    fontSize: 18,
    boxShadow: "0 4px 14px rgba(245,158,11,0.4)",
    ...
  }}
>
  슈퍼빙고 · 전원 각 <strong>{perTxt}</strong> ({n}명 복사)
</motion.div>
```

### 시퀀스

1. Reveal 진입 → 앞면/뒷면/합계 (ReceiptRow) 표시.
2. 700ms 후 배지 pop (scale 0.7 → 1 · y 10 → 0 · fade in).
3. 사용자 accept 클릭 → depositing.

---

## Z7-5 · dev 컨트롤러 상시 (룰렛 밖)

### 정본

- 룰렛 모달 밖 (홈 · 캘린더 등 모든 authenticated 화면) 에서도 dev 빌드 시 컨트롤러 표시.
- 재발화 버튼이 진입점 · 컨트롤러 없으면 실 빙고 발화 대기 필요.

### 구현 (`src/components/MainApp.tsx`)

**Import**:
```ts
import { RouletteDevController } from "@/components/dev/RouletteDevController";
```

**Render** (AuthedShell JSX):
```jsx
{import.meta.env.DEV && modalType !== "ROULETTE" && (
  <MainAppRouletteDevController />
)}
```

**Wrapper** (파일 하단):
```tsx
function MainAppRouletteDevController(): JSX.Element {
  const openModal = useModalStore((s) => s.openModal);
  const children = useAppStore((s) => s.children);
  const kidPids = Object.keys(children).filter((pid) => !pid.startsWith("parent_"));
  const firstKidPid = kidPids[0] ?? "";

  return (
    <RouletteDevController
      segments={DEFAULT_ROULETTE_SEGMENTS}
      participantIds={kidPids}
      currentSpinnerPid={firstKidPid}
      continuousMode={false}
      onForceReveal={() => {/* 모달 밖: no-op */}}
      onForceSpinner={() => {/* 모달 밖: no-op */}}
      onReopenBingo={(kind, spinCountArg) => {
        // Same logic as Modal's onReopenBingo · openModal 로 h/v/super 발화.
        ...
      }}
      onToggleContinuous={() => {/* 모달 밖: no-op */}}
    />
  );
}
```

- `modalType !== "ROULETTE"` 조건: 룰렛 모달 열리면 MainApp 컨트롤러 숨김 · Modal 안 컨트롤러가 표시 (조작 API 완전).
- `import.meta.env.DEV` 게이트 · prod tree-shake.

---

## Z7-6 · ref 경고 잔존 fix

### Kyu 관찰

Z5 fix (ParticipantCarousel wrapping) 에도 콘솔 "ref is not a prop" 경고 잔존. RouletteModal.tsx:82 경유 스택.

### 잔여 지점 특정

`grep -n "<AnimatePresence>" src/components/Roulette/RouletteModal.tsx`:
- L1062 · L1086 · L1110: motion.div 직접 child. OK.
- L1219: motion.div wrapper (Z3-4 fix). OK.
- L1262: **`<WheelStage>` 직접 child** ← 잔여 지점!
- L1383: motion.div. OK.

`WheelStage` 는 plain function component (`function WheelStage(...): JSX.Element`) · forwardRef 아님 · AnimatePresence ref 부착 시도 → 경고.

### Fix

```jsx
<AnimatePresence>
  {isWheelMounted && (
    <motion.div
      key={`wheel-wrap-${superSpinIdx}-${againOverride?.counter ?? 0}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "contents" }}
    >
      <WheelStage ... />
    </motion.div>
  )}
</AnimatePresence>
```

- `motion.div` (forwardRef 지원) 이 ref 흡수.
- `display: contents` 로 시각·레이아웃 무영향 (child 인 WheelStage 가 직접 root 처럼 렌더).
- Z3-4 (ParticipantCarousel) 와 동일 패턴.

---

## Kyu 실기 재개 대본 (B-9-f · dev 서버 재기동)

```
1. git checkout main && git pull
2. git checkout feat/roulette-z1-vertical-bingo && git pull
3. npm install (필요 시)
4. psql -d grownest_dev -f migrations/053_family_savings_pool.sql (Z-1 · 이미 실행 시 skip)
5. npm run dev:all
```

### 통합 실기 체크리스트

| ID | 요건 | 근거 |
|---|---|---|
| z7-1 | 슈퍼 3 스핀 완주 (dev 컨트롤러 or 실 빙고) · 콘솔 Z7-1 skip fadeout 로그 | Z7-1 |
| z7-2-a | 말풍선 = 깜빡 없이 fade in + hold | Z7-2 |
| z7-2-b | wheel 스핀 시작 순간 말풍선 소멸 | Z7-2 |
| z7-3 | 슈퍼 스트림 = 참여자별 하트 개수 균등 · 잘림 없음 | Z7-3 |
| z7-4 | 결과 모달 · 합계 표시 후 700ms 시차 · 배지 큰 폰트 pop | Z7-4 |
| z7-5 | 룰렛 밖 (홈 등) 에서도 dev 컨트롤러 표시 · 재발화 버튼 진입점 | Z7-5 |
| z7-6 | 콘솔 ref 경고 0 (WheelStage 잔여 fix) | Z7-6 |
| z6-1 | 컨트롤러 · 강제 결과 · 프리셋 · 재발화 · 스피너 · spinCount | Z6-1 |
| z6-4 | 말풍선 정중앙 위 (우측 치우침 없음) | Z6-4 |
| z6-5 | 정산 0 시 스트림 skip · 자연 종료 | Z6-5 |
| z4-1 | 슈퍼 금 라벨 | Z4-1 |
| z4-2 | AGAIN 재스핀 | Z4-2 |
| z4-3 | 음수 정산 지갑→잭팟 대칭 | Z4-3 |
| z4-5 | JACKPOT 폭죽 + 분배 | Z4-5 |
| z2-4 | 세로빙고 나눗셈 배지 | Z2-4 |
| z5-2 | 슈퍼 copyAll 배지 | Z5-2 |
| x1 | 담기 후 3s 관찰 창 | X-1 |

---

## QC 4종 (Z7 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 7.56s.

---

## 이연 순증감

### 신규 이연

- **연속 모드 실제 동작**: `devContinuousMode` state 존재 · fadeOut 시 close 대신 재시작 로직은 별건.
- **Z6-2 dev 도장 컨트롤러 완전 구현**: Settings flag + 활동 카드 handler · 별건.
- **Z6-3 도장 미찍힘 실 뿌리**: 6 후보 중 실측 (Kyu devtools) 필요 · fix 는 뿌리 확정 후.

### 해소 이연

- **Z7-1 (신규 결함)**: 슈퍼 전이 뿌리 fix.
- **Z7-2 (정본 개정)**: 말풍선 깜빡 폐지 · 스핀 시작 시 소멸.
- **Z7-3 (연출 정본)**: 스트림 균등 + stagger 여유.
- **Z7-4 (연출 정본)**: 배지 격상.
- **Z7-5 (테스트 인프라 확장)**: 컨트롤러 상시.
- **Z7-6 (경고 잔존 fix)**: WheelStage motion.div wrapper.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (7 커밋 squash).
- **Kyu 실기 B-9-f**: 위 통합 체크리스트 17 요건.
- **Kyu 실기 · Z7-1 특별 확인**: devtools 콘솔에서 `[RouletteModal] Z7-1 · handleRevealComplete skip fadeout · super 진행 중 · curIdx=X seqLen=3` 로그 관찰 (뿌리 fix 검증).

---

## Commit graph

```
b2bafcb5 feat(roulette): Z7 슈퍼 전이 뿌리 + 말풍선 정본 + 배지 격상 + 컨트롤러 상시 (N0-0730-Z7)
8ef646ee feat(roulette): Z6 dev 컨트롤러 + 말풍선 fix + 정산 0 스트림 생략 (N0-0730-Z6)
664feae6 feat(roulette): Z5 슈퍼 loop 진단 + copyAll 배지 + 스피너 안내 (N0-0730-Z5)
97cfe68f feat(roulette): Z4 슈퍼 오인 뿌리 + AGAIN + 음수 대칭 + JACKPOT 분배 (N0-0730-Z4)
6030911d feat(roulette): Z3 payout 뿌리 + multi-target + 슈퍼 N번 스핀 (N0-0730-Z3)
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1/Z2/Z3/Z4/Z5/Z6/Z7 head = `b2bafcb5`.
