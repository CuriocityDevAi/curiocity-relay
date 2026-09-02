# N0-0902-A · 리포트

**round**: `N0-0902-A`
**timestamp**: 2026-09-02
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `3cd099a7`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu 2026-09-02 ×2·×3 실기 · 4 항 (A-2 설계 변경 포함) concrete + [DOC].

## 착수 · 결정 정리

### A-1 · 라쳇 독립화 (진단 → fix)

**진단 (Kyu 요구 · 뿌리 특정)**:

- `src/utils/soundFx.ts:172~` Z28-2 `startRatchetLoop(id)` · `setInterval
  100ms` · `Map<string, timer>` 저장.
- 각 tick = `playRatchetTick()` 안 새 `OscillatorNode` + `GainNode` 인스턴스 ·
  Web Audio 는 동시 여러 소스 연주 지원 · 병합/throttle 없음.
- **코드 상 이론상 독립** · N wheel = N interval = N 독립 tick.

**Kyu 실측 (밀도 증가 미미) 뿌리 후보**:

1. **동기 시작**: 두 wheel 이 동시에 `startRatchetLoop` 호출 · setInterval 이
   동일 시각 시작 → tick 이 100ms 단위 동시 발화 → "한 소리 크게" 인식.
2. **볼륨**: 0.03 작음 · 겹침 인식 어려움.
3. **동일 대역**: 모든 wheel tick freq 600~800Hz · 톤 구분 없음.

**Fix** (`soundFx.ts:224~`):
- `startRatchetLoop` 시 `offsetMs = Math.floor(Math.random() * 90)` 지연 ·
  setTimeout 후 setInterval 시작 → 두 wheel tick 시각 어긋남.
- `baseFreqForId(id)` · djb2-lite hash · 500~1000Hz range 안정 매핑 · id 별
  톤 차등.
- volume 0.03 → 0.045.
- tick 마다 `baseFreq ± 100` 랜덤 변주.

### A-2 · 순차 공개 폐지 → 위치별 동시 표시 + 수동 뒤집기 (설계 변경)

**Kyu 정본**:
> "모든 wheel 이 멈추면 각 wheel 결과를 동시에 표시. 표시 위치 = 그 wheel
> 중심에서 약간 위. 뒷면 공개는 자동 진행하지 않는다. 사람이 판을 클릭해야
> 뒤집힌다. 모든 판을 뒤집어야 합산 결과·[담기] 로 넘어간다. 순차 공개
> 타이머·연출은 제거한다."

**폐기**:
- Z22-1 `multiRevealIdx` state · `useEffect` auto-advance 3500ms.
- Z22-1 Reveal container 매 slot mount/unmount.

**신설**: `src/components/Roulette/MultiSpinPositionalReveal.tsx`.

- `slots: Array<{ result, landingIndex, position: {x, y} }>` · `onAllFlipped`
  콜백.
- 각 slot 별 `RevealPiece` (motion.button rotateY 180 flip).
- 앞면: 노란 gradient + border + `#{slotIdx+1}` + `formatFront(front)` + "탭
  하여 공개 ↺" 배지. `boxShadow` pulse (Kyu 정본 "클릭 대상 시각화").
- 뒷면: 초록 border + `formatFront × formatBackOp` + `formatTotal` (색 sign
  별).
- 모든 slot flipped 감지 → 300ms 후 `onAllFlipped()`.

**Modal 통합**:
- `multiRevealIdx` useEffect 로직 (dead) 유지 하나 실행 안 함.
- 전 slot done 감지 (`allSlotsDone = multiSpinSlots.every(...)`) → Positional
  Reveal 렌더.
- Slot 위치 계산:
  - slot 0 = `{ x: vw/2 + bgTranslateX, y: vh/2 + bgTranslateY }`.
  - slot 1..N-1 = ExtraCell finalX/Y 로직 재사용 · Modal 안 inline (fit ·
    N=2/N=3 · horizontal/역삼각).
- `onAllFlipped` → `setMultiSpinResultReady(true)` → MultiSpinResultCard 등장.

### A-3 · 암막 깜빡임 (재발)

**뿌리**: Z22-1 순차 Reveal 시 Reveal container (z 70 · backdrop rgba) 매
slot mount/unmount · fade in/out 사이 dim 없음 순간.

**A-2 로 자동 해결**: MultiSpinPositionalReveal 은 전 slot done 시 1 회 mount ·
flip transition 은 내부 · 재-mount 없음. Sticky dim (z 68) 은 positional
active or resultReady 동안 상시 유지.

### A-4 (a) · 합체 스케일업 회귀

**뿌리**: Modal 안 `mergeStage='merged'` 진입 시 `setMultiSpinActive(false)`
→ `multiAutoScale` 재계산 (`multiSpinCount=0` → `N=1` → `finalScale=1`) →
scale keyframes `[1, 1]` 무효 · 크기 변화 없음.

**Fix** (`RouletteModal.tsx:1514~`):
```typescript
const cachedMergeFromScaleRef = useRef<number>(1);
useEffect(() => {
  if (multiSpinActive && multiSpinCount >= 2) {
    cachedMergeFromScaleRef.current = multiAutoScale.finalScale;
  }
}, [multiSpinActive, multiSpinCount, multiAutoScale.finalScale]);
```

wheel wrapper animate:
```typescript
scale: mergeStage === "merged" ? [cachedMergeFromScaleRef.current, 1] : 1,
```

merged 진입 이전 finalScale 캐시 · autoScale 재계산 무효화.

### A-4 (b) · 적립음 순서 fix

**뿌리**: `handleAcceptToWallet` 진입 즉시 twinkle 12회 발화 (Z14-3 위치 정합
· 하지만 스트림 발화 시점보다 먼저 · Kyu 정본 순서 = 스트림 → 도착 → 적립음).

**Fix**:
- `pendingTwinkleRef = useRef<boolean>(false)`.
- handleAcceptToWallet 진입 시 · `pendingTwinkleRef.current = willTwinkle` ·
  즉시 발화 대신 플래그만 세팅.
- splitStreams onAllDone (마지막 도착) 시 · `if (pendingTwinkleRef.current)`
  · twinkle 12 stagger + `playDepositComplete` finale.

정본 순서 = 스트림 → 도착 → 적립음 → 카운트업.

### A-4 (c) · ×2 스트림 없음

**뿌리**: single flow (`distributionMode === "single"`) 는 Reveal 안 particles
로만 스트림. MultiSpin ×2 → 합체 → Reveal unmount → 스트림 소스 없음.

**Fix** (`RouletteModal.tsx:1290~`): single flow · `if (delta !== 0)` 시
splitStreams 세팅 (1 개):
```typescript
const singleStream = {
  key: `single-${childId}`,
  sign: delta > 0 ? "positive" : "negative",
  originKind: delta > 0 ? "wheel" : "wallet",
  targetKind: delta > 0 ? "wallet" : "jackpot",
  affectedPid: childId,
  balance: res.data.newBalance,
  count: Math.max(1, Math.min(6, Math.ceil(Math.abs(delta) / 20))),
};
setSplitStreams([singleStream]);
```

splitStreams onAllDone → balance push + A-4b twinkle 발화. 스트림 자동 발화.

## Kyu 실기 절차 (self-contained · PR body 참조)

**기동**:
```bash
git checkout feat/roulette-z1-vertical-bingo && git pull
npm install
npm run dev:all
```

- Frontend: http://localhost:5173 · Backend: http://localhost:5001.
- APP_ENV=development · DB_NAME=grownest_dev · STORAGE_ROOT=uploads-dev.

**Dev Controller 진입**:
- 로그인 → 빙고 완성 or dev controller `[가로/세로 재발화]` 로 룰렛 modal 열기.
- Modal 우측 `[DEV] 룰렛 컨트롤러` 확인.

**정상 판정 (전 8 케이스)**:
1. A-1 라쳇 · 두 wheel 어긋난 시점 스핀 시 · 겹침 밀도 증가 감지 · wheel
   별 톤 차등.
2. A-1 · wheel 정지 시 그 라쳇만 감쇠.
3. A-2 · 모든 wheel 정지 후 조각 카드 동시 표시 (좌·우 각자).
4. A-2 · 카드 앞면 glow pulse + "탭하여 공개" 배지 · 클릭 → flip.
5. A-2 · 모든 판 flip → 합산 카드 → [담기].
6. A-3 · 조각 카드 전환 시 화면 깜빡임 없음.
7. A-4a · 합체 시 wheel 부드럽게 base 크기 확대.
8. A-4b/c · 담기 → 스트림 → 도착 → 적립음 → 카운트업 순서 · ×2 도 스트림
   발화.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0902-A 정본 편입 (Z22-1 순차
  Reveal 폐지 명시 · Z28-3 sticky dim 단순화 · A-1~A-4 상세).
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-09-02 · last_verified=2026-09-02`.
  - `γ Z-1~Z29 + N0-0902-A PR #288 (auto-merge OFF · Kyu N0-0902-A 순차 폐지
    → 위치 flip 설계 변경 + 라쳇 offset + 스케일업 회귀 + 적립음 순서 + ×2
    스트림)`.

## 증적 (파일경로+줄수+커밋해시)

- 커밋 · `3cd099a7`.
- `src/utils/soundFx.ts:172~250` · A-1 라쳇 재작성 (offset · baseFreq · volume).
- `src/components/Roulette/MultiSpinPositionalReveal.tsx:1~257` · A-2 신설 파일.
- `src/components/Roulette/RouletteModal.tsx:88` · import · positional reveal.
- `src/components/Roulette/RouletteModal.tsx:361~372` · Z22-1 useEffect 폐지
  (multiRevealIdx auto-advance 제거).
- `src/components/Roulette/RouletteModal.tsx:2020~` · MultiSpinPositionalReveal
  렌더 · slot 위치 계산 · sticky dim 조건 통합.
- `src/components/Roulette/RouletteModal.tsx:480~486` · pendingTwinkleRef.
- `src/components/Roulette/RouletteModal.tsx:895~910` · A-4b willTwinkle 즉시
  발화 폐지 · flag 세팅만.
- `src/components/Roulette/RouletteModal.tsx:2373~2400` · A-4b splitStreams
  onAllDone last · pending twinkle 발화.
- `src/components/Roulette/RouletteModal.tsx:1514~1527` · A-4a cachedMerge
  FromScaleRef · useEffect 캐시.
- `src/components/Roulette/RouletteModal.tsx:1937~1946` · A-4a wheel wrapper
  animate scale keyframes cached 값 사용.
- `src/components/Roulette/RouletteModal.tsx:1290~1320` · A-4c single flow
  splitStreams 세팅.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline 유지 (218 · 35 errors · 183 warnings · 신규 없음).
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 14.4s.
- **단위 테스트 신설 판별**: A-1 `baseFreqForId` 는 파일 내 non-export function
  · 별도 export 없이는 unit test 불가 · 향후 refactor 시 편입. A-4c `single
  flow splitStreams` 는 handleAcceptToWallet 안 state flow · integration test
  범위 · 향후 별건.

## 착지 상태

- PR #288 body 갱신 · Kyu 실기 절차 self-contained (기동 명령·주소·DEV 컨트
  롤러 진입·정상 판정 8 케이스) · QC · EPIC-STATE 갱신.
- Kyu 실기 대기 · approve 후 auto-merge.

## 다음 라운드 예약

Kyu 실기 결과에 따라:

- A-1 라쳇 감지 여전 미미 시 · volume/톤 재조정.
- A-2 flip UX 개선 (카드 크기·위치 미세조정).
- A-4b 스트림→적립음 timing 조정.
- 실기 이상 없으면 · PR #288 최종 도장 · γ 후속 (JACKPOT/AGAIN multiSpin
  slot · ④/⑤ 스코프).

## 이연 순증감

- **이연 신설**: 없음 (A-1·A-2·A-3·A-4(a/b/c) 6 항 전부 concrete + [DOC]
  착지).
- **이연 해소**:
  - Z22-1 순차 Reveal 로직 (설계 변경 · 폐기).
  - Z28-3 sticky dim 조건 단순화 (positional reveal 통합).
  - A-4a 합체 스케일업 회귀 · A-4b 적립음 순서 · A-4c ×2 스트림 · 3 개 회귀
    fix.
