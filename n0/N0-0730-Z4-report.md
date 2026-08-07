# N0-0730-Z4 리포트 · 슈퍼 오인 뿌리 + AGAIN + 음수 대칭 + JACKPOT 분배

**Date**: 2026-08-07
**Round**: N0-0730-Z4 (Kyu B-9-b 실기 판정 후속)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `97cfe68f` (Z4) on top of `6030911d` (Z3) → `e680672a` (Z2) → `0235bdf7` (Z-1)
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · 지속 · auto-merge OFF · Kyu approve 대기.

---

## Z4-1 · 슈퍼빙고 오인 뿌리 실측 · 수리 (최우선)

### 실측 로그

**Kyu 재현**: 슈퍼 발화 → 우상단 "세로빙고" (파랑) 라벨 + 1 스핀만. Z3-3 superSequence 미작동.

**뿌리 추적** (`src/hooks/useBingoCompletion.ts` 소스 리뷰):

- `currentKeys` Map 계산에서 `state.isSuper` true 시 · 다음 3 개 트리거 모두 등록:
  1. `super:<mission>:<date>` (1 개).
  2. `hbingo:<mission>:<date>:<pid>` (참여자 N 명 각).
  3. `vbingo:<mission>:<date>:cat_<catId>` (카테고리 M 개 각).
- fresh 로 감지된 각 트리거는 `callbackRef.current(trig)` 로 **parallel** 발화:
  ```js
  fresh.forEach((trig) => {
    ...
    void (async () => {
      if (antiAbuse) await heartService.checkSourceExists(...);
      callbackRef.current(trig);
    })();
  });
  ```
- MainApp `handleSuperBingoComplete` 는 콜백마다 `openModal("ROULETTE", ...)` 호출. modalStore 는 마지막 호출로 payload 덮어씀.
- 각 콜백 소요:
  - hbingo: seed fetch 없음 → 즉시 openModal.
  - vbingo: seed fetch 있음 → 50~100ms 후 openModal (splitN mode + 세로빙고 label).
  - super: seed fetch (spinCount 포함) → 50~100ms 후 openModal (copyAll + superSequence + 슈퍼빙고 label).
- 결과: parallel fetch 순서 우연에 따라 vbingo 가 super 를 덮어씀 → Kyu 관찰.

### 뿌리 특정

**super 성립 = 정의상 모든 hbingo + vbingo 성립**. useBingoCompletion 이 super 를 detected 시 hbingo/vbingo 를 별도로 fresh 등록하는 것 자체가 잉여 · 병리.

### 수리 (`src/hooks/useBingoCompletion.ts`)

```ts
if (state.isSuper) {
  const key = `super:${mission.id}:${date}`;
  out.set(key, { ... });
} else {
  // 가로 · 세로 라인은 super 없을 때만 발화.
  state.horizontalParticipantIds.forEach((pid) => { ... });
  state.verticalColumnCategoryIds.forEach((catId) => { ... });
}
```

Z-2 (동시 h+v 시퀀스) 는 super 없는 케이스에만 · 별건 라운드 유지.

### 검증

super trigger 발화 시 out Map 에 `super:...` 1 개만 · hbingo/vbingo 배제. openModal race 소멸 · 항상 슈퍼 payload 정합.

---

## Z4-2 · AGAIN 재스핀 정본

### 구현

**`RouletteModal.tsx`** 신 state:

```ts
const [againOverride, setAgainOverride] = useState<{
  landingIndex: number;
  counter: number;
} | null>(null);
```

**활성**:

```ts
if (front.kind === "again") {
  toast.info("AGAIN!", "같은 스피너 즉시 재스핀!");
  window.setTimeout(() => {
    setRevealData(null);
    setAgainOverride((prev) => ({
      landingIndex: Math.floor(Math.random() * segments.length),
      counter: (prev?.counter ?? 0) + 1,
    }));
    setDepositState("idle");
    setStage("spin");
    setSpinNonce(0);
  }, 1200);
  return;
}
```

**파생값 편입**:

```ts
const activeLandingIndex = againOverride
  ? againOverride.landingIndex
  : baseLandingIndex;
const activeSourceId = superSequence
  ? againOverride
    ? `${bingoPatternId}:spin_${superSpinIdx + 1}:again_${againOverride.counter}`
    : `${bingoPatternId}:spin_${superSpinIdx + 1}`
  : againOverride
    ? `${bingoPatternId}:again_${againOverride.counter}`
    : bingoPatternId;
```

**Wheel remount**: `key={wheel-${superSpinIdx}-again-${againOverride?.counter ?? 0}}` · 재-스핀 애니 새로 발화.

**정책**:
- Same spinner (activeSpinnerPid 불변).
- 원 빙고 규칙 (distributionMode) 유지.
- landingIndex = client random (조작 방지는 서버 seed 원 스핀에 이미 적용 · AGAIN 은 재-roll).
- external_id counter 로 idempotent 분리 · 백엔드 heart_ledger UNIQUE 유지.
- Super sequence 진행 중이면 spinIdx 유지 · 다음 스핀 전환 시 againOverride 소거.

---

## Z4-3 · 음수 정산 스트림 역방향

### 구현

**splitStreams 스펙 확장**:

```ts
Array<{
  key: string;
  sign: "positive" | "negative";
  originKind: "wheel" | "wallet" | "savings";       // Z4-3
  targetKind: "wallet" | "savings" | "jackpot";     // Z4-3
  affectedPid: string;
  balance: number;
  startDelayMs: number;
  count: number;
  jackpotContribution?: number;                     // Z4-3
}>
```

**음수 정산 분기**:

```ts
const isNegativeSettlement = perChild < 0 || remainderToSavings < 0;

streams = heartsCopy.map((h, i) => ({
  ...
  sign: isNegativeSettlement ? "negative" : "positive",
  originKind: isNegativeSettlement ? "wallet" : "wheel",
  targetKind: isNegativeSettlement ? "jackpot" : "wallet",
  affectedPid: h.childId,
  ...
  jackpotContribution: isNegativeSettlement ? Math.abs(h.delta) : undefined,
}));
```

**잭팟 흡수 async**:

```ts
if (isNegativeSettlement) {
  const totalAbsorbed = streams.reduce((acc, s) => acc + (s.jackpotContribution ?? 0), 0);
  if (totalAbsorbed > 0) {
    void jackpotPoolService.credit({
      delta: totalAbsorbed,
      source: "roulette_negative",
      sourceId: `${activeSourceId}:jackpot_absorb`,
      ...
    }).then((creditRes) => {
      if (creditRes.success) {
        pendingJackpotBalanceRef.current = creditRes.data.newBalance;
      }
    });
  }
}
```

**렌더 시 origin/target 계산**:

```ts
const origin =
  s.originKind === "wheel" ? wheelCenter
  : s.originKind === "savings" ? savingsAnchor
  : walletAnchorOf(s.affectedPid);
const target =
  s.targetKind === "jackpot" ? jackpotAnchor
  : s.targetKind === "savings" ? savingsAnchor
  : walletAnchorOf(s.affectedPid);
```

**마지막 스트림 완료 시 잭팟 pool balance push**:

```ts
if (pendingJackpotBalanceRef.current !== null) {
  useJackpotPoolStore.getState().setBalance(pendingJackpotBalanceRef.current);
  pendingJackpotBalanceRef.current = null;
}
```

### 시각 결과 (음수 예: -100, N=3)

- 각 아이 지갑 (3 개) 에서 💔 스트림 3-5 개 → 🎁 잭팟 박스 (stagger 400ms).
- 🐷 저금통에서 💔 스트림 1 개 (나머지 -1) → 🎁 잭팟 박스.
- 마지막 스트림 도착 시 🎁 balance +100 카운트업 (pop).

---

## Z4-4 · 스트림 도착점 보정

### 병리

`HeartParticles` motion transition:
```ts
opacity: [0, 1, 1, 0],
times: [0, 0.15, 0.85, 1],
```

Linear interp `left/top` from origin to target. Opacity 는 t=85% 부터 fade out. Position at t=85% = origin + 0.85 × (target - origin) = target 에 도달하지 않음 · 중간 소멸.

### 수리 (`src/components/Roulette/RouletteResultReveal.tsx` L266)

```ts
opacity: [0, 1, 1, 0],
scale: [0.4, 1, 1, 0.6],
times: [0, 0.1, 0.95, 1],       // Z4-4
```

- Fade in 10% (90ms at 900ms).
- Fully visible 10~95% (765ms).
- Fade out 5% (45ms · target 근처에서 pop).

---

## Z4-5 · JACKPOT 마무리 (분배 + 폭죽)

### Backend (`server/routes/jackpotPool.cjs`)

`POST /jackpot-pool/payout` 확장 · body `childIds?: string[]` 편입.

- **legacy single**: `body.childId` → 전액 → 1명.
- **Z4-5 split**: `body.childIds: [pid_1, ..., pid_N]` → pool balance X 를 `floor(X/N)` 씩 N 명 + `remainder` 를 savings pool 로.
- 단일 트랜잭션 · UNIQUE external_id 3 개:
  - `<sourceId>:jackpot_payout_split:drain` (pool -X).
  - `<sourceId>:jackpot_payout_split:pid_<pid>` (각 heart_ledger +perChild).
  - `<sourceId>:jackpot_payout_split:savings` (savings +remainder · remainder > 0 시).
- idempotent replay: 기존 drain UNIQUE 히트 시 hearts/savings 재구성 반환.

### 실측 (dev · pool 500 · N=1)

```
POST /jackpot-pool/payout body: {childIds:["test_student_001"], sourceId:"z4-split-..."}
STATUS 201
BODY {
  "success": true,
  "idempotent": false,
  "data": {
    "paid_amount": 500,
    "pool_balance": 0,
    "hearts": [{"childId":"test_student_001","delta":500,"balance":4250}],
    "savings": null
  }
}
```

### Client (`src/services/jackpotPoolService.ts`)

`payout({childId?, childIds?, sourceId, reason})` · 응답에 `hearts`/`savings` 편입 (split 시).

### RouletteModal (`src/components/Roulette/RouletteModal.tsx`)

`handleSpinEnd` jackpot 분기:

```ts
const useSplit =
  (distributionMode === "splitN" || distributionMode === "copyAll") &&
  splitParticipantIds.length > 0;
const res = await jackpotPoolService.payout(
  useSplit
    ? { childIds: splitParticipantIds, sourceId, reason }
    : { childId: activeSpinnerPid, sourceId, reason }
);
```

응답 payment 후 900ms 지연 → 각 target store push (파티클 도착 동기).

### 파티클 (split 시)

```jsx
{splitParticipantIds.map((pid, i) => (
  <HeartParticles
    key={`jp-split-${pid}`}
    sign="positive"
    origin={jackpotOrigin}
    target={walletAnchorOf(pid)}
    count={5}
    startDelayMs={i * 350}
    onAllDone={bumpDone}
  />
))}
<HeartParticles
  key="jp-split-savings"
  sign="positive"
  origin={jackpotOrigin}
  target={savingsAnchor}
  count={3}
  startDelayMs={splitParticipantIds.length * 350}
  onAllDone={bumpDone}
/>
```

`bumpDone` 카운터 = totalStreams 도달 시 `setJackpotPayoutActive(false)`.

### 폭죽 UI + 사운드

```jsx
<AnimatePresence>
  {jackpotFanfareActive && (
    <motion.div
      style={{
        position: "fixed", top: "40%", left: "50%",
        background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #DC2626 100%)",
        color: "#3D1A56", borderRadius: "var(--radius-full)",
        boxShadow: "0 8px 32px rgba(245,158,11,0.6), ...",
        fontSize: 32, ...
      }}
      initial={{opacity: 0, scale: 0.4, y: -20}}
      animate={{opacity: 1, scale: 1, y: 0}}
      exit={{opacity: 0, scale: 0.6}}
    >
      🎉 JACKPOT! 🎉
    </motion.div>
  )}
</AnimatePresence>
```

- 마운트 = JACKPOT segment 랜딩 즉시 · 2s 후 auto off.
- 사운드 = `playDepositComplete()` (기존 자산 재사용).

---

## PR #288 본문 재구성 · pr-test-checklist-guide 형식

test-portal 파싱 위해 PR body 를 relay 루트 `pr-test-checklist-guide.md` 형식 (요지 + YAML 코드펜스) 로 갱신. 상세 = 별도 comment (기술 배경).

test-checklist YAML 블록에 Z4 신 케이스 (`z4-1-super-label` 등) + Z2 미확인 통합 (`z2-4-division-badge` · `z2-6-jackpot-payout`) + Z3 잔여 (`z3-4-ref-warning` · `x1-observation`) 편입.

---

## Kyu 실기 재개 대본 (B-9-c · dev 서버 재기동 필수)

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
| z4-1 | 슈퍼빙고 = **금 라벨** + N 번 순차 스핀. "세로빙고" 라벨 오인 소멸 | Z4-1 |
| z4-2 | AGAIN 랜딩 = 같은 spinner 즉시 재스핀 · 재스핀 결과 원 규칙 유지 | Z4-2 |
| z4-3 | 음수 결과 = 각 지갑/저금통 → 잭팟 스트림 (💔 대칭) + 🎁 카운트업 | Z4-3 |
| z4-4 | 스트림 도착점 = 아이 지갑 앵커까지 fully visible · target 소멸 | Z4-4 |
| z4-5 | JACKPOT 랜딩 = 🎉 폭죽 배지 + 사운드 + 분배 (N 등분 + 저금통) | Z4-5 |
| z2-4 | 세로빙고 결과 모달 담기 전 나눗셈 배지 표시 | Z2-4 (미확인 통합) |
| z2-6 | JACKPOT payout 정상 (Z3-1 뿌리 fix 후 확인) | Z2-6 + Z3-1 |
| z3-4 | 콘솔 "Function components cannot be given refs" 경고 0 | Z3-4 |
| x1 | 담기 후 3s 관찰 창 유지 | X-1 |

---

## QC 4종 (Z4 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 7.52s.

---

## 이연 순증감

### 신규 이연

- **Z-2 원 스코프 (동시 가로+세로 연속 2회)**: super 없는 h+v 동시 시 여전히 별건. BingoDetector 그룹핑 or MainApp debounce 필요.
- **JACKPOT 폭죽 세부**: 현재는 배지 pop 만 · 실 confetti particle burst 는 defer.
- **AGAIN 서버 seed 화**: 현재 client random · Kyu 조작 방지 정책 관점에서 서버 seed 로 격상 여부 판정 필요.

### 해소 이연

- **Z4-1 (신규 결함)**: 슈퍼 오인 뿌리 fix · useBingoCompletion 정정.
- **Z4-2 (정본 신설)**: AGAIN 재스핀.
- **Z4-3 (정본 신설)**: 음수 대칭 시각.
- **Z4-4 (도착점 보정)**: 중간 소멸 해소.
- **Z4-5 (정본 신설)**: JACKPOT 분배 + 폭죽.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (4 커밋 squash).
- **Kyu 실기 B-9-c**: 위 통합 체크리스트 9 요건.
- **Kyu 판정 필요**: 없음 (모든 Z4 정본 확정).

---

## Commit graph

```
97cfe68f feat(roulette): Z4 슈퍼 오인 뿌리 + AGAIN + 음수 대칭 + JACKPOT 분배 (N0-0730-Z4)
6030911d feat(roulette): Z3 payout 뿌리 + multi-target + 슈퍼 N번 스핀 (N0-0730-Z3 · Kyu B-9-a)
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2 · Kyu B-9 판정)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1/Z2/Z3/Z4 head = `97cfe68f`.
