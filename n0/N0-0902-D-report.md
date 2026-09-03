# N0-0902-D · 리포트

**round**: `N0-0902-D`
**timestamp**: 2026-09-03
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `755f7c02`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu 2026-09-03 · C 착지 확증 (C-1 glow · C-3 수혜자별 발화 ×3 3회·×2 2회·
혼합 케이스 각자 sign) · 잔여 5 항 concrete.

## 착수 · 결정 정리

### D-1 · 음수 무음 뿌리 fix (최우선)

**Kyu 실측**: 정산 음수 = 무음. C-4 playDepositDrain + sign 분기 있으나
발화 안 함.

**뿌리 확정** (`RouletteModal.tsx:871`):
- A-4b + C-4 → `willTwinkle = !isJackpot && !isSpin && delta > 0` · **delta
  > 0 만 pendingTwinkleRef true**.
- 음수 flow (delta < 0) 시 · `pendingTwinkleRef.current = false`.
- C-3 각 스트림 onAllDone 안 · `if (pendingTwinkleRef.current && ...)` gate
  통과 안 함 → Drain 발화 skip.

**Kyu 서술 정합**: "지갑 숫자가 감소하고 · 하트 스트림이 잭팟으로 날아감". 즉
음수 흐름은 wallet → jackpot (origin/target 반전). C-3 dedup key 는
`s.affectedPid` (childId 그대로 · target 방향 무관). sign 별 분기는 정확.
뿌리 = pendingTwinkleRef 조건이 delta>0 만.

**Fix** (`RouletteModal.tsx:871~877`):
```typescript
const willPlayDeposit = !isJackpot && !isSpin && delta !== 0;
pendingTwinkleRef.current = willPlayDeposit;
```

정본 = 양수·음수 모두 pending · zero 만 skip. C-3 dedup 안 sign 별 발화
그대로 · negative 시 Drain 정상.

### D-2 · 카운트업 소리 종속 (정본 박제)

**Kyu 정본**:
> "카운트업 시간은 사운드 길이에 종속된다. 소리 4음절 상승이 다 울릴 때까지
> 숫자가 오르고 있어야 한다. 소리 길이·카운트업 시간을 각각 하드코딩하지
> 말고 한쪽이 다른 쪽을 참조."

**Fix 1 - 순수 함수 신설** (`src/utils/depositSoundDuration.ts`):
```typescript
export const DEPOSIT_SOUND_NOTE_COUNT = 4;
export const DEPOSIT_SOUND_NOTE_MS = 100;
export const DEPOSIT_SOUND_TAIL_MS = 60;
export const DEPOSIT_COUNTUP_GRACE_MS = 100;

export function getDepositSoundDurationMs(_sign): number {
  return NOTE_COUNT * NOTE_MS + TAIL_MS;  // 460ms
}
export function getCountUpDurationMs(sign): number {
  return getDepositSoundDurationMs(sign) + DEPOSIT_COUNTUP_GRACE_MS;  // 560ms
}
```

**Fix 2 - 사운드 재작성** (`showSound.ts:playDepositTwinkle`):
- 4음정 상승 아르페지오 C-E-G-C (523.25 · 659.25 · 783.99 · 1046.5Hz).
- 각 음 100ms · tail 60ms · 총 460ms · duration 은 순수 함수 상수 참조.
- playDepositDrain 도 재작성 · 4음정 하강 C-G-E-C.

**Fix 3 - CountUpNumber duration 연결** (`CarouselParticipant.tsx:158~166`):
```typescript
<CountUpNumber
  value={balance}
  durationMs={getCountUpDurationMs("positive")}  // 560ms
/>
```

**Fix 4 - 단위 테스트 신설** (`src/utils/__tests__/depositSoundDuration.test.ts`):
- 8 케이스: sign positive/negative duration · 상수 정합 · countUp = sound +
  grace · countUp >= sound 보장.

**정본 박제**: 카운트업이 사운드 길이 참조 · 향후 소리 duration 상수 변경 시
카운트업 자동 동기.

### D-3 · 스트림 비행음 신설

**Fix** (`src/utils/showSound.ts:playHeartFly`):
- sine sweep 800→1200Hz · 100ms · gain 0.02.
- 도착음 (Twinkle 0.05 · Drain 0.045) 대비 40% 볼륨 · 안 덮음.
- 동시 발화 상한 = 3 (배경 wheel + 좌·우 추가 wheel 기준 · 초과 skip · 청각
  과잉 방지).
- 스트림당 1회 (startDelayMs 시점 시작 · 발사 느낌).
- 방향 별 톤 = 동일 (재량 · **근거**: sign 별 도착음 이미 분리 · 비행음까지
  분리 시 청각 복잡도 과대. 통일 선택).

**연결** (`RouletteResultReveal.tsx:HeartParticles`):
```typescript
useEffect(() => {
  if (sign === "zero") return;  // zero 는 playZeroDrop 별개.
  const t = window.setTimeout(() => playHeartFly(), startDelayMs);
  return () => window.clearTimeout(t);
}, [sign, startDelayMs]);
```

### D-4 · flip 사운드 교체

**Kyu 기각**: C-2 초기 `playWedgeFlip` (triangle 400→900→400 whoosh) = "슈퍼
마리오 점프 소리".

**Fix** (`showSound.ts:playWedgeFlip`) - 카드/타일 뒤집기 "탁":
1. Noise burst 35ms · high-pass 2500Hz · 카드 표면 마찰 자음.
2. Short thud 80ms · sine 200→100Hz decay · 카드 몸통 impact.

상승 sweep 폐기 · impact 성격 (Kyu 정본).

### D-5 · A-1·A-4a 회귀 확인 (코드 레벨)

**A-1 라쳇 독립화**:
- `src/utils/soundFx.ts` · `startRatchetLoop(id, opts)` · offset random 0~90ms
  · baseFreqForId hash · volume 0.045.
- `MultiWheelExtras.tsx:198` · `startRatchetLoop(\`multi-extra-${extraIdx}\`)`.
- `RouletteModal.tsx:559` · `startRatchetLoop("multi-bg")`.
- 코드 유지 확증. 실기 항목 명시 (D-5 실기 필수).

**A-4a 합체 스케일업**:
- `RouletteModal.tsx:1517` · `cachedMergeFromScaleRef = useRef<number>(1)`.
- `RouletteModal.tsx:1520` · useEffect · `multiSpinActive` 진입 시 finalScale
  캐시.
- `RouletteModal.tsx:1942` · wheel wrapper animate scale · `[cached, 1]` 사용.
- 코드 유지 확증. 실기 항목 명시.

### D-6 (유지)

- C-1 · C-3 · A-3 · B-1 · B-2 · B-3 · B-4 회귀 X · 파일 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0902-D 정본 편입 (**D-2
  "카운트업 = 사운드 길이 종속" 박제**).
- `EPIC-STATE.md` · last_touched=2026-09-03 · last_verified=2026-09-03.

## 증적 (파일경로+줄수+커밋해시)

- 커밋 · `755f7c02`.
- `src/utils/depositSoundDuration.ts:1~46` · 신설 순수 함수.
- `src/utils/__tests__/depositSoundDuration.test.ts:1~66` · 신설 단위 테스트.
- `src/utils/showSound.ts:22~26` · depositSoundDuration import.
- `src/utils/showSound.ts:158~193` · playDepositTwinkle 4음정 재작성.
- `src/utils/showSound.ts:207~236` · playDepositDrain 4음정 재작성.
- `src/utils/showSound.ts:238~286` · playWedgeFlip 재작성 (noise + thud).
- `src/utils/showSound.ts:288~330` · playHeartFly 신설.
- `src/components/Roulette/RouletteModal.tsx:871~877` · willPlayDeposit
  (delta !== 0) fix (D-1).
- `src/components/Roulette/RouletteResultReveal.tsx:36` · playHeartFly import.
- `src/components/Roulette/RouletteResultReveal.tsx:289~296` · HeartParticles
  useEffect · playHeartFly 발화 (D-3).
- `src/components/Roulette/CarouselParticipant.tsx:20` · depositSoundDuration
  import.
- `src/components/Roulette/CarouselParticipant.tsx:158~166` · CountUpNumber
  durationMs = getCountUpDurationMs (D-2).

## 단위 테스트 신설

- **D-2 사운드 duration ↔ 카운트업 관계** (`depositSoundDuration.test.ts`):
  - 8 케이스 · 상수 정합 · positive/negative duration · countUp = sound + grace
    · countUp >= sound 보장.
- **Web Audio 자체** 는 여전히 unit test 어려움 (지난 라운드 자인). 대신 사운드
  길이·카운트업 관계 순수 함수 추출로 유닛 테스트 가능화 · Kyu 요구 정합.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline +1 warning (depositSoundDuration fast-refresh · runtime
  무해) · 신규 error 0.
- **test**: `jest` · **84 suites (+1) · 1110 pass (+8) · 5 skip · 0 fail** ·
  12.4s.

## 착지 상태

- PR #288 body 갱신 · `**round**: \`N0-0902-D\`` 첫 줄 · Kyu 실기 체크리스트
  (음수 케이스 · 4음절 완주 · 비행음 · A-1·A-4a 회귀 각 별도 케이스) · QC ·
  EPIC-STATE 갱신.
- Kyu 실기 대기.

## 이연 순증감

- **이연 신설**: 없음 (D-1·D-2·D-3·D-4·D-5 5 항 전부 concrete + [DOC] 착지).
- **이연 해소**:
  - **D-1 음수 무음 뿌리** (willTwinkle 조건 뿌리 · pendingTwinkleRef 확장).
  - **D-2 카운트업 소리 종속 정본 박제** (순수 함수 추출 · 단위 테스트).
  - **D-3 비행음** 신설.
  - **D-4 flip 사운드 재작성** (whoosh 폐기).
  - **A-1·A-4a 회귀 확인** (코드 유지 확증 · 실기 항목 명시).
