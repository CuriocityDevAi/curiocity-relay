# N0-0730-Z10 리포트 · JACKPOT Reveal 실 정산 + payout 응답 스트림 + 도착 가시

**Date**: 2026-08-09
**Round**: N0-0730-Z10 (Kyu B-9-h 실기 판정 후속)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `f9048723` (Z10) on top of Z9~Z-1.
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · auto-merge OFF · Kyu approve 대기.

---

## Z10-1 · JACKPOT Reveal 실 정산 표시

### Kyu 관찰

Z9-5 JACKPOT Reveal 경유 · Reveal 카드는 표시되나 **정산 미참조** — 합계가 "JACKPOT" 텍스트만 · 실 pool balance 없음 · 나눗셈 미표시.

### Fix (`src/components/Roulette/RouletteResultReveal.tsx`)

**신 prop**:
```ts
jackpotPoolBalance?: number;
```

**합계 표시 갱신**:
```jsx
<ReceiptRow
  label="합계"
  valueText={
    result.front.kind === "jackpot" && jackpotPoolBalance != null
      ? `♥${jackpotPoolBalance}`
      : formatTotal(result.total)
  }
  sign={
    result.front.kind === "jackpot"
      ? jackpotPoolBalance && jackpotPoolBalance > 0
        ? "positive"
        : "zero"
      : particleSign
  }
  emphasized
/>
```

**분배 배지** (splitN 스타일 재사용 · 금색 톤):
```jsx
{result.front.kind === "jackpot" &&
  jackpotPoolBalance != null &&
  jackpotPoolBalance > 0 &&
  distribution &&
  distribution.participantCount >= 1 &&
  (() => {
    const total = jackpotPoolBalance;
    const n = distribution.participantCount;
    const absPer = Math.floor(total / n);
    const absRem = total - absPer * n;
    return (
      <motion.div ... style={{ background: "#FEF3C7", border: "2px solid #F59E0B", fontSize: 18, boxShadow: "0 4px 14px rgba(245,158,11,0.4)" }}>
        🎁 ♥{total} ÷ {n}명 = 각 <strong>+{absPer}</strong>
        {absRem > 0 && (<>· 나머지 <strong>+{absRem}</strong> 🐷 저금통</>)}
      </motion.div>
    );
  })()}
```

**Modal 통합** (`RouletteModal.tsx`):
```ts
const currentJackpotBalance = useJackpotPoolStore((s) => s.balance);
...
<RouletteResultReveal
  ...
  distribution={{
    mode: distributionMode,
    participantCount:
      distributionMode === "splitN" || distributionMode === "copyAll"
        ? splitParticipantIds.length
        : revealData.front.kind === "jackpot"
          ? Math.max(1, splitParticipantIds.length)
          : 1,
  }}
  jackpotPoolBalance={
    revealData.front.kind === "jackpot"
      ? (currentJackpotBalance ?? 0)
      : undefined
  }
/>
```

- Reveal 진입 시점 pool balance 를 실시간 subscribe (payout 실행 전 값 사용).
- 배지 · [담기] 버튼 · payout 결과 동일 소스 (pool balance) 참조.

---

## Z10-2 · payout 응답 기반 스트림 (뿌리 fix)

### 병리

Kyu 관찰: "풀 0인데도 전원 + 저금통 스트림 발동".

**뿌리**: 이전 (Z4-5) render 로직은 `splitParticipantIds` 만 참조 · payout 결과 (실 hearts / savings 배열) 무시. 스트림 개수 = N + 1 (savings) 고정.

### Fix

**신 state**:
```ts
const [jackpotPayoutResponse, setJackpotPayoutResponse] = useState<{
  paidAmount: number;
  poolBalance: number;
  heartBalance?: number | null;
  hearts?: Array<{ childId: string; delta: number; balance: number | null }>;
  savings?: { delta: number; balance: number } | null;
} | null>(null);
```

**Preemptive pool 0 check** (accept 직후 · payout 호출 전):
```ts
if (result.front.kind === "jackpot") {
  setRevealData(null);
  const preemptivePoolBalance = currentJackpotBalance ?? 0;
  if (preemptivePoolBalance <= 0) {
    // 풀 0 · Z9-3 재사용.
    setZeroFallActive(true);
    playZeroDrop({ muted: !soundEnabled });
    window.setTimeout(() => setZeroFallActive(false), 900);
    scheduleFadeout(performance.now() + 900 + 3000);
    return;
  }
  setJackpotPayoutResponse(null);  // 이전 응답 clear.
  setJackpotPayoutActive(true);
  ...
  void (async () => {
    const res = await jackpotPoolService.payout(...);
    if (res.success) {
      setJackpotPayoutResponse({
        paidAmount, poolBalance, heartBalance, hearts, savings,
      });
      ...
    }
  })();
}
```

**스트림 render (response 기반)**:
```jsx
{jackpotPayoutActive &&
  jackpotBoxAnchorRef.current &&
  jackpotPayoutResponse &&
  (() => {
    if (!jackpotPayoutResponse.hearts) {
      // Legacy single 응답.
      const paid = jackpotPayoutResponse.paidAmount;
      if (paid <= 0) { setJackpotPayoutActive(false); return null; }
      return <HeartParticles ... count={Math.max(3, Math.min(12, Math.ceil(paid / 50)))} ... />;
    }

    // Split 응답 · delta > 0 인 것만.
    const activeHearts = jackpotPayoutResponse.hearts.filter((h) => h.delta > 0);
    const hasSavings = !!jackpotPayoutResponse.savings && jackpotPayoutResponse.savings.delta > 0;
    const totalStreams = activeHearts.length + (hasSavings ? 1 : 0);
    if (totalStreams === 0) { setJackpotPayoutActive(false); return null; }

    return (
      <>
        {activeHearts.map((h, i) => (
          <HeartParticles key={`jp-split-${h.childId}`} target={walletAnchorOf(h.childId)} ... />
        ))}
        {hasSavings && <HeartParticles key="jp-split-savings" target={savingsAnchor} ... />}
      </>
    );
  })()}
```

- **정산 미참조 병리 해소**: 스트림 개수 = 실 payout 응답 반영.
- **풀 0** = preemptive skip (payout 호출 자체 안 함 · "0" 낙하 즉시).
- **참여자 개별 clamp**: hearts[i].delta === 0 인 참여자 스트림 skip.

---

## Z10-3 · 스트림 도착 가시 확장

### Fix (`HeartParticles`)

**신 prop** `durationMs`:
```ts
export function HeartParticles({
  ...
  durationMs,
}: {
  ...
  durationMs?: number;
}): JSX.Element {
  ...
  transition={{
    duration: (durationMs ?? SETTLE_PARTICLE_MS) / 1000,
    ...
  }}
```

- Default = 900ms (기존 · SETTLE_PARTICLE_MS).
- 잭팟 payout 스트림 = **1400ms** (도착 가시 확장).

### Fresh DOM anchor query (Z6-4 대칭)

```ts
const walletAnchorOf = (pid: string): { x: number; y: number } => {
  if (typeof document !== "undefined") {
    const el = document.querySelector(
      `[data-carousel-participant][data-pid="${pid}"]`,
    ) as HTMLElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
  }
  return (
    participantAnchorsRef.current.get(pid) ??
    (typeof window !== "undefined"
      ? { x: window.innerWidth / 2, y: window.innerHeight - 80 }
      : { x: 0, y: 0 })
  );
};
```

- 스트림 렌더 시점에 실시간 DOM rect 조회.
- ref map (mount 시점 캐시) stale 방지.
- 아바타가 rotation/rising 후 이동해도 정확한 target.

### Balance push 타이밍 정합

```ts
window.setTimeout(() => {
  // heart / savings balance push
}, 1400);  // 900 → 1400 · duration 정합.
```

- 스트림 도착 시점 = balance count-up 시작 (시각 동기 유지).

---

## Kyu 실기 재개 대본 (B-9-i · dev 서버 재기동)

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
| z10-1 | JACKPOT Reveal = 실 pool balance 합계 + 분배 배지 (♥{pool} ÷ N명) | Z10-1 |
| z10-2-a | 풀 0 JACKPOT = 스트림 없음 + '0' 낙하 (Z9-3 재사용) | Z10-2 |
| z10-2-b | 풀 > 0 JACKPOT = payout 응답 기반 스트림 (delta > 0 만) | Z10-2 |
| z10-3 | 잭팟 스트림 duration 1400ms · 아이 프로필까지 fully visible | Z10-3 |
| z9-1 | 말풍선 정중앙 위 | Z9-1 |
| z9-2 | 슈퍼 2·3회차 아바타 유지 | Z9-2 |
| z9-3 | 정산 0 낙하 + 툭 사운드 | Z9-3 |
| z9-4 | 음수 하강 사운드 | Z9-4 |
| z9-5 | 컨트롤러 JACKPOT/SPIN Reveal 경유 | Z9-5 |
| z8-1 | 라벨·PowerBanner·말풍선 중앙 | Z8-1 |
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

## QC 4종 (Z10 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 10.06s.

---

## 이연 순증감

### 신규 이연

- **Z11: SPIN×2/3 다중 룰렛 동시 스핀** (Kyu 재예약 · 별건):
  - 데스크톱 가로 배치 · 모바일 (2=세로 · 3=역삼각형).
  - 개별 스핀 버튼 · 동시 회전 · 합산 정산.
  - 규모 큼 · 별건 라운드.

### 해소 이연

- **Z10-1 (버그)**: JACKPOT Reveal 실 정산 표시.
- **Z10-2 (뿌리 fix)**: payout 응답 기반 스트림 · 정산 참조.
- **Z10-3 (연출)**: 스트림 도착 가시 · duration + fresh anchor.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (10 커밋 squash).
- **Kyu 실기 B-9-i**: 위 통합 체크리스트 22 요건.
- **Z11 예약 명시**.

---

## Commit graph

```
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

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1 ~ Z10 head = `f9048723`.
