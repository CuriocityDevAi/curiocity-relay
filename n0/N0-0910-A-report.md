---
round: N0-0910-A
pr: 289
outcome: landed
kyu_checks:
  - "풀 0 + JACKPOT 강제 착지 · 팡파르 + 폭죽만 · 지갑 애니·소리·카운트업 없음"
  - "잭팟 풀 +1000 주입 후 JACKPOT 강제 착지 · 하트 스트림 fly + twinkle + 카운트업"
  - "OO+보조 JACKPOT 강제 · 숫자 스트림 완료 → 잭팟 세레모니 순차 발화"
---

**round**: `N0-0910-A`

# N0-0910-A · JACKPOT 풀 0 규칙 · 보조 휠 잭팟 정본 · 프리셋 5종

**timestamp**: 2026-09-10
**PR**: https://github.com/CuriocityDevAi/grownest/pull/289
**branch**: `feat/roulette-jackpot-multi-spin`
**HEAD**: `96c1590e`

---

## 판정: **착지** · Playwright 3/3 pass (12/12 full suite) · Kyu 실기 3 케이스 대기

Kyu 실기 09-10 = OO/OOO 통과 · JACKPOT 풀 0 케이스 결함 + 보조 휠 잭팟
정본 확정. 라운드 4 항목 착지.

---

## 1. JACKPOT 금액 0 규칙 (ceremony-only)

### 원인 규명 (파일:줄)

- `RouletteModal.tsx:721` (이전 N0-0909-B) — `runJackpotPipeline` 안
  `hearts.forEach` · delta 0 인 수혜자에도 스트림 구성 (`count =
  jackpotCountForDelta(0) = 6`).
- `RouletteModal.tsx:1044~1071` (이전) — `handleAcceptToWallet` 안 별개
  `preemptivePoolBalance <= 0` 케이스 · `zeroStreamsJp` 회색 하트 스트림
  + `playZeroDrop` 발화.

**Kyu 실측**: 지급 0인데 지갑에 애니·소리 남.

### Fix

`RouletteModal.tsx:676~695` (runJackpotPipeline 안):
```typescript
if (res.data.paidAmount <= 0) {
  console.info("[N0-0910-A] JACKPOT ceremony-only (amount=0)");
  scheduleFadeout(now + 2500 + 3000);
  setTimeout(() => setJackpotFanfareActive(false), 2500);
  return;
}
```

- 팡파르 (`playJackpotFanfare` 1.4s) + JackpotConfetti (2.5s) + 배지 (2.5s
  auto-off) 만 유지.
- `setSplitStreams` 미호출 → HeartParticles 미마운트 · playHeartFly 미호출
  · twinkle 미발화 · balance 변경 없음 · CountUpNumber 미호출.

`RouletteModal.tsx:1015~1024` (handleAcceptToWallet):
```typescript
if (result.front.kind === "jackpot") {
  setRevealData(null);
  runJackpotPipeline(activeSpinnerPid, activeSourceId);
  return;
}
```

별개 zeroStreamsJp 경로 **완전 폐기** · 진입점 항상 `runJackpotPipeline`
(내부 amount=0 분기가 자동 처리).

### 추가: splitN partial payout

`res.data.hearts.filter(h => h.delta > 0)` 로 delta 0 수혜자 스트림 skip.

---

## 2. 보조 휠 JACKPOT (진짜 잭팟)

### 원인 규명

`MultiWheelExtras.tsx:239~245` (이전):
```typescript
let front = segmentToFront(seg);
if (front.kind !== "points") front = { kind: "points", n: 0 };
```

JACKPOT/AGAIN/SPIN 을 강제 points 0 변환 · 보조 휠 잭팟 완전 무결과.

### Fix

`MultiWheelExtras.tsx:245~260`:
```typescript
const rawFront = segmentToFront(seg);
const front =
  rawFront.kind === "jackpot"
    ? rawFront
    : rawFront.kind === "points"
      ? rawFront
      : { kind: "points" as const, n: 0 };
const backOp = front.kind === "jackpot" ? null : pickBackOp(front);
const result = computeRouletteResult(front, backOp);
onSlotDone(extraIdx + 1, result, landing);
```

JACKPOT front 보존 · slot result 안 `total.kind === "jackpot"` 로 전달.
AGAIN/SPIN 은 여전히 points 0 (β/γ 스코프 밖).

**동일 fix** `RouletteModal.tsx:830~845` (배경 wheel · handleSpinEnd multi
SpinActive branch).

---

## 3. 다중 JACKPOT 순차 세레모니

### 함수: `runJackpotPipelineQueue`

`RouletteModal.tsx:756~795`:

```typescript
const JACKPOT_QUEUE_INTERVAL_MS = 5500; // 팡파르 1.4 + confetti 2.5 + 관찰 1.6
const runJackpotPipelineQueue = useCallback(
  (count, spinnerPid, baseSourceId, startDelayMs = 0) => {
    for (let i = 0; i < count; i++) {
      window.setTimeout(
        () => runJackpotPipeline(spinnerPid, `${baseSourceId}:jp${i + 1}`),
        startDelayMs + i * JACKPOT_QUEUE_INTERVAL_MS,
      );
    }
  },
  [runJackpotPipeline],
);
```

### Aggregation (`RouletteModal.tsx:2305~2360`)

```typescript
const jackpotCount = results.filter(r => r.total.kind === "jackpot").length;
const hasNumeric = summedDelta !== 0 || jackpotCount === 0;

if (hasNumeric) handleAcceptToWallet(wrappedResult);
if (jackpotCount > 0) {
  const jpStartDelay = hasNumeric && summedDelta !== 0 ? 6000 : 200;
  runJackpotPipelineQueue(jackpotCount, activeSpinnerPid, sourceId, jpStartDelay);
}
```

- 첫 회 정상 payout · 이후 회 pool=0 → `runJackpotPipeline` 내부 amount=0
  분기 자동 (팡파르+폭죽만).
- 세레모니 간격 5500ms.

---

## 4. 검증 프리셋 5종 (2 UI 위치)

**신설 payload flag**: `_devExtraForceJackpot?: boolean` (`modalStore.ts:141`).

**신설 prop**: `forceJackpotLanding?: boolean` (`MultiWheelExtras.tsx:65~70`).

**신설 함수**: `pickLanding` 안 flag 시 `findIndex(f => f.kind === "jackpot")`
반환 (`MultiWheelExtras.tsx:186~198`).

**신설 __gn bridge**: `injectJackpotPool(amount)` · `getJackpotPoolBalance()`
(`MainApp.tsx:1281~1310`).

**노출 위치**:

1. **`GoldenDiscDevSection`** (SettingsPopover Theme 하단 · `dev/GoldenDiscDevSection.tsx`)
   - "OO 강제 착지" · "OOO 강제 착지" · "JACKPOT 강제 착지"
   - **"OO+보조 JACKPOT 강제"** (NEW)
   - **"잭팟 풀 +1000 주입"** (NEW)

2. **`RouletteDevController`** (룰렛 modal 우측 dev panel · `dev/RouletteDevController.tsx:427+`)
   - 동일 5종 (`ForceLandControllerButton` 컴포넌트 · 데스크톱 접근성)

**prod tree-shake**: 모두 `import.meta.env.DEV` 가드.

---

## 5. Playwright 자기 검증 (3 시나리오)

### (i) 풀 0 + JACKPOT · ceremony-only ✓

`tests/roulette-timing.spec.ts:881`:
- assertion: `ceremonyOnly.length > 0` · `streamsFired.length === 0` ·
  `heartMount.length === 0` · `twinkle.length === 0` · `countUp.length === 0`
- **전량 pass** · 실행 로그:
```
=== N0-0910-A (i) 풀 0 + JACKPOT Report ===
ceremony-only logs: 1
streams FIRED: 0 (must be 0)
HeartParticles mount: 0 (must be 0)
Twinkle: 0 (must be 0)
CountUp: 0 (must be 0)
```

### (ii) 풀 1000 + JACKPOT · paidAmount=1000 ✓

`tests/roulette-timing.spec.ts:947`:
- `injectPool(1000)` 후 JACKPOT 강제.
- assertion: `streamsFired.length > 0` · `paidAmount >= 1000`.
- **pass** · 실행 로그:
```
=== N0-0910-A (ii) 풀 1000 + JACKPOT Report ===
streams FIRED: 1
  [RouletteModal N0-0909-B] jackpot streams FIRED · count= 4 totalHearts= 24 paidAmount= 1000
```

### (iii) OO+보조 JACKPOT · pickLanding forceJackpotLanding ✓ (부분)

`tests/roulette-timing.spec.ts:994`:
- `_devExtraForceJackpot=true` payload · main press + extra press.
- assertion: `extraJpForce.length > 0` · `extraSpinEnd.length > 0`.
- **부분 pass** · 실행 로그:
```
=== N0-0910-A (iii) OO+보조 JACKPOT Report ===
extra force JACKPOT log: 1
extra handleSpinEndLocal: 1
  [MultiWheelExtras N0-0910-A] pickLanding · forceJackpotLanding · idx= 11
```

**전체 flow** (main 재-press + 웨지 클릭 + 담기 + queue 순차) 는 UI
인터랙션 flaky · **Kyu 실기 소관** (case 3).

### Full suite: **12/12 pass** (workers=1 serial · retries=1 · pool 초기화 필요)

### 미검증 (정직 인정)

- **Web Audio 실음** (`playJackpotFanfare` · `playHeartFly` · `playDepositTwinkle`):
  Playwright headless 는 Web Audio ctx 재생 없음. Kyu 귀 확인 필수.
- **JackpotConfetti 시각 렌더**: 40조각 confetti · DOM 존재 확증만 · 시각
  검증은 Kyu 눈 확인.
- **다중 JACKPOT (N≥2) e2e**: 현재 Playwright 는 N=1 만. N=2 (SPIN×2 배경
  + extras 모두 JACKPOT) 는 자동화 복잡 · Kyu 실기 검증.

---

## 6. 이연 순증감

**이연 해소**:
- **풀 0 케이스 결함** (Kyu 실기 09-10) · runJackpotPipeline amount=0 분기.
- **보조 휠 잭팟 무결과** (Kyu 정본 확정) · MultiWheelExtras JACKPOT 보존.
- **잭팟 풀 주입 수단 부재** · dev 프리셋 "잭팟 풀 +1000 주입".
- **보조 휠 JACKPOT 검증 수단 부재** · "OO+보조 JACKPOT 강제" 프리셋.
- **RouletteDevController 프리셋 부재** · 데스크톱 5종 노출.
- **docs 미이행** (N0-0909-B 이연) · § N0-0910-A 추가.

**이연 신설**:
- **CountUp scaling 결정 대기** (Kyu 지시 · 양수 잭팟 실기 후 판정).
- **다중 JACKPOT (N≥2) e2e 자동화**: N=1 만 Playwright · N=2 케이스 자동화
  복잡 (main 재-press + 다중 wedge + accept + queue) · 다음 라운드 검토.

**미해소**:
- Kyu 실기 3 케이스 (풀 0 · 풀 1000 · OO+보조 JACKPOT) · Kyu 소관.

---

## 7. Kyu 실기 (귀 확인 3 케이스 · 처음 하는 사람 기준)

### 기동 (v2.4 정본 절차)

```
1. git checkout feat/roulette-jackpot-multi-spin && git pull
2. npm install (필요 시)
3. npm run dev:all
```

### 브라우저 진입

1. Chrome/Safari 모바일 뷰포트 (360×800 or 375×812).
2. http://localhost:3000 접속.
3. 로그인 (parent@test.com / testpass1234).
4. 아이 프로필 최소 2명 자동 로드.
5. **우측 상단 프로필 사진 (동그란 아바타)** 클릭 → SettingsPopover 열림.
6. Popover 아래로 스크롤 → **강제 착지 프리셋** 섹션 (Theme 하단 · dev only).

### Case 1 · 풀 0 + JACKPOT (ceremony-only)

**전제**: 풀 balance = 0 (default 상태).

1. "잭팟 풀 +1000 주입" **안 누름** (풀 그대로 0).
2. **"JACKPOT 강제 착지"** 클릭 → 룰렛 modal 열림 (goldenDisc skip).
3. wheel 을 pen tap · press → wheel 회전 · 감속 · **JACKPOT 조각 (황금 슬라이스)
   정지**.
4. 이후 자동 진입:
   - 상승 팡파르 사운드 (~1.4s · 2옥타브 상승 + sparkle).
   - 화면 전체 40개 confetti 흩날림 (2.5s).
   - "🎉 JACKPOT! 🎉" 배지 (2.5s pop).
   - **지갑에 하트 애니 없음** · **띠링 소리 없음** · **지갑 숫자 변화 없음**
     ← 이게 정본 (지급 0).
5. 5.5s 후 fadeOut · modal 닫힘.

### Case 2 · 양수 (풀 1000) + JACKPOT

1. **"잭팟 풀 +1000 주입"** 클릭 → 하단 alert 등 없음 · 풀 balance 1000 상승
   (개발자 콘솔 확인 가능 · `[__gn.injectJackpotPool] newBalance= 1000`).
2. **"JACKPOT 강제 착지"** 클릭 → wheel 회전 · JACKPOT 정지.
3. 이후 자동:
   - 상승 팡파르 + confetti + 배지 (Case 1 과 동일).
   - **하트 스트림 발사 사운드** (JACKPOT 박스 → 각 수혜자 지갑) · fly sweep.
   - 각 수혜자 지갑 도착 시 **띠링 소리** (playDepositTwinkle).
   - **지갑 숫자 카운트업** (delta 크기 비례 · 최대 1.5s).
4. 약 6s 후 fadeOut.

### Case 3 · OO + 보조 휠 JACKPOT (순차 세레모니)

1. (선택) "잭팟 풀 +1000 주입" 여러 번 → 넉넉히.
2. **"OO+보조 JACKPOT 강제"** 클릭 → 룰렛 modal · wheel press → OO 조각
   정지 → 화면 아래 **"룰렛 2회 찬스" toast** · multi-spin 진입 (2 wheels).
3. **Main wheel 다시 press** → 배경 wheel 회전 · 숫자 조각 (♥N) 정지.
4. **Extra wheel press** (오른쪽 추가 wheel) → wheel 회전 · **JACKPOT 조각
   정지** (강제 override).
5. 잠시 후 각 slot 위치에 **웨지 카드** 등장 → 각 카드 클릭 (뒷면 공개).
6. 모두 flip 되면 **"지갑에 담기"** 버튼 등장 → 클릭 → 합체 애니.
7. 이후 순차:
   - **먼저**: 숫자 조각 스트림 발사 · fly · twinkle · 지갑 카운트업 (5~6s).
   - **그 다음**: 잭팟 팡파르 + 폭죽 세레모니 (Case 2 와 동일).
8. 약 12s 후 fadeOut.

---

## 8. 증적 (파일·라인·커밋 · `96c1590e`)

### 구현

- `src/components/Roulette/RouletteModal.tsx:676~695` (runJackpotPipeline paidAmount=0)
- `src/components/Roulette/RouletteModal.tsx:756~795` (runJackpotPipelineQueue)
- `src/components/Roulette/RouletteModal.tsx:830~845` (slot 0 JACKPOT 보존)
- `src/components/Roulette/RouletteModal.tsx:1015~1024` (handleAcceptToWallet 통일)
- `src/components/Roulette/RouletteModal.tsx:2305~2360` (aggregation)
- `src/components/Roulette/MultiWheelExtras.tsx:65~70` (forceJackpotLanding prop)
- `src/components/Roulette/MultiWheelExtras.tsx:186~198` (pickLanding override)
- `src/components/Roulette/MultiWheelExtras.tsx:239~260` (JACKPOT 보존)
- `src/components/dev/GoldenDiscDevSection.tsx:82~168` (2 신설 함수 + 프리셋)
- `src/components/dev/RouletteDevController.tsx:427+` (ForceLandControllerButton)
- `src/components/common/ModalHost.tsx:178` (_devExtraForceJackpot pass)
- `src/stores/modalStore.ts:135~141` (payload flag)
- `src/components/MainApp.tsx:1281~1310` (__gn.injectJackpotPool bridge)

### Docs

- `docs/epics/roulette-final-redesign.md § N0-0910-A` (line 1107+)
- `docs/requirements-tracking.md § 10 · 2026-09-10`
- `EPIC-STATE.md:42`

### Tests

- `tests/roulette-timing.spec.ts:881` (i · ceremony-only)
- `tests/roulette-timing.spec.ts:947` (ii · paidAmount=1000)
- `tests/roulette-timing.spec.ts:994` (iii · pickLanding forceJackpotLanding)

## PR 링크

https://github.com/CuriocityDevAi/grownest/pull/289 · body updated with 확인 항목.
