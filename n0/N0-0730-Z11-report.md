# N0-0730-Z11 리포트 · 정산 0 회색 하트 + 잭팟 거리 duration + SPIN×N 합산

**Date**: 2026-08-09
**Round**: N0-0730-Z11 (Kyu B-9-i 판정 후속 · 다중 룰렛 착수)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `ddf7e624` (Z11).
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · auto-merge OFF · Kyu approve 대기.

---

## Z11-1 · 정산 0 재개정 (Kyu · "0" 낙하 폐기)

### 정본

- 합계 0 담기 시 · **회색 (쪼개진 💔) 하트 1개** 를 수혜자 각각에게 전달.
  - 공동 (splitN/copyAll) = N 명 각 1개.
  - 단독 (single) = 스피너 1개.
- 사운드 `playZeroDrop` ('툭') · 스트림 시작 시점 발화.
- 잭팟 풀 0 케이스도 동일 준용.

### 구현

**HeartParticles (`src/components/Roulette/RouletteResultReveal.tsx`)**:
```ts
const glyph =
  sign === "negative" || sign === "zero"
    ? "💔"
    : sign === "item"
      ? "🎁"
      : "♥";
...
color:
  sign === "zero"
    ? "#94A3B8"          // Z11-1 · 회색.
    : sign === "negative"
      ? "#FCA5A5"
      : "#F49AC2",
```

**splitStreams sign union 확장**:
```ts
sign: "positive" | "negative" | "zero";
```

**Modal delta === 0 재작성** (Z9-3 낙하 폐기):
```ts
if (delta === 0) {
  setDepositState("success");
  setRevealData(null);
  const zeroTargets = distributionMode === "splitN" || distributionMode === "copyAll"
    ? splitParticipantIds
    : [activeSpinnerPid];
  const zeroStreams = zeroTargets.map((pid, i) => ({
    key: `zero-${pid}-${i}`,
    sign: "zero" as const,
    originKind: "wheel" as const,
    targetKind: "wallet" as const,
    affectedPid: pid,
    balance: -1,          // sentinel · balance push skip.
    startDelayMs: i * 400,
    count: 1,
  }));
  splitStreamsDoneCountRef.current = 0;
  window.setTimeout(() => {
    setSplitStreams(zeroStreams);
    playZeroDrop({ muted: !soundEnabled });
  }, 350);
  return;
}
```

**Balance push skip** (onAllDone 안):
```ts
if (s.balance !== -1) {
  // ... 기존 push ...
}
```

**Jackpot 풀 0 동일 준용** (Z10-2 preemptive check 재작성):
```ts
if (preemptivePoolBalance <= 0) {
  const zeroTargetsJp = distributionMode === "splitN" || distributionMode === "copyAll"
    ? splitParticipantIds
    : [activeSpinnerPid];
  const zeroStreamsJp = zeroTargetsJp.map((pid, i) => ({
    key: `zero-jp-${pid}-${i}`,
    sign: "zero" as const,
    originKind: "wheel" as const,
    targetKind: "wallet" as const,
    affectedPid: pid,
    balance: -1,
    startDelayMs: i * 400,
    count: 1,
  }));
  splitStreamsDoneCountRef.current = 0;
  window.setTimeout(() => {
    setSplitStreams(zeroStreamsJp);
    playZeroDrop({ muted: !soundEnabled });
  }, 350);
  return;
}
```

### Dead code (후속 정리)

Z9-3 `zeroFallActive` state + 낙하 애니 render 는 미발화 dead code · 후속 정리.

---

## Z11-2 · 잭팟 스트림 거리 기반 duration

### 병리

- Z10-3 fix (fixed 1400ms) 후에도 중간 소멸 재현.
- 뿌리: 잭팟 배지 (좌상단 60, 80) → 아이 지갑 하단 (예: 195, 587) · 거리 ~525px · 1400ms 로 vw=390 스크린에선 눈 따라가기 어려움. 원거리 target 시 더 큼.

### Fix

```ts
const durationForDistance = (
  org: { x: number; y: number },
  tgt: { x: number; y: number },
): number => {
  const dx = tgt.x - org.x;
  const dy = tgt.y - org.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(1200, Math.min(2600, Math.round(dist * 3)));
};
```

- dist × 3ms · 500px = 1500ms · 1000px = 3000ms → clamped to 2600ms.
- Min 1200ms · Max 2600ms.

**적용**:
- Legacy single 잭팟 스트림 → spinner 지갑.
- Split 잭팟 스트림 → 각 참여자 지갑 (개별 duration).
- Savings 스트림 → savings box (개별 duration).

---

## Z11-3 · 다중 룰렛 MVP (SPIN×N 실 구현)

### 정본 (Kyu · MVP 는 로직만 · UI 배치 후속)

- 당첨 시 룰렛 2/3 개 동시 등장.
  - 데스크톱 = 가로 나열 / 모바일 = 2 세로 · 3 역삼각형.
  - 각 개별 [스핀] 버튼 · 순차/동시 회전 자유.
  - 스피너 1인이 전부 스핀.
- 정산: 전 룰렛 완료 → 결과 카드에 각 룰렛 결과 나열 + **합산** → 기존 빙고 종류별 정산.

### MVP 구현 (본 라운드)

**로직만 · UI 다중 wheel 배치는 Z12 예약**.

handleAcceptToWallet SPIN case 재작성:
```ts
if (result.front.kind === "spin") {
  const N = result.front.times;
  const spinResults: number[] = [];
  for (let i = 0; i < N; i++) {
    const landingIdx = Math.floor(Math.random() * segments.length);
    const seg = segments[landingIdx];
    const spinFront = segmentToFront(seg);
    if (spinFront.kind !== "points") continue; // 재-SPIN·JACKPOT·AGAIN skip
    const spinBackOp = pickBackOp(spinFront);
    const spinResult = computeRouletteResult(spinFront, spinBackOp);
    if (spinResult.total.kind === "points") {
      spinResults.push(spinResult.total.n);
    }
  }
  const summedDelta = spinResults.reduce((a, b) => a + b, 0);
  console.info("[RouletteModal] Z11-3 · SPIN×", N, "· 결과 합산 =", summedDelta);
  toast.info("🎡".repeat(N), `${N}회 스핀 합산: ${summedDelta >= 0 ? "+" : ""}${summedDelta}`);
  const wrappedResult: RouletteResult = {
    front: { kind: "points", n: summedDelta },
    backOp: null,
    computed: null,
    total: { kind: "points", n: summedDelta },
  };
  result = wrappedResult;
  delta = summedDelta;
  // Flow through 하단 로직 (delta === 0 · splitN · single).
}
```

- N 회 client-random 스핀.
- points 만 accumulate (재-SPIN · JACKPOT · AGAIN 는 skip · 무한 재귀 방지).
- 합계 wrap · `result` / `delta` 재할당 · 하단 dispatch 로 flow through.
- 세로빙고 = splitN 분배 · 슈퍼빙고 = copyAll · 합계 0 = Z11-1 회색 스트림.

**컨트롤러 프리셋** (`🎡🎡` · `🎡🎡🎡`):
- Z9-5 Reveal 경유 → Accept → 이 로직.

### Z12 예약

- 실 다중 wheel UI:
  - 데스크톱 = 가로 나열.
  - 모바일 = 2 개 세로 · 3 개 역삼각형.
- 각 wheel 개별 [스핀] 버튼 · 순차/동시 자유.
- 스피너 1인이 전부 스핀.
- 완료 시 결과 카드에 각 룰렛 결과 나열.

---

## Kyu 실기 재개 대본 (B-9-j · dev 서버 재기동)

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
| z11-1-a | 합계 0 담기 = 회색 하트 스트림 (N 개) + '툭' 사운드 · 낙하 없음 | Z11-1 |
| z11-1-b | 잭팟 풀 0 = 회색 하트 스트림 (수혜자별 1개) + '툭' | Z11-1 |
| z11-2 | 잭팟 → 아이 지갑 스트림 전 구간 가시 (거리 기반 duration) | Z11-2 |
| z11-3 | SPIN×2/3 = N회 합산 dispatch (세로 splitN · 슈퍼 copyAll · 0 회색) | Z11-3 |
| z10-1 | JACKPOT Reveal 실 정산 | Z10-1 |
| z10-2 | payout 응답 기반 스트림 | Z10-2 |
| z9-1 | 말풍선 정중앙 | Z9-1 |
| z9-2 | 아바타 유지 | Z9-2 |
| z9-4 | 음수 하강 사운드 | Z9-4 |
| z9-5 | JACKPOT/SPIN 컨트롤러 Reveal 경유 | Z9-5 |
| z8-1 | 3 UI 중앙 | Z8-1 |
| z8-2 | 슈퍼 매 스핀 릴 회전 | Z8-2 |
| z8-3 | SPIN×N 아이콘 | Z8-3 |
| z7-1 | 슈퍼 3 스핀 완주 | Z7-1 |
| z7-3 | 슈퍼 스트림 균등 | Z7-3 |
| z7-4 | 배지 격상 | Z7-4 |
| z7-5 | dev 컨트롤러 상시 | Z7-5 |
| z4-1 | 슈퍼 금 라벨 | Z4-1 |
| z4-2 | AGAIN 재스핀 | Z4-2 |
| z4-3 | 음수 정산 지갑→잭팟 | Z4-3 |
| z2-4 | 세로 나눗셈 배지 | Z2-4 |
| z5-2 | 슈퍼 copyAll 배지 | Z5-2 |
| x1 | 3s 관찰 | X-1 |

---

## QC 4종 (Z11 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 11.28s.

---

## 이연 순증감

### 신규 이연

- **Z12: SPIN×N 실 다중 wheel UI** (Kyu 정본 · 별건):
  - 데스크톱 가로 · 모바일 2세로/3역삼각형 배치.
  - 각 개별 [스핀] 버튼 · 순차/동시 자유.
  - 스피너 1인 · 결과 카드 나열.
  - MultiSpinStage 컴포넌트 신설 · WheelStage 여러 인스턴스.
- **Z9-3 dead code 청소** (zeroFallActive state + 낙하 render).

### 해소 이연

- **Z11-1 (Kyu 재개정)**: 회색 하트 스트림 + 잭팟 풀 0 준용.
- **Z11-2 (잔존 fix)**: 거리 기반 duration.
- **Z11-3 (실 구현 MVP)**: SPIN×N 로직 완결 · UI 는 후속.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (11 커밋 squash).
- **Kyu 실기 B-9-j**: 위 통합 체크리스트 23 요건.
- **Z12 예약 명시**.

---

## Commit graph

```
ddf7e624 feat(roulette): Z11 정산 0 회색 하트 + 잭팟 거리 duration + SPIN×N 합산 (N0-0730-Z11)
f9048723 feat(roulette): Z10 JACKPOT Reveal 실 정산 + payout 응답 스트림 + 도착 가시 확장 (N0-0730-Z10)
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

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1 ~ Z11 head = `ddf7e624`.
