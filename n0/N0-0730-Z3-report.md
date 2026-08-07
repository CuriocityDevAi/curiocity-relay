# N0-0730-Z3 리포트 · payout 뿌리 + multi-target + 슈퍼 N번 스핀

**Date**: 2026-08-07
**Round**: N0-0730-Z3 (Kyu B-9-a 실기 판정 후속)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `6030911d` (Z3) on top of `e680672a` (Z2) on top of `0235bdf7` (Z-1)
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · 지속 · auto-merge OFF · Kyu approve 대기.

---

## Z3-1 · jackpot payout 뿌리 실측 · 수리 (최우선)

### 실측 로그

**Kyu 재현**: JACKPOT 랜딩 → 우상단 "잭팟 payout 실패" 에러 (Z2-6 신 endpoint).

**로컬 실측** (dev DB · parent id=13 · student `test_student_001` 소유):

```
DB_NAME=grownest_dev node -e "..."  →  probe up
  1st POST /jackpot-pool/payout → STATUS 403
  BODY {"success":false,"error":"student is not in your institution"}
```

**dev DB 데이터 확인** (`psql grownest_dev`):

```
external_id                     | institution_id | id
--------------------------------|----------------|-----
test_student_001                | (null)         | 3
stu_1779702005093_a48f8a        | 1              | 86
stu_1779705758442_5z5fqc        | (null)         | 88
stu_1776827731325_veu3ti        | (null)         | 46
stu_1779573420796_b7fe54        | 1              | 63
```

`test_student_001` 및 다수 dev seed 데이터가 `institution_id = NULL` · Z2 endpoint 는 `student.institution_id !== req.user.institutionId` (`NULL !== 1 = true`) → 403.

### 뿌리 특정

Z2 payout endpoint 가 heart.cjs 정본 (`resolveStudentAccess` · `parent_children`/`class_students` join 소유권 검증) 을 답습하지 않고 단순 `institution_id` 필드 비교를 함. Legacy dev seed 의 NULL 값과 정합 안 됨. 뿌리 = **tenancy 검사 방식 불일치**.

### 수리 (`server/routes/jackpotPool.cjs.registerJackpotPayoutRoute`)

```js
// 이전 (Z2)
if (student.institution_id !== institutionId) {
  return res.status(403).json({ success: false, error: 'student is not in your institution' });
}
```

→

```js
// 신 정본 (Z3-1 · heart.cjs 대칭)
if (req.user.role === 'parent') {
  const owns = await pool.query(
    `SELECT 1 FROM parent_children WHERE parent_id = $1 AND student_id = $2`,
    [req.user.id, student.id]
  );
  if (owns.rows.length === 0) return res.status(403).json({...});
} else if (req.user.role === 'teacher') {
  const owns = await pool.query(
    `SELECT 1 FROM class_students cs
       JOIN classes c ON c.id = cs.class_id
      WHERE c.teacher_id = $1 AND cs.student_id = $2`,
    [req.user.id, student.id]
  );
  if (owns.rows.length === 0) return res.status(403).json({...});
} else {
  return res.status(403).json({...});
}
```

### 수리 후 실측

```
DB_NAME=grownest_dev node -e "..." (parent id=13 · student test_student_001)
  1st POST /jackpot-pool/payout → STATUS 201
  BODY {"success":true,"idempotent":false,"data":{"paid_amount":3750,"pool_balance":0,"heart_balance":3750}}
  2nd (replay) POST → STATUS 200
  BODY {"success":true,"idempotent":true,"data":{"paid_amount":3750,"pool_balance":0,"heart_balance":3750}}
```

201 (신규) + 200 (idempotent) · 정본 통과.

---

## Z3-2 · 하트 스트림 multi-target (Z2 근사 폐기)

### 병리 (Z2 근사)

Z2-5 는 balance push 를 setTimeout stagger 로 · CountUpNumber 순차 발화 근사. 하지만 파티클은 여전히 Reveal 안 single target (spinner wallet 만) · Kyu 정본 "수혜자 N명 = 스트림 N개" 미충족.

### 정본 구현

**`HeartParticles.startDelayMs?: number`** prop 신설 (`src/components/Roulette/RouletteResultReveal.tsx`):

```tsx
export function HeartParticles({ sign, origin, target, count, onAllDone, startDelayMs = 0 }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      key: i,
      delay: startDelayMs + i * 40,
      dx: (Math.random() - 0.5) * 60,
      dy: (Math.random() - 0.5) * 30,
    })),
    [count, startDelayMs],
  );
  // ...
}
```

**Reveal 안 splitN 시 particles skip**:

```tsx
{phase === "settling" && distribution?.mode === "splitN" && (
  <ReducedMotionSettleTimer onDone={handleParticlesDone} />
)}
```

**RouletteModal splitStreams state** (`src/components/Roulette/RouletteModal.tsx`):

- splitN accept 성공 시 스트림 스펙 조립:
  - 각 참여자 = 1 스트림 · target = 참여자 지갑 · startDelayMs = idx * 400ms.
  - remainderToSavings ≠ 0 시 = 1 스트림 추가 · target = 저금통.
- `SavingsBox onMounted` 로 `savingsBoxAnchorRef` tracking.
- 각 스트림 렌더: origin = 화면 중앙 (룰렛 위치 근사) · target = 참여자 or 저금통 anchor.
- `onAllDone` 안에서 그 target balance push (카운트업 도착 동기) + 완료 카운터 증가.
- 마지막 스트림 완료 시 `scheduleFadeout(500 + 3000)`.

### 타임라인 (양수 · N=3 · total=+200 · 예 각 +66 · 나머지 +2)

| t (ms) | 이벤트 |
|---|---|
| 0 | accept 클릭 · setStage("depositing") |
| ~100 | splitStreams state 세팅 · 4 스트림 마운트 |
| 0 → 900 | 1st 스트림 (target=child_1 지갑 · 3-4 하트 fly) |
| 900 | child_1 balance push · CountUpNumber 시작 |
| 400 → 1300 | 2nd 스트림 (child_2) |
| 1300 | child_2 push |
| 800 → 1700 | 3rd 스트림 (child_3) |
| 1700 | child_3 push |
| 1200 → 2100 | savings 스트림 (target=🐷) |
| 2100 | savings push |
| 2100 → 2600 | 마지막 tween |
| 5600 | **fadeOut** (2600 + 3000 관찰 · X-1 유지) |

각 스트림 도착 = 그 target 카운트업. 별개 스트림 시각 · 아이별 개별 하트 흐름 시각 확인 가능.

---

## Z3-3 · 슈퍼빙고 순차 N번 스핀 정본

### 정본

- 참여 N명 = 순차 N번 스핀 (spin 1 → 결과 → 3s 관찰 → spin 2 → ...).
- 각 스핀 = 서버 seed 결정 (`spinnerPid` + `landingIndex` per idx).
- 각 스핀 결과 = **전원 동일 복사** 적립 (copyAll · 저금통 무접촉).
- 스핀마다 라벨 (금 · "슈퍼빙고") 유지.

### Backend (`server/routes/bingoSpinSeed.cjs`)

`deriveSeed` HMAC 입력에 `seqIdx` 편입:

```js
function deriveSeed(bingoPatternId, sortedParticipantIds, segmentCount, seqIdx) {
  const payload = JSON.stringify({
    bingoPatternId,
    participantIds: sortedParticipantIds,
    segmentCount,
    ...(seqIdx !== undefined ? { seqIdx } : {}),  // Z3-3
  });
  return crypto.createHmac('sha256', SEED_SECRET).update(payload).digest();
}

function deriveSequence(bingoPatternId, sortedParticipantIds, segmentCount, spinCount) {
  const out = [];
  for (let i = 0; i < spinCount; i++) {
    const seedBytes = deriveSeed(bingoPatternId, sortedParticipantIds, segmentCount, i);
    const { spinnerIdx, landingIndex } = deriveSpinnerAndLanding(seedBytes, ...);
    out.push({ spinnerPid: sortedParticipantIds[spinnerIdx], landingIndex });
  }
  return out;
}
```

`POST /bingo/spin-seed` body 에 `spinCount?: number` 추가 · 응답 `data.sequence`.

**실측**:

```
POST /bingo/spin-seed
body: {bingoPatternId: "super:m1:2026-08-07", participantIds: ["stu_a","stu_b","stu_c"], segmentCount: 24, spinCount: 3}
STATUS 200
BODY {
  "success": true,
  "data": {
    "bingoPatternId": "super:m1:2026-08-07",
    "spinnerPid": "stu_a",
    "landingIndex": 17,
    "participantIds": ["stu_a", "stu_b", "stu_c"],
    "sequence": [
      {"spinnerPid": "stu_b", "landingIndex": 17},
      {"spinnerPid": "stu_a", "landingIndex": 16},
      ...
    ]
  }
}
```

### Client (`src/services/bingoSpinSeedService.ts`)

`fetchSeed({ bingoPatternId, participantIds, segmentCount, spinCount? })` · 응답에 `sequence` 매핑.

### MainApp (`src/components/MainApp.tsx`)

슈퍼 브랜치 (`isSuper`) 시 `spinCount: kidPids.length` sequence fetch · openModal 에 `superSequence` + `distributionMode: 'copyAll'` + `distributedParticipantIds: kidPids`.

### RouletteModal 다중 스핀 state machine

**신 state**:
- `superSpinIdx: number` (0 → N-1) · 현재 스핀 인덱스.

**파생값**:
- `activeSpinnerPid = superSequence[superSpinIdx].spinnerPid`.
- `activeLandingIndex = superSequence[superSpinIdx].landingIndex`.
- `activeSourceId = ${bingoPatternId}:spin_${superSpinIdx + 1}` (per-spin external_id 분리 · 트랜잭션 idempotency).
- `isLastSpin = superSpinIdx >= superSequence.length - 1`.

**WheelStage key**:
```tsx
<WheelStage key={`wheel-${superSpinIdx}`} landingIndex={activeLandingIndex} ... />
```
각 스핀마다 remount · 회전 애니 새로 발화.

**handleAcceptToWallet copyAll 분기**:
```ts
if (distributionMode === "copyAll") {
  perChild = delta;              // 각자 full delta
  remainderToSavings = 0;        // 저금통 무접촉
}
// splitN 로직과 통합 (같은 endpoint · applyHeartDeltaSplit)
```

**loop check** (스트림 onAllDone 안):
```ts
if (splitStreamsDoneCountRef.current >= splitStreams.length) {
  if (superSequence && !isLastSpin) {
    window.setTimeout(() => {
      setSuperSpinIdx((i) => i + 1);
      setSplitStreams(null);
      splitStreamsDoneCountRef.current = 0;
      setRevealData(null);
      setDepositState("idle");
      setStage("spin");
      setSpinNonce(0);
    }, 3000);  // 3s 관찰 후 다음 스핀
  } else {
    scheduleFadeout(performance.now() + 500 + 3000);
  }
}
```

K-1 super 트리거 감지 유지 (useBingoCompletion.ts unchanged) · Z2 "슈퍼 single" 폐기.

### 타임라인 (슈퍼 · N=3 · 각 스핀 total=+300)

| Spin | 스핀 시작 | Accept | 스트림 완료 | 다음 |
|---|---|---|---|---|
| 1/3 | 0 (라벨 "슈퍼빙고" · spinner_1) | ~5s | ~7s (3 참여자 × 각 +300) | +3s 관찰 → reset |
| 2/3 | ~10s (WheelStage remount · spinner_2) | ~15s | ~17s | +3s → reset |
| 3/3 | ~20s (spinner_3) | ~25s | ~27s | fadeOut +3s |

총 소요 ≈ 30s (3 스핀).

---

## Z3-4 · React ref 경고 수리

### 병리

`<AnimatePresence>` 직접 child = `<ParticipantCarousel>` (plain function component · forwardRef 없음). AnimatePresence 는 direct child 에 ref 부착 시도 · React 경고 "Function components cannot be given refs" (Kyu 관찰).

### 수리

`RouletteModal.tsx` line 872 부근:

```tsx
{/* Z3-4 (Kyu · 2026-08-07) — motion.div wrapper 로 ref 흡수 */}
<AnimatePresence>
  {isWalletVisible && (
    <motion.div
      key="participant-carousel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "contents" }}
    >
      <ParticipantCarousel ... />
    </motion.div>
  )}
</AnimatePresence>
```

`motion.div` 는 Framer Motion 내부 forwardRef 지원 · ref 흡수. `display: contents` 로 시각·레이아웃 무영향.

### 검증

`npm run typecheck 2>&1` → 0 errors · `npm run build` → ✓ 7.55s. Kyu 실측 재확인 필요 (콘솔 ref 경고 0 여부).

---

## Kyu 실기 재개 대본 (B-9-b · dev 서버 재기동 필수)

```
1. git checkout main && git pull
2. git checkout feat/roulette-z1-vertical-bingo && git pull
3. npm install (필요 시)
4. psql -d grownest_dev -f migrations/053_family_savings_pool.sql (Z-1 · 이미 실행 시 skip)
5. npm run dev:all
```

### 통합 실기 체크리스트 (Z2 미확인 + Z3 신규)

- ① **가로빙고**: 릴 회전 애니 skip · spinner (입력자) 중앙 정지 상태에서 즉시 wheel 스핀 (Z2-2).
- ② **세로빙고 나눗셈 배지**: 결과 모달 담기 앞에 "200 ÷ 3명 = 각 +66 · 나머지 +2 🐷 저금통" 배지 표시 (Z2-4).
- ③ **세로빙고 multi-stream (Z3-2)**: 담기 클릭 후 하트 스트림 = 참여 3명 각각 fly (start delay stagger) + 나머지 = 저금통 별개 스트림. 각 스트림 도착 시 그 target 카운트업.
- ④ **슈퍼빙고 N번 순차 스핀 (Z3-3)**: 참여 3명 시 3번 스핀. 각 스핀 = 다른 spinner (서버 시드) · 라벨 "슈퍼빙고" 유지. 각 스핀 결과 = 전원 동일 복사 적립 (아이별 스트림 N개 + 카운트업). 마지막 스핀 후 fadeOut.
- ⑤ **JACKPOT segment (Z3-1)**: 어느 스핀에서든 JACKPOT 랜딩 시 payout **성공** (403 소멸). 🎁 balance 0 · 하트 12개 잭팟 → spinner 지갑 fly · spinner 지갑 카운트업.
- ⑥ **React ref 경고 (Z3-4)**: 콘솔에 "Function components cannot be given refs" 경고 **0** (개발자 도구 콘솔 확인).
- ⑦ **X-1 관찰 창 (3s)** 유지.

---

## PR #288 본문 절차 갱신

원 body B-9 절차는 유지. Z3 관련 신 실기 요건은 위 체크리스트 참조.

**PR #288 mergeable 상태 재확인**:
- Z-1 (`0235bdf7`) → Z2 (`e680672a`) → Z3 (`6030911d`) 순차 커밋.
- base = main (`1dd2afcd` · X-1 착지 후).
- `git log origin/main..HEAD --oneline` 3 커밋.

---

## QC 4종 (Z3 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed (기존 유지).
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0 · Z3-3 useCallback deps 추가로 인한 신경도 유지).
- **build**: ✓ 7.55s.

---

## 이연 순증감

### 신규 이연

- **Z-2 원 스코프 (동시 가로+세로 연속 2회)**: Z3-3 이 super multi-spin 을 커버하나 "가로 + 세로 동시 발화" 는 여전히 별건 (BingoDetector queue 그룹핑 · Y-4). 이연 → Z-4 or 별건.
- **잭팟 payout · 세로/슈퍼 스핀 중 JACKPOT segment 랜딩**: 현재는 spinner (activeSpinnerPid) 지갑으로 payout · Kyu 판정 필요 = "전원 복사" or "spinner 만" (Kyu 지시서에 명시 없음 · 기본은 spinner 로 감).

### 해소 이연

- **Z2-6 payout 실패 (Z3-1)** : 뿌리 fix · 정상 payout.
- **Z2-5 하트 스트림 근사 (Z3-2)**: multi-target 정본 구현.
- **Z2 슈퍼 single 모드 폐기 (Z3-3)**: 순차 N번 스핀 · 전원 복사.
- **React ref 경고 (Z3-4)**: motion.div wrapper 수리.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.
- Y-6 라벨 진행 표기 ("1/2", "2/3") · Y-7 스핀 간 페이드 전환 애니 (지금은 3s 관찰 + stage 리셋만 · UX 부드러움 개선 여지).

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (3 커밋 squash 예상).
- **Kyu 실기 B-9-b**: 위 체크리스트 7 요건.
- **Kyu 판정 필요**: 세로/슈퍼 스핀 중 JACKPOT segment 랜딩 시 payout 대상 (spinner or 전원).

---

## Commit graph

```
6030911d feat(roulette): Z3 payout 뿌리 + multi-target + 슈퍼 N번 스핀 (N0-0730-Z3 · Kyu B-9-a)
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2 · Kyu B-9 판정)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1/Z2/Z3 head = `6030911d`.
