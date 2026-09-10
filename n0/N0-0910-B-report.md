---
round: N0-0910-B
pr: 289
outcome: landed
kyu_checks:
  - "풀 1000 + JACKPOT 강제 착지 · 하트 스트림 좌상단 잭팟 통에서 출발"
  - "풀 0 + JACKPOT 강제 착지 · 폭죽 후 결과 창 '잭팟에 하트포인트가 없습니다.' + [확인] · 하강 2음 · 모달 닫힘"
---

**round**: `N0-0910-B`

# N0-0910-B · 잭팟 스트림 출발점 잭팟 통 + 풀 0 결과 창

**timestamp**: 2026-09-10
**PR**: https://github.com/CuriocityDevAi/grownest/pull/289
**branch**: `feat/roulette-jackpot-multi-spin`
**HEAD**: `c7467575`

---

## 판정: **착지** · Playwright 3/3 pass · Kyu 실기 2 케이스 대기

Kyu 실기 09-10 잔여 2건 (스코프 확장 금지 · 2건만 착지).

---

## 1. 잭팟 스트림 출발점 = 잭팟 통

### 원인 규명 (파일:줄)

- `RouletteModal.tsx:2437~2465` (splitStreams 렌더링 block) · origin
  resolution `originKind === "wheel"` → `wheelCenter` (window center).
- `RouletteModal.tsx:720/732/746` (이전 · N0-0909-B/N0-0910-A) ·
  `runJackpotPipeline` 안 스트림 3 지점 · `originKind: "wheel"` 로 세팅.
- 결과: JACKPOT 하트 스트림이 룰렛 중앙에서 출발.

### Fix

- `RouletteModal.tsx:409~412` · Stream type 확장:
  ```typescript
  originKind: "wheel" | "wallet" | "savings" | "jackpotBox"; // NEW
  ```
- `RouletteModal.tsx:2461~2467` · rendering block · resolve `"jackpotBox"`
  → `jackpotAnchor` (jackpotBoxAnchorRef.current ?? `{x:60,y:80}`).
- `RouletteModal.tsx:720/732/747` · runJackpotPipeline 안 모든 3 스트림
  지점 (splitN hearts · savings · single) · `originKind: "jackpotBox"` 로
  교체.
- 다중 잭팟 큐도 동일 `runJackpotPipeline` 사용 · 자동 잭팟 통 출발.

### Fallback

JackpotBox 미마운트 시 좌상단 근사 `{60, 80}` (기존 Z11-2 fallback 유지).

### DEV 확증 로그

`RouletteModal.tsx:800` · streams FIRED log 안 `originKind` 노출:
```
[N0-0909-B] jackpot streams FIRED · count= 4 totalHearts= 24
paidAmount= 1000 spinnerPid= stu_... originKind= jackpotBox
```

---

## 2. 풀 0 잭팟 = 폭죽 후 결과 창

### 원인 규명

`RouletteModal.tsx:701~716` (N0-0910-A ceremony-only branch):
- `paidAmount === 0` 시 팡파르 + confetti + 배지 발화 후 `scheduleFadeout`
  (2500 + 3000ms) 만 예약 · 모달 조용히 닫힘.
- Kyu 실측 = "폭죽 뒤 아무 안내 없이 닫힘".

### Fix (신설)

**컴포넌트** (`src/components/Roulette/JackpotEmptyResultCard.tsx`):
- 문구 = **"잭팟에 하트포인트가 없습니다."** (line 60).
- [확인] 버튼 (accent color · minHeight 48).
- MultiSpinResultCard 스타일 매칭 (z 85 · `#FFFEFB` · 시맨틱 토큰).
- `data-jackpot-empty-card` 안 · 테스트/Playwright 접근.

**사운드** (`src/utils/showSound.ts:73~97`):
- `playJackpotEmpty()` · 하강 2음:
  - A4 (440Hz) 200ms · sine
  - E4 (329.63Hz) 320ms · sine · 180ms delay
- Web Audio 자체 생성 (외부 파일 없음 · CC0 무관).
- 기존 `playZeroDrop` (툭) 사용 금지 · 회색 하트 애니 사용 금지.
- DEV 로그: `[playJackpotEmpty N0-0910-B] fired · ctx= ...`.

**Modal state** (`RouletteModal.tsx:339~343`):
```typescript
const [jackpotEmptyCardActive, setJackpotEmptyCardActive] =
  useState<boolean>(false);
```

**Pipeline 시그니처 확장** (`RouletteModal.tsx:668~672`):
```typescript
const runJackpotPipeline = useCallback(
  (spinnerPid, sourceId, isLast = true) => { ... }
);
```

- default `true` (자연 착지 / dev 프리셋 = 단일 잭팟 = 항상 last).
- 큐에서만 중간 회차 `false`.

**paidAmount=0 + isLast=true 분기** (`RouletteModal.tsx:711~734`):
```typescript
if (res.data.paidAmount <= 0) {
  window.setTimeout(() => setJackpotFanfareActive(false), 2500);
  if (isLast) {
    window.setTimeout(() => {
      setJackpotEmptyCardActive(true);
      console.info("[N0-0910-B] jackpot empty card SHOWN · poolBalance=0");
    }, 2500);
    // scheduleFadeout 은 사용자 [확인] click 안에서.
  } else {
    // 중간 회차 · fadeout 없이 다음 세레모니로.
  }
  return;
}
```

**[확인] handler** (`RouletteModal.tsx:2438~2455`):
```typescript
{jackpotEmptyCardActive && (
  <JackpotEmptyResultCard
    onConfirm={() => {
      console.info("[N0-0910-B] jackpot empty card CONFIRM ...");
      playJackpotEmpty();
      setJackpotEmptyCardActive(false);
      scheduleFadeout(performance.now() + 500); // 하강 2음 후 fadeOut.
    }}
  />
)}
```

---

## 3. 다중 잭팟 큐 · 마지막 회차 1회만

### Fix (`RouletteModal.tsx:843~865`)

```typescript
for (let i = 0; i < count; i++) {
  const isLast = i === count - 1;
  window.setTimeout(() => {
    runJackpotPipeline(spinnerPid, `${baseSourceId}:jp${i + 1}`, isLast);
  }, startDelayMs + i * JACKPOT_QUEUE_INTERVAL_MS);
}
```

- **N=1** (단일 잭팟) · isLast=true → 창 1회.
- **N=2** (SPIN×2 · extras JACKPOT) · [tick 1 (isLast=false · pool>0 정상
  payout) → tick 2 (isLast=true · pool=0 → ceremony-only + 창 1회)].
- **N=3** (SPIN×3 · extras 모두 JACKPOT) · tick 1 (payout) → tick 2/3
  (pool=0 · tick 3 만 isLast=true → 창 1회).

**Kyu 정본 정합**: "연속 N회 창 금지 · 큐 종료 시점에 1회".

---

## 4. Playwright 자기 검증 (3 시나리오)

### (i) 풀 1000 + JACKPOT · origin = 잭팟 통 ✓

`tests/roulette-timing.spec.ts:1099`:
- `injectPool(1000)` → JACKPOT 강제.
- assertion: `streamsFired[0].text` 안 `originKind= jackpotBox` 확증 ·
  `JackpotBox rect` exists.
- **PASS** · 실행 로그:
```
[RouletteModal N0-0909-B] jackpot streams FIRED · count= 4 totalHearts= 24
paidAmount= 1000 spinnerPid= stu_1777... originKind= jackpotBox
```

### (ii) 풀 0 + JACKPOT · 결과 창 + 확인 + playJackpotEmpty ✓

`tests/roulette-timing.spec.ts:1151`:
- JACKPOT 강제 · 8000ms 대기.
- assertion:
  - `[data-jackpot-empty-card]` visible.
  - text 안 "잭팟에 하트포인트가 없습니다.".
  - [확인] click.
  - `playJackpotEmpty` 로그 1회.
  - `getModalType() !== "ROULETTE"` (모달 닫힘).
- **PASS** · 실행 로그:
```
[N0-0910-A] JACKPOT ceremony-only (amount=0) · poolBalance= 0 isLast= true
[N0-0910-B] jackpot empty card SHOWN · poolBalance=0
emptyCard visible: true
emptyCard text: 잭팟에 하트포인트가 없습니다.확인
[ii] 확인 clicked
[N0-0910-B] jackpot empty card CONFIRM · playJackpotEmpty + fadeOut
[playJackpotEmpty N0-0910-B] fired · ctx= 3.100
modalType after confirm: NONE
```

### (iii) 풀 0 · 자연 JACKPOT · 큐 없음 · card 1회 ✓

`tests/roulette-timing.spec.ts:1231`:
- Single JACKPOT · isLast=true default.
- assertion: `emptyCardShownLogs.length === 1`.
- **PASS** · 자연 착지 pool=0 시 창 1회만.

### Full suite: **15/15 pass** (workers=1 serial · retries=1 flake 커버)

### 미검증 (정직 인정)

- **Web Audio 실음** (`playJackpotEmpty`): Playwright headless · 재생 없음
  · Kyu 귀 확인 필수.
- **Card 시각 스타일**: DOM/문구 확증 · 실 UI 렌더링 Kyu 눈 확인 필수.
- **다중 잭팟 N≥2 full flow e2e**: N=1 만 자동화 · N=2 시나리오 (배경 wheel
  숫자 + extras JACKPOT + pool=0) 자동화 복잡 · Kyu 실기 검증.

---

## 5. 이연 순증감

**이연 해소**:
- **잭팟 출발점 결함** (Kyu 실기 09-10 잔여 1) · Stream.originKind 확장 +
  runJackpotPipeline 3 지점 교체.
- **풀 0 안내 부재** (Kyu 실기 09-10 잔여 2) · JackpotEmptyResultCard +
  playJackpotEmpty + isLast 파라미터.

**이연 신설**:
- **다중 잭팟 (N≥2) 결과 창 e2e 자동화**: 현재 (iii) 는 N=1 만 · N=2 시나리오
  Playwright full-run 은 UI 인터랙션 복잡 (배경 wheel 재-press + 웨지 클릭 +
  담기 + queue) · Kyu 실기 검증 이양.

**미해소**:
- Kyu 실기 2 케이스 (풀 1000 출발점 · 풀 0 결과 창) · Kyu 소관.
- CountUp scaling 결정 대기 (기존 이연 유지).
- JackpotConfetti CSS 시맨틱 (기존 이연 유지).

---

## 6. Kyu 실기 (귀 확인 2 케이스 · 처음 하는 사람 기준)

### 기동 (v2.4 정본 절차)

```
1. git checkout feat/roulette-jackpot-multi-spin && git pull
2. npm install (필요 시)
3. npm run dev:all
```

### 브라우저 진입

1. Chrome/Safari 모바일 뷰포트.
2. http://localhost:3000 접속.
3. 로그인 (parent@test.com / testpass1234).
4. 아이 프로필 최소 2명 자동 로드.
5. **우측 상단 프로필 사진 (동그란 아바타)** 클릭 → SettingsPopover 열림.
6. Popover 아래 **강제 착지 프리셋** 섹션 (Theme 하단 · dev only).

### Case 1 · 풀 1000 + JACKPOT · 출발점 검증

1. **"잭팟 풀 +1000 주입"** 클릭 → 풀 balance 1000 상승 (콘솔 확인:
   `[__gn.injectJackpotPool] newBalance= 1000`).
2. **"JACKPOT 강제 착지"** 클릭 → 룰렛 modal 열림 · wheel 을 pen tap · press
   → wheel 회전 · 감속 · **JACKPOT 조각 (황금 슬라이스) 정지**.
3. 이후 자동:
   - 상승 팡파르 사운드 (~1.4s).
   - 화면 전체 confetti 폭죽 (2.5s).
   - **하트 스트림이 좌상단 잭팟 통 (풀 표시 박스) 에서 출발** ← 이게 정본.
   - 각 수혜자 지갑으로 하트 fly · 도착 시 twinkle · 지갑 카운트업.
4. **실패 조건**: 하트 스트림이 룰렛 중앙에서 출발하면 실패.

### Case 2 · 풀 0 + JACKPOT · 결과 창

1. **잭팟 풀 +1000 주입 안 누름** (풀 balance = 0 default).
2. **"JACKPOT 강제 착지"** 클릭 → 룰렛 modal · wheel press → JACKPOT 정지.
3. 이후 자동:
   - 팡파르 (~1.4s) + confetti (2.5s) + 배지 (~2.5s auto-off).
   - 폭죽 끝난 뒤 (~2.5s 후) **화면 중앙 결과 창** 등장:
     - 문구 = **"잭팟에 하트포인트가 없습니다."** (bold · 15px).
     - 아래 **[확인]** 버튼 1개 (accent 색 · 크게).
4. **[확인] 클릭** → **하강 2음 사운드** ('womp' · A4→E4 · ~500ms) → 모달
   닫힘 (fadeOut ~360ms 후).
5. **실패 조건**: 기존 zero-drop 회색 하트 애니 (툭 소리) 나오면 실패.

---

## 7. 증적 (파일·라인·커밋 · `c7467575`)

### 구현

- `src/components/Roulette/RouletteModal.tsx:412` (Stream.originKind 확장)
- `src/components/Roulette/RouletteModal.tsx:2461~2467` (rendering block)
- `src/components/Roulette/RouletteModal.tsx:720/732/747` (jackpotBox origin)
- `src/components/Roulette/RouletteModal.tsx:800` (originKind DEV log)
- `src/components/Roulette/RouletteModal.tsx:339~343` (jackpotEmptyCardActive state)
- `src/components/Roulette/RouletteModal.tsx:668~672` (isLast 파라미터)
- `src/components/Roulette/RouletteModal.tsx:711~734` (paidAmount=0 + isLast branch)
- `src/components/Roulette/RouletteModal.tsx:843~865` (queue isLast 계산)
- `src/components/Roulette/RouletteModal.tsx:2438~2455` (card render + handler)
- `src/components/Roulette/JackpotEmptyResultCard.tsx` (신설)
- `src/utils/showSound.ts:73~97` (playJackpotEmpty 신설)

### Docs

- `docs/epics/roulette-final-redesign.md § N0-0910-B` (line 1284+)
- `docs/requirements-tracking.md § 10 · 2026-09-10 N0-0910-B`
- `EPIC-STATE.md:42`

### Tests

- `tests/roulette-timing.spec.ts:1099` (i · originKind=jackpotBox)
- `tests/roulette-timing.spec.ts:1151` (ii · card DOM + [확인] + playJackpotEmpty)
- `tests/roulette-timing.spec.ts:1231` (iii · card 1회)

## PR 링크

https://github.com/CuriocityDevAi/grownest/pull/289 · body updated with 확인 항목.
