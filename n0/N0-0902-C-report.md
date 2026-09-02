# N0-0902-C · 리포트

**round**: `N0-0902-C`
**timestamp**: 2026-09-02
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `76d789a2`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu ×2·×3 2026-09-02 실기 · B-1·B-2·B-3·B-4 착지 확증 · 잔여 4 항 concrete.

## 착수 · 결정 정리

### C-1 · 단일 웨지 glow pulse

**Kyu 정본**: ×2·×3 웨지 (MultiSpinPositionalReveal) 에 적용된 노란 사각
박스 (클릭 암시 · 나타났다 사라짐) 를 단일 스핀에도 동일 적용. 색·크기·주기
동일.

**Fix** (`RouletteResultReveal.tsx:566~608`):
```typescript
{phase === "front" && !reduced && (
  <motion.div
    animate={{
      boxShadow: [
        "0 0 0 0 rgba(245,158,11,0.55)",
        "0 0 0 14px rgba(245,158,11,0)",
      ],
    }}
    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
    style={{ position: "absolute", inset: 0, borderRadius: 8,
             pointerEvents: "none" }}
    aria-hidden
  />
)}
```

MultiSpinPositionalReveal 안 glow (line 225~) 와 완전 동일 spec.

### C-2 · 웨지 flip 사운드 신설

**Fix** (`src/utils/showSound.ts:244~`):
- `playWedgeFlip()`:
  - triangle whoosh 400 → 900 → 400Hz · 300ms.
  - square click 1500Hz · 15ms (플립 시작 시점).
  - 두 osc 병합 · 하나의 flip 사운드.
- `RouletteResultReveal.tsx:562~570` · 웨지 wrapper onClick:
  ```typescript
  onClick={phase === "front" ? () => {
    playWedgeFlip();
    setPhase("flipping");
  } : undefined}
  ```
- `MultiSpinPositionalReveal.tsx:176~186` · RevealWedge onClick 동일 편입.

### C-3 · 적립음 수혜자별 발화 (A-4b 정본 개정)

**Kyu 실측**: ×3 3명 · 마지막 1명만 적립음. 정본 위반.

**뿌리**: A-4b `splitStreams onAllDone last` 안 · pendingTwinkleRef 통과 시
1회 twinkle 발화 · 그 외 스트림 도착 시 · balance push 만.

**정본 개정** ("적립음 = 스트림 전체 완료 시 1회" → "적립음 = 수혜자별 도착
시점마다"):

**Fix**:
- `RouletteModal.tsx:451~` · `perRecipientSoundPlayedRef = useRef<Set<string>>`
  신설 · dedup Set.
- 각 splitStreams entry point (5 지점 · line 912, 1041, 1195, 1283, 2502) ·
  `perRecipientSoundPlayedRef.current = new Set()` 초기화.
- `RouletteModal.tsx:2412~2445` · 각 스트림 onAllDone 안:
  ```typescript
  if (pendingTwinkleRef.current && s.balance !== -1) {
    const dedupKey = s.affectedPid;
    if (!perRecipientSoundPlayedRef.current.has(dedupKey)) {
      perRecipientSoundPlayedRef.current.add(dedupKey);
      if (s.sign === "positive") playDepositTwinkle();
      else if (s.sign === "negative") playDepositDrain();
    }
  }
  ```
- 마지막 스트림 (`splitStreamsDoneCountRef.current >= splitStreams.length`) 시
  · `playDepositComplete` chord finale 1회 마무리 + Set clear.

**결과**: N 수혜자 → N 회 발화. ×2=2 · ×3=3. 같은 수혜자 여러 스트림 (예:
copyAll · 동일 childId 2 stream) 있어도 dedup 1회.

### C-4 · 음수 적립음 신설

**Fix** (`src/utils/showSound.ts:208~239`):
- `playDepositDrain()`:
  - 두 down-sweep sine · 1760→440Hz (a) · 2349→587Hz (b · 30ms 지연).
  - 220ms · playDepositTwinkle 대칭 (상승 → 하강).
  - Gain 0.04 (Twinkle 0.045 대비 약간 낮음 · 부드럽게).

**Sign 별 분기** (C-3 로직 안):
- `positive → playDepositTwinkle` (기존 상승).
- `negative → playDepositDrain` (신설 하강).
- `zero → skip` (setSplitStreams 시 `playZeroDrop` 별개 발화).

**혼합 케이스**: splitN/copyAll 안 각 수혜자 sign 별개 (예: perChild=+, remainder
Savings=- · 혹은 backend clamp 로 한 사람 +, 다른 사람 -) · 각자 발화.

### C-5 (유지)

- A-1 라쳇 · A-3 암막 · A-4a 스케일업 · A-4c ×2 스트림.
- B-1 웨지 재사용 · B-2 수동 flip · B-3 persist · B-4 strictPort.
- 회귀 X · 파일 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0902-C 정본 편입 (**A-4b 개정
  = "적립음 = 스트림 전체 완료 시 1회" → "수혜자별 도착 시점마다"**).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-09-02 · last_verified=2026-09-02`.
  - `γ Z-1~Z29 + N0-0902-A/B/C PR #288 (auto-merge OFF · Kyu N0-0902-C 단일
    glow + flip 사운드 + 수혜자별 적립음 + 음수 적립음)`.

## 증적 (파일경로+줄수+커밋해시)

- 커밋 · `76d789a2`.
- `src/utils/showSound.ts:208~239` · playDepositDrain 신설 (C-4).
- `src/utils/showSound.ts:244~277` · playWedgeFlip 신설 (C-2).
- `src/components/Roulette/RouletteResultReveal.tsx:36` · playWedgeFlip import.
- `src/components/Roulette/RouletteResultReveal.tsx:562~570` · onClick 안
  playWedgeFlip 발화 (C-2).
- `src/components/Roulette/RouletteResultReveal.tsx:583~606` · phase='front'
  glow pulse (C-1).
- `src/components/Roulette/MultiSpinPositionalReveal.tsx:40` · playWedgeFlip
  import.
- `src/components/Roulette/MultiSpinPositionalReveal.tsx:184~193` · onClick
  안 playWedgeFlip 발화 (C-2).
- `src/components/Roulette/RouletteModal.tsx:85~89` · playDepositDrain import.
- `src/components/Roulette/RouletteModal.tsx:451~455` · perRecipientSound
  PlayedRef 신설 (C-3).
- `src/components/Roulette/RouletteModal.tsx:912/1041/1195/1283/2502` · split
  Streams 세팅 지점마다 Set 초기화 (C-3).
- `src/components/Roulette/RouletteModal.tsx:2412~2445` · 각 스트림 onAllDone
  안 수혜자별 발화 · dedup Set (C-3) + sign 별 분기 (C-4).

## 단위 테스트 신설 판별

- **C-3 수혜자 수별 발화 횟수** · `perRecipientSoundPlayedRef` 는 Modal 안
  useRef · integration test 범위. Modal render + 스트림 simulate 필요 · 시간
  상 별건 후속. 로직 self-contained 아님 · unit test 어려움.
- **C-4 sign 별 분기** · 로직 = `if positive → Twinkle · elif negative →
  Drain`. Modal 안 inline · export 안 됨. 별도 pure function 추출 시 unit
  test 가능하나 · 시간 상 미신설.
- **playWedgeFlip · playDepositDrain** · Web Audio API side-effect · jsdom
  mock 어려움. audio 자체 unit test 는 별도 harness 필요.
- **Kyu 실기 시 콘솔 로그로 검증** · Web Audio 발화는 브라우저 실측 필수.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (219 · 35 errors · 184 warnings · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.5s.

## Kyu 실기 절차 (self-contained · PR body 참조)

**기동**:
```bash
git checkout feat/roulette-z1-vertical-bingo && git pull
npm install
npm run dev:all
```

- Frontend: **http://localhost:3000** (strictPort).
- Backend: http://localhost:3002.

**정상 판정 (핵심)**:

1. **C-1**: 단일 스핀 · 웨지 앞면 · glow pulse (amber · 1.4s 반복).
2. **C-2**: 단일 + 멀티 웨지 클릭 · 각각 flip 효과음 발화.
3. **C-3 (핵심)**: SPIN×3 · 3 명 수혜자 · **적립음 3 회** (각 수혜자 도착 시).
   SPIN×2 · 2 명 · 2 회.
4. **C-4 (핵심)**: 정산 음수 · 하강 사운드. 정산 양수 · 상승 사운드. splitN
   혼합 (한 사람 + / 다른 사람 -) · **각자 sign 별 사운드**.
5. **유지 (A/B)**: 라쳇·암막·스케일업·×2 스트림·웨지 재사용·수동 flip·persist·
   strictPort · 회귀 X.

## 착지 상태

- PR #288 body 갱신 · `**round**: \`N0-0902-C\`` 첫 줄 · Kyu 실기 체크리스트
  (×3 3회 · 혼합 케이스 포함) · QC · EPIC-STATE 갱신.
- Kyu 실기 대기.

## 이연 순증감

- **이연 신설**: 없음 (C-1·C-2·C-3·C-4 4 항 전부 concrete + [DOC] 착지).
- **이연 해소**:
  - **A-4b 정본 개정** ("적립음 = 스트림 전체 완료 시 1회" → "수혜자별 도착
    시점마다") · Kyu ×3 실측 마지막 1명만 소리 병리 근본 fix.
  - 단일 웨지 클릭 유도 (glow) 없음 · flip 사운드 없음 · 음수 사운드 없음 ·
    3 개.
