# N0-0730-Z6 리포트 · dev 컨트롤러 + 말풍선 fix + 정산 0 skip + 도장 미찍힘 뿌리 후보

**Date**: 2026-08-08
**Round**: N0-0730-Z6 (Kyu B-9-d 실기 판정 후속)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `8ef646ee` (Z6) on top of Z5→Z4→Z3→Z2→Z-1.
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · auto-merge OFF · Kyu approve 대기.

---

## Z6-4 · 말풍선 타이밍·위치 fix

### 병리

- Z5-3 는 `stage === "spin"` 시 즉시 활성 → 릴 회전 중에도 스피너 힌트 노출 (스포일).
- 위치 = `left: anchor.x` (ref map 캐시된 mount 시점 좌표) · 스피너로 회전한 후에는 실제 위치와 mismatch → 우측 치우침.

### 정본

**Timing** (`src/components/Roulette/RouletteModal.tsx`):
```ts
const [spinnerHintReady, setSpinnerHintReady] = useState<boolean>(false);
useEffect(() => {
  setSpinnerHintReady(false);
  if (stage !== "spin") return undefined;
  if (skipCarouselRotation) {
    setSpinnerHintReady(true);
    return undefined;
  }
  const t = window.setTimeout(() => setSpinnerHintReady(true), 4500);
  return () => window.clearTimeout(t);
}, [stage, superSpinIdx, againOverride?.counter, skipCarouselRotation]);
```
- `ROTATION_DURATION_S = 4.5s` (ParticipantCarousel) 후 · 릴 정지 · hint ready.
- `skipCarouselRotation=true` (가로) 즉시 · 하지만 hint 조건은 splitPids > 1 이라 가로엔 미표시.
- 슈퍼 순차 스핀 · AGAIN 재스핀 시 · deps 변경 → 재-setTimeout.

**Position**:
```ts
let anchor = participantAnchorsRef.current.get(activeSpinnerPid);
if (typeof document !== "undefined") {
  const el = document.querySelector(
    `[data-carousel-participant][data-pid="${activeSpinnerPid}"]`,
  ) as HTMLElement | null;
  if (el) {
    const r = el.getBoundingClientRect();
    anchor = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
}
```
- DOM 직접 조회 · fresh rect · rotation 완료 후 실제 위치.

---

## Z6-5 · 정산 0 스트림 생략

### 정본 (`handleAcceptToWallet` 조기 분기)

```ts
if (delta === 0) {
  setDepositState("success");
  const curSeq = superSequenceRef.current;
  const curIdx = superSpinIdxRef.current;
  const canAdvance = !!curSeq && curIdx < curSeq.length - 1;
  console.info(
    "[RouletteModal] Z6-5 · 합계 0 · 스트림 skip · canAdvance=", canAdvance,
  );
  if (canAdvance) {
    window.setTimeout(() => {
      setSuperSpinIdx((i) => i + 1);
      setAgainOverride(null);
      setSplitStreams(null);
      splitStreamsDoneCountRef.current = 0;
      setRevealData(null);
      setDepositState("idle");
      setStage("spin");
      setSpinNonce(0);
    }, 3000);
  } else {
    scheduleFadeout(performance.now() + 3000);
  }
  return;
}
```

- `heartService.applyHeartDelta*` 호출 skip · backend 미접촉.
- splitStreams 미세팅 · 파티클/카운트업 없음.
- Reveal 은 "합계 0" 표시 (기존 formatTotal 로).
- 슈퍼 진행 중이면 다음 스핀 · 아니면 3s 관찰 → fadeOut.

---

## Z6-1 · dev 룰렛 컨트롤러

### 신설 파일 (`src/components/dev/RouletteDevController.tsx`)

- dev 빌드 전용 (`import.meta.env.DEV` 게이트) · prod 번들 tree-shake.
- 룰렛 모달 우측 fixed panel (`right: 8`, `top: 100`, `bottom: 100`, `width: 200`).
- 접기 버튼 (`[DEV] ▶`) 으로 최소화 가능.

### 기능

**강제 결과 (앞면 · 뒷면)**:
- 앞면 셀렉트: ♥50/100/500/1000 · 💔100/200 · AGAIN · JACKPOT · SPIN×2/3 (10 종).
- 뒷면 셀렉트: 없음 · +50/-50 · ×2/×3/×-1/×-3 · ÷2 (8 종).
- "→ Reveal 강제" 버튼 · 즉시 Reveal 진입 (또는 handleSpinEnd 로 route).
- points 만 backOp 적용 · AGAIN/JACKPOT/SPIN 은 backOp=null.

**프리셋 조합**:
- "정산 0 (100 × -1 + 100)".
- "음수 큰 값 (200 × -3)".
- "최대 잭팟 (JACKPOT)".
- "SPIN×3 (연속스핀)".

**빙고 재발화** (판 상태 무관 즉시 룰렛 진입):
- 가로 (주황) · 세로 (파랑) · 슈퍼 (금) 3 버튼.
- 슈퍼는 spinCount 입력 (1~10) · **재현 = superSequence.length 실측 뚫음**.
- openModal 재-call · 새 bingoPatternId (`super:DEV:{ts}`) · Modal 재-mount.
- 세로/슈퍼는 bingoSpinSeedService.fetchSeed 시도 · 실패 시 client fallback.

**스피너 강제 지목**:
- children 셀렉트 · `devForcedSpinnerPid` state.
- `activeSpinnerPid = devForcedSpinnerPid ?? [기존 파생]` override.

**연속 모드 토글**:
- `devContinuousMode` state · 후속 확장으로 fadeOut 게이트에서 소비 예정.

### RouletteModal 편입

```tsx
<RouletteDevController
  segments={segments}
  participantIds={participantIds}
  currentSpinnerPid={activeSpinnerPid}
  continuousMode={devContinuousMode}
  onForceReveal={(front, backOp) => {
    if (front.kind === "points" && backOp) {
      setStage("spin");
      setRevealData({ frontSegment, front, backOp });
    } else {
      // AGAIN · JACKPOT · SPIN → handleSpinEnd(idx) route.
      const idx = segments.findIndex((s) => segmentToFront(s).kind === front.kind);
      if (idx >= 0) handleSpinEnd(idx);
    }
  }}
  onForceSpinner={(pid) => setDevForcedSpinnerPid(pid)}
  onReopenBingo={(kind, spinCountArg) => { /* modalStore.openModal 재-call */ }}
  onToggleContinuous={() => setDevContinuousMode((v) => !v)}
/>
```

### 재현 케이스 (Kyu 실기 자율 · 컨트롤러 사용 예)

| # | 시나리오 | 컨트롤러 조작 |
|---|---|---|
| 1 | 슈퍼 3 스핀 seqLen 실측 | "슈퍼 (N=3)" 클릭 → 콘솔 로그 확인 |
| 2 | 슈퍼 음수 정산 대칭 | 슈퍼 발화 후 → "음수 큰 값 (200 × -3)" 프리셋 |
| 3 | JACKPOT 폭죽 + 분배 | 슈퍼 발화 후 → "최대 잭팟 (JACKPOT)" 프리셋 |
| 4 | AGAIN 재스핀 | "AGAIN" 앞면 + "없음" 뒷면 → Reveal 강제 |
| 5 | 정산 0 skip | "정산 0 (100 × -1 + 100)" 프리셋 |
| 6 | 스피너 강제 (특정 아이) | "스피너 강제 지목" 셀렉트 |
| 7 | 세로 splitN 나눗셈 배지 | "세로 재발화" 클릭 → 결과 모달 담기 앞 파란 배지 |

---

## Z6-3 · 도장 미찍힘 코드 추적 (fix 별건)

### 재현

Kyu B-9-d 실기: "활동기록 정상 입력에도 도장 미발생 → 빙고 트리거 불가".

### 경로 추적

**입력 → 도장 판정 flow**:

1. 사용자 활동 입력 → `activityService.recordActivity` → backend `POST /activity-records` → DB INSERT.
2. `appStore.activityRecords` 갱신 (신 record 편입).
3. `useBingoCompletion` 의 `currentKeys` useMemo · deps `[missions, recordsByMission, skippedByMission, children, parentParticipantId]`.
4. `computeMissionDateBingo(args)` (`src/utils/bingoUtils.ts:63`) 각 (mission, date) · state 계산.
5. state 안 `filledMap` = `groups.map((g) => isCellFilled(g, pid, date, records, ...))`.
6. `isCellFilled` → `stampVisualForCell` (`src/utils/missionCategoryGrid.ts:305`) → filled 판정.

### 뿌리 후보 6 종

**후보 ①**: `is_required=false` on option.
```ts
// missionCategoryGrid.ts:384 (single option case)
const filled = optIsRequired && satisfied;
```
- `optIsRequired = resolveMaoAtDate(opt, judgmentDate, today).is_required`.
- 옵션의 `is_required=false` (bonus 성) 이면 filled=false 강제.
- Dev seed 데이터에서 required 옵션 zero 인 카테고리가 있으면 재현.

**후보 ②**: `goal_amount > 0 && quantity < goal_amount`.
```ts
// missionCategoryGrid.ts:377-381
const totalAmount = recordsInCell
  .filter((r) => r.missionActivityOptionId === optId)
  .reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);
const goal = resolved.goal_amount;
const satisfied = goal <= 0 ? totalAmount > 0 : totalAmount >= goal;
```
- Record 저장 시 `quantity` 필드가 null/undefined 이면 `Number(null) = 0` · 합산 실패.
- goal_amount > 0 인데 quantity 미기록 시 satisfied=false.
- **가장 강력한 후보**.

**후보 ③**: `missionActivityOptionId` mismatch.
```ts
const optionIds = new Set(group.options.map((o) => o.id ?? o.activity_option_id));
const recordsInCell = cellRecords.filter((rec) =>
  optionIds.has(rec.missionActivityOptionId),
);
```
- Record 의 `missionActivityOptionId` (mao.id) 가 `group.options` 안에 없으면 filter 에서 걸러짐.
- Seed 데이터 이슈로 mao 링크 mismatch 가능.

**후보 ④**: judgmentDate 스냅샷 `is_required` 이력.
```ts
const resolved = resolveMaoAtDate(opt, judgmentDate, today);
```
- 옵션 설정 후 변경 이력 (batch 2 스냅샷) · 판정 시점 값과 현재 값 mismatch.

**후보 ⑤**: skipped_days 매칭.
```ts
// missionCategoryGrid.ts:336-354
if (skippedDays && skippedDays.length > 0) {
  const skip = skippedDays.find(
    (sd) => sd.skip_date === date && sd.participant_id === participantId,
  );
  if (skip) return { skipped: true, filled: false, ... };
}
```
- (participantId, date) 매칭 skip 있으면 filled=false 강제.

**후보 ⑥**: `M === 0` (도장 옵션 zero).
```ts
if (M === 0) {
  return { filled: false, bonusCount: bonusOnly, ... };
}
```
- 카테고리의 모든 옵션이 is_required=false 이면 · 도장 획득 경로 없음.

### fix 방침

1. Z6-1 컨트롤러로 슈퍼 재현 시 · devtools 콘솔에서 log 추가 (activityRecord → cell filled 판정 결과).
2. 뿌리 특정 후 후속 라운드 fix (Z7 or 별건).
3. 후보 ② (quantity null) 이 가장 유력 · record 저장 시점 quantity 필수화 or default 1 고려.

---

## Z6-2 · dev 도장 컨트롤러 (부분 · 별건 완성)

### 미완결 사항

Kyu 요구: Settings 옵션 "활동 입력포인트 클릭" · 활동 카드 클릭만으로 필수 활동 완료 처리 → 도장 즉시.

### 이연 사유

관련 UI 컴포넌트 (Settings · 활동 카드) 파악 · settingsStore flag 편입 · click handler 확장 · shortcut activityRecord 생성 로직 필요. 시간 제약 상 후속 라운드 (Z6.5 or Z7) 완성.

---

## Kyu 실기 재개 대본 (B-9-e · dev 서버 재기동)

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
| z6-1-a | dev 룰렛 컨트롤러 = 우측 패널 표시 (dev 빌드) | Z6-1 |
| z6-1-b | 컨트롤러 슈퍼 spinCount=3 재발화 → 3 스핀 완주 + 콘솔 seqLen=3 | Z6-1 재현 |
| z6-1-c | 컨트롤러 프리셋 "정산 0" → 스트림 skip (Z6-5) | Z6-1 + Z6-5 |
| z6-1-d | 컨트롤러 프리셋 "JACKPOT" → 폭죽 + 분배 payout | Z6-1 + Z4-5 |
| z6-4 | 말풍선 = 릴 회전 중엔 미표시 · 4.5s 후 스피너 위 중앙 | Z6-4 |
| z6-5 | 정산 0 시 스트림 없음 · "합계 0" 표시 후 종료 | Z6-5 |
| z5-1 | 슈퍼 순차 N 스핀 완주 (실 빙고 발화 or 컨트롤러) | Z5-1 |
| z5-2 | 슈퍼 결과 모달 = 노란 "전원 각 ±X (N명)" 배지 | Z5-2 |
| z5-3 | 스피너 안내 말풍선 · 3 blink · 순차 스핀마다 재-mount | Z5-3 |
| z4-1 | 슈퍼 = 금 라벨 (세로빙고 오인 소멸) | Z4-1 |
| z4-2 | AGAIN 랜딩 = 즉시 재스핀 | Z4-2 |
| z4-3 | 음수 정산 = 지갑/저금통 → 잭팟 대칭 스트림 | Z4-3 |
| z4-4 | 스트림 도착점 = 앵커까지 fully visible | Z4-4 |
| z4-5 | JACKPOT segment = 폭죽 + 분배 | Z4-5 |
| z3-4 | 콘솔 ref 경고 0 | Z3-4 |
| x1 | 담기 후 3s 관찰 창 유지 | X-1 |
| z6-3 | 도장 미찍힘 뿌리 실측 · devtools 콘솔 추적 (fix 별건) | Z6-3 |

---

## QC 4종 (Z6 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 8.49s (dev controller 편입 · prod tree-shake 확인 필요 시 bundle 분석).

---

## 이연 순증감

### 신규 이연

- **Z6-2 dev 도장 컨트롤러**: 부분 (spec 만) · 완전 구현은 후속 (Settings flag + 활동 카드 click handler + shortcut record 생성).
- **Z6-3 도장 미찍힘 뿌리 확정**: 코드 추적으로 후보 6 종 · Kyu 실기 실측으로 확정 후 fix.
- **연속 모드 fadeOut 게이트 확장**: `devContinuousMode` state 만 · fadeOut 시 close 대신 재시작 로직 후속.

### 해소 이연

- **Z6-1 (신 인프라)**: 룰렛 컨트롤러 · Kyu 실기 자율 · 슈퍼 seqLen 뚫음.
- **Z6-4 (버그 fix)**: 말풍선 타이밍·위치.
- **Z6-5 (신 정본)**: 정산 0 skip.
- **Z6-3 (진단 리포트)**: 뿌리 후보 6종 명문화.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (6 커밋 squash).
- **Kyu 실기 B-9-e**: 위 통합 체크리스트 17 요건.
- **Kyu 실기 시 devtools 관찰**: `superSequence.length` 로그 + Z6-3 도장 판정 로그 → 실 뿌리 확정.

---

## Commit graph

```
8ef646ee feat(roulette): Z6 dev 컨트롤러 + 말풍선 fix + 정산 0 스트림 생략 (N0-0730-Z6)
664feae6 feat(roulette): Z5 슈퍼 loop 진단 + copyAll 배지 + 스피너 안내 (N0-0730-Z5)
97cfe68f feat(roulette): Z4 슈퍼 오인 뿌리 + AGAIN + 음수 대칭 + JACKPOT 분배 (N0-0730-Z4)
6030911d feat(roulette): Z3 payout 뿌리 + multi-target + 슈퍼 N번 스핀 (N0-0730-Z3)
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1/Z2/Z3/Z4/Z5/Z6 head = `8ef646ee`.
